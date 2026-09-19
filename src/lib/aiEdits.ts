import type { TabDef } from "../store";
import { callLLM } from "./aiClient";

// ---------------------------------------------------------------------------
// AI edits — turning a model answer into real file changes.
//
// The model is asked for a ```json block of edits; we accept that as well as
// the SEARCH/REPLACE style many models prefer, and fall back to "the first code
// block rewrites the active file" so nothing that worked before breaks.
// ---------------------------------------------------------------------------
export type AiEdit =
  | { kind: "replace"; file: string; content: string; summary?: string }
  | { kind: "create"; file: string; content: string; summary?: string }
  | { kind: "patch"; file: string; search: string; replace: string; summary?: string };

export type EditPlanItem = {
  edit: AiEdit;
  /** null = the file is not open, applying it creates a new tab. */
  tabId: string | null;
  label: string;
  before: string;
  after: string;
  added: number;
  removed: number;
  /** Blocks applying this item (e.g. patch target not found). */
  error?: string;
  /** Applies anyway, but worth telling the user about. */
  note?: string;
};

/** How much of a file we send to the model in one go. */
export const EDIT_BUDGET = 12000;

/** Shared instruction block: how to hand edits back. */
export const EDIT_PROTOCOL = [
  "If (and only if) you are asked to change, fix, refactor, optimize or improve code, finish your answer with ONE ```json block - no other json - shaped exactly like this:",
  '{"edits":[{"file":"<exact file name>","action":"replace","content":"<complete new file text>"}]}',
  'For a small surgical change, prefer {"file":"<name>","action":"patch","search":"<exact existing text>","replace":"<new text>"} over rewriting the whole file.',
  '"content" must be the COMPLETE file text - never use "..." or placeholder comments. Use action "create" for a new file.',
].join("\n");

/**
 * Prompt for an "implement this" button: full active file + the open file list,
 * plus the output contract from EDIT_PROTOCOL.
 */
export function buildEditPrompt(task: string, opts: { file?: string; code?: string; files?: TabDef[] } = {}): string {
  const { file = "", code = "", files = [] } = opts;
  const truncated = code.length > EDIT_BUDGET;
  const others = files.filter((f) => f.label !== file).slice(0, 10);
  return [
    "You are an autonomous coding agent working inside an IDE. Implement the task by returning real file edits.",
    "",
    "TASK: " + task,
    "",
    file ? `ACTIVE FILE (${file})${truncated ? " - TRUNCATED to " + EDIT_BUDGET + " characters" : ""}:` : "",
    file ? "```\n" + code.slice(0, EDIT_BUDGET) + "\n```" : "",
    others.length ? "OTHER OPEN FILES (do not rewrite unless the task needs it): " + others.map((f) => f.label).join(", ") : "",
    "",
    "Start with a 2-4 line markdown summary of what you changed.",
    EDIT_PROTOCOL,
    truncated
      ? 'The active file was truncated, so you MUST use action "patch" with "search"/"replace" - never rewrite the whole file.'
      : "",
    "Use the exact file names given above. Only include files you actually change.",
  ].filter(Boolean).join("\n");
}

/** One call: ask the model to implement `task` and parse the edits it returns. */
export async function runAgentEdit(task: string, opts: { file?: string; code?: string; files?: TabDef[] } = {}): Promise<{ reply: string; edits: AiEdit[] }> {
  const reply = await callLLM(buildEditPrompt(task, opts));
  return { reply, edits: parseAiEdits(reply, opts.file) };
}
// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------
const FENCE = /```([^\n`]*)\r?\n([\s\S]*?)```/g;
const FILE_RE = /^[\w@][\w./\\-]*\.\w{1,8}$/;
const SEARCH_RE = /^<{5,9}\s*SEARCH\s*$/i;
const SPLIT_RE = /^={5,9}\s*$/;
const REPLACE_RE = /^>{5,9}\s*REPLACE\s*$/i;

/** Files end with exactly one newline and start without blank lines. */
function normalizeFileText(text: string): string {
  const t = String(text || "").replace(/\r\n/g, "\n").replace(/^\n+/, "").replace(/[ \t]+$/gm, "");
  return t ? t.replace(/\n+$/, "\n") : "";
}

/** "ts App.tsx" / "edit:src/App.tsx" / "file=App.tsx" -> "src/App.tsx" */
function fileFromInfo(info: string): string | null {
  for (const raw of String(info || "").split(/[\s,:=]+/)) {
    const tok = raw.trim().replace(/^(\.\/|\/)/, "");
    if (!tok) continue;
    if (FILE_RE.test(tok)) return tok.replace(/\\/g, "/");
  }
  return null;
}

function tryJson(text: string): any {
  const body = String(text || "").trim().replace(/^```\w*\n?/, "").replace(/```$/, "").trim();
  try { return JSON.parse(body); } catch { /* keep trying */ }
  try { return JSON.parse(body.replace(/,\s*([}\]])/g, "$1")); } catch { /* give up */ }
  return null;
}

/** First balanced {...} or [...] object anywhere in the text. */
function findJsonObject(text: string): any {
  const src = String(text || "");
  for (const open of ["{", "["]) {
    const close = open === "{" ? "}" : "]";
    const start = src.indexOf(open);
    if (start < 0) continue;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < src.length; i++) {
      const ch = src[i];
      if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') { inStr = true; continue; }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) { const j = tryJson(src.slice(start, i + 1)); if (j) return j; break; }
      }
    }
  }
  return null;
}

function toEdit(raw: any, fallbackFile?: string): AiEdit | null {
  if (!raw || typeof raw !== "object") return null;
  const file = String(raw.file || raw.path || raw.filename || raw.fname || raw.name || "").trim().replace(/\\/g, "/").replace(/^(\.\/|\/)/, "") || fallbackFile || "";
  if (!file || !FILE_RE.test(file.split("/").pop() || "")) return null;
  const action = String(raw.action || raw.op || raw.type || raw.kind || "").toLowerCase();
  const summary = typeof raw.summary === "string" ? raw.summary : typeof raw.description === "string" ? raw.description : undefined;
  const content = [raw.content, raw.new_content, raw.updated, raw.newFileContent, raw.text].find((v) => typeof v === "string") as string | undefined;
  const search = [raw.search, raw.find, raw.old, raw.old_string, raw.before].find((v) => typeof v === "string") as string | undefined;
  const replace = [raw.replace, raw.replacement, raw.new, raw.new_string, raw.after].find((v) => typeof v === "string") as string | undefined;
  if (/creat|new/.test(action)) return content === undefined ? null : { kind: "create", file, content: normalizeFileText(content), summary };
  if (/patch|search|replace|edit|update|modif/.test(action) && search !== undefined && replace !== undefined) return { kind: "patch", file, search, replace, summary };
  if (action === "delete" || action === "remove") return null; // not supported (yet) - do not guess
  if (content !== undefined && !(search !== undefined && replace !== undefined)) return { kind: "replace", file, content: normalizeFileText(content), summary };
  if (search !== undefined && replace !== undefined) return { kind: "patch", file, search, replace, summary };
  return null;
}

function collect(json: any, fallbackFile?: string): AiEdit[] {
  let bucket: any = json?.edits ?? json?.changes ?? json?.files ?? json?.patches ?? null;
  if (!bucket && Array.isArray(json)) bucket = json;
  if (!bucket && json && typeof json === "object" && (json.file || json.path)) bucket = [json];
  if (!bucket) return [];
  const arr = Array.isArray(bucket) ? bucket : [bucket];
  return arr.map((r) => toEdit(r, fallbackFile)).filter(Boolean) as AiEdit[];
}

/** SEARCH / ======= / REPLACE hunks (optionally preceded by a bare file name). */
function parsePatchBlock(body: string): { file?: string; search: string; replace: string }[] {
  const lines = String(body || "").split(/\r?\n/);
  const out: { file?: string; search: string; replace: string }[] = [];
  let file: string | undefined;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (FILE_RE.test(line)) { file = line.replace(/\\/g, "/").replace(/^(\.\/|\/)/, ""); i++; continue; }
    if (!SEARCH_RE.test(line)) { i++; continue; }
    const search: string[] = [];
    const replace: string[] = [];
    i++;
    while (i < lines.length && !SPLIT_RE.test(lines[i].trim())) { search.push(lines[i]); i++; }
    i++;
    while (i < lines.length && !REPLACE_RE.test(lines[i].trim())) { replace.push(lines[i]); i++; }
    i++;
    const clean = (arr: string[]) => arr.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
    out.push({ file, search: clean(search), replace: clean(replace) });
  }
  return out;
}

function dedupe(edits: AiEdit[]): AiEdit[] {
  const seen = new Set<string>();
  return edits.filter((e) => {
    const key = e.kind + "|" + e.file.toLowerCase() + "|" + (e.kind === "patch" ? e.search : e.content.slice(0, 80));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
/**
 * Pull file edits out of a model answer. Handles a ```json edits block, a
 * fenced (or bare) SEARCH/REPLACE patch, fenced code tagged with a file name,
 * and finally a plain code block that rewrites `fallbackFile`.
 */
export function parseAiEdits(reply: string, fallbackFile?: string): AiEdit[] {
  const text = String(reply || "");
  const blocks = Array.from(text.matchAll(FENCE)).map((m) => ({ info: (m[1] || "").trim(), body: m[2] || "" }));
  const found: AiEdit[] = [];
  const plain: string[] = [];

  for (const b of blocks) {
    const info = b.info.trim();
    const looksJson = /^json|^jsonc$/i.test(info) || /^[[{]/.test(b.body.trim());
    if (looksJson) {
      const json = tryJson(b.body);
      const got = json ? collect(json, fileFromInfo(info) || fallbackFile) : [];
      if (got.length) { found.push(...got); continue; }
    }
    const file = fileFromInfo(info);
    const hunks = parsePatchBlock(b.body);
    if (hunks.length) {
      for (const h of hunks) {
        const target = h.file || file || fallbackFile || "";
        if (target) found.push({ kind: "patch", file: target, search: h.search, replace: h.replace });
      }
      continue;
    }
    if (file) { found.push({ kind: "replace", file, content: normalizeFileText(b.body) }); continue; }
    plain.push(b.body);
  }

  if (!found.length) {
    const json = findJsonObject(text);            // models often forget the fence
    if (json) found.push(...collect(json, fallbackFile));
  }
  if (!found.length && /^<{5,9}\s*SEARCH\s*$/im.test(text)) {
    for (const h of parsePatchBlock(text)) {
      const target = h.file || fallbackFile || "";
      if (target) found.push({ kind: "patch", file: target, search: h.search, replace: h.replace });
    }
  }
  if (found.length) return dedupe(found);
  if (plain.length && fallbackFile) return [{ kind: "replace", file: fallbackFile, content: normalizeFileText(plain[0]) }];
  return [];
}

/** Human-readable reason when nothing could be parsed (shown in a toast). */
export function describeParseFailure(reply: string): string {
  const t = String(reply || "");
  if (/```diff|^---\s+\S|^\+\+\+\s+\S/m.test(t)) return "The model replied with a unified diff, which is not applied automatically yet - ask again (the JSON edit format is required).";
  if (!t.includes("```")) return "The model answered with plain text and no code block.";
  return "No file edits found in the answer.";
}

// ---------------------------------------------------------------------------
// Matching + applying
// ---------------------------------------------------------------------------
const norm = (s: string) => String(s || "").replace(/\\/g, "/").replace(/^(\.\/|\/)/, "").toLowerCase();

/** Finds the open tab an edit refers to: exact path, path suffix, then basename. */
export function matchTab(tabs: TabDef[], file: string): TabDef | null {
  const want = norm(file);
  if (!want) return null;
  const base = want.split("/").pop() || want;
  return tabs.find((t) => norm(t.label) === want || norm(t.path || "") === want)
    || tabs.find((t) => norm(t.label).endsWith("/" + want) || norm(t.path || "").endsWith("/" + want) || want.endsWith("/" + norm(t.label)))
    || tabs.find((t) => (norm(t.label).split("/").pop() || "") === base)
    || null;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let n = 0, i = haystack.indexOf(needle);
  while (i !== -1) { n++; i = haystack.indexOf(needle, i + needle.length); }
  return n;
}

/** Applies one search/replace hunk; returns null when the target is missing. */
export function applyPatch(before: string, search: string, replace: string): { text: string; occurrences: number } | null {
  const src = before.replace(/\r\n/g, "\n");
  const candidates = [search, search.replace(/^[ \t]+/, ""), search.replace(/[ \t]+$/gm, "")].filter((s, i, a) => !!s && a.indexOf(s) === i);
  for (const cand of candidates) {
    const needle = cand.replace(/\r\n/g, "\n");
    const n = countOccurrences(src, needle);
    if (n === 0) continue;
    const at = src.indexOf(needle);
    return { text: normalizeFileText(src.slice(0, at) + replace + src.slice(at + needle.length)), occurrences: n };
  }
  return null;
}

/** Approximate added/removed line counts (exact for normal-sized files). */
export function diffStats(before: string, after: string): { added: number; removed: number } {
  const a = before ? before.replace(/\r\n/g, "\n").split("\n") : [];
  const b = after ? after.replace(/\r\n/g, "\n").split("\n") : [];
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const am = a.slice(p, a.length - s);
  const bm = b.slice(p, b.length - s);
  if (!am.length) return { added: bm.length, removed: 0 };
  if (!bm.length) return { added: 0, removed: am.length };
  if (am.length * bm.length > 4_000_000) return { added: bm.length, removed: am.length };
  const w = bm.length + 1;
  const dp = new Uint32Array((am.length + 1) * w);
  for (let i = am.length - 1; i >= 0; i--) {
    for (let j = bm.length - 1; j >= 0; j--) {
      dp[i * w + j] = am[i] === bm[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const lcs = dp[0];
  return { added: bm.length - lcs, removed: am.length - lcs };
}

/** Turns edits into reviewable items against the currently open tabs. */
export function planEdits(edits: AiEdit[], tabs: TabDef[]): EditPlanItem[] {
  return edits.map((edit) => {
    if (edit.kind === "create") {
      const after = normalizeFileText(edit.content);
      return { edit, tabId: null, label: edit.file, before: "", after, ...diffStats("", after), note: "New file" };
    }
    const tab = matchTab(tabs, edit.file);
    if (!tab) {
      if (edit.kind === "patch") {
        return { edit, tabId: null, label: edit.file, before: "", after: "", added: 0, removed: 0, error: `"${edit.file}" is not open, so a search/replace change cannot be applied. Open it, or ask for action "create".` };
      }
      const after = normalizeFileText(edit.content);
      return { edit, tabId: null, label: edit.file, before: "", after, ...diffStats("", after), note: "New file" };
    }
    if (edit.kind === "patch") {
      const res = applyPatch(tab.content, edit.search, edit.replace);
      if (!res) return { edit, tabId: tab.id, label: tab.label, before: tab.content, after: tab.content, added: 0, removed: 0, error: "The text to search for was not found in " + tab.label + "." };
      return { edit, tabId: tab.id, label: tab.label, before: tab.content, after: res.text, ...diffStats(tab.content, res.text), note: res.occurrences > 1 ? res.occurrences + " matches found - the first one was replaced." : undefined };
    }
    const after = normalizeFileText(edit.content);
    return { edit, tabId: tab.id, label: tab.label, before: tab.content, after, ...diffStats(tab.content, after) };
  });
}

export function summarizePlan(items: EditPlanItem[]): { files: number; added: number; removed: number; created: number; label: string } {
  const files = items.length;
  const added = items.reduce((n, i) => n + i.added, 0);
  const removed = items.reduce((n, i) => n + i.removed, 0);
  const created = items.filter((i) => !i.tabId).length;
  return { files, added, removed, created, label: files + " file(s) · +" + added + " −" + removed + (created ? " · " + created + " new" : "") };
}