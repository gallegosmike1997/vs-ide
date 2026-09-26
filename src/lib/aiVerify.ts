import { loader } from "@monaco-editor/react";
import { callLLM } from "./aiClient";
import { langFromName } from "../store";
import type { EditPlanItem } from "./aiEdits";

// ---------------------------------------------------------------------------
// Pre-save verification: deterministic syntax checks + an AI intent review,
// both of which must finish BEFORE applyItems() is allowed to write anything.
// ---------------------------------------------------------------------------

export type CheckStatus = "running" | "pass" | "fail" | "warn" | "skipped";
export type IntentVerdict = "pass" | "warn" | "fail" | null;

export type SyntaxResult = { status: CheckStatus; problems: string[]; checked: number; aiOnly: number };
export type IntentResult = { status: CheckStatus; verdict: IntentVerdict; notes: string };
export type VerifyReport = {
  syntax: SyntaxResult;
  intent: IntentResult;
  verdict: "running" | "pass" | "warn" | "fail";
  at: number;
};

export function initialReport(): VerifyReport {
  return {
    syntax: { status: "running", problems: [], checked: 0, aiOnly: 0 },
    intent: { status: "running", verdict: null, notes: "" },
    verdict: "running",
    at: 0,
  };
}

/** Languages whose Monaco workers emit real syntax/semantic diagnostics. */
const WORKER_LANGS = new Set(["typescript", "javascript", "json", "css", "html"]);
const SEV_ERROR = 8; // MarkerSeverity.Error

/**
 * Deterministic check of the *proposed* file contents (never touches disk):
 *  - .json → JSON.parse (always available, offline)
 *  - ts/js/json/css/html → real language-service diagnostics via Monaco workers
 *  - everything else → counted as aiOnly (covered by the AI review only)
 */
export async function runSyntaxChecks(items: EditPlanItem[]): Promise<SyntaxResult> {
  const problems: string[] = [];
  let checked = 0;
  let aiOnly = 0;
  const monaco: any = (loader as any).monaco;

  for (const it of items) {
    if (it.error) continue;
    const after = String(it.after ?? "");
    if (/\.json$/i.test(it.label)) {
      checked++;
      try { JSON.parse(after.replace(/,(\s*[}\]])/g, "$1")); }
      catch (e: any) { problems.push(it.label + " — invalid JSON: " + String(e?.message || e).slice(0, 140)); }
      continue;
    }
    const lang = langFromName(it.label);
    if (monaco?.editor?.getMarkers && WORKER_LANGS.has(lang)) {
      let model: any = null;
      try {
        checked++;
        const uri = monaco.Uri.parse("inmemory://verify/" + Date.now().toString(36) + Math.random().toString(36).slice(2) + "/" + it.label);
        model = monaco.editor.createModel(after, lang, uri);
        let errs: any[] = [];
        // Give the language worker a moment to report; stop as soon as errors appear.
        for (let t = 0; t < 10; t++) {
          const markers = monaco.editor.getMarkers({ resource: uri }) || [];
          errs = markers.filter((m: any) => m.severity === (monaco.MarkerSeverity?.Error ?? SEV_ERROR));
          if (errs.length || t >= 4) break;
          await new Promise((r) => setTimeout(r, 150));
        }
        for (const m of errs.slice(0, 4)) {
          problems.push(it.label + ":" + (m.startLineNumber || "?") + " — " + String(m.message || "").slice(0, 160));
        }
      } catch {
        checked--;
        aiOnly++;
      } finally {
        try { model?.dispose(); } catch { /* worker gone */ }
      }
    } else {
      aiOnly++;
    }
  }

  if (problems.length) return { status: "fail", problems, checked, aiOnly };
  if (checked === 0) return { status: "skipped", problems, checked, aiOnly };
  return { status: "pass", problems, checked, aiOnly };
}

function truncate(s: string, n: number): string {
  const t = String(s || "");
  return t.length > n ? t.slice(0, n) + "\n… (truncated)" : t;
}

/** Pull the first balanced JSON object out of a model reply. */
function extractJson(text: string): any | null {
  const src = String(text || "");
  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(src.slice(start, end + 1)); } catch { return null; }
}

/**
 * AI intent review: does the proposed diff actually implement the user's
 * request — completely, correctly, and nothing unrelated? Offline or
 * unparseable → "skipped" (never blocks on its own; only FAIL does).
 */
export async function runIntentCheck(task: string, items: EditPlanItem[]): Promise<IntentResult> {
  const diff = items.slice(0, 8).map((it) =>
    "FILE: " + it.label + "\nBEFORE:\n" + truncate(it.before, 1500) + "\nAFTER:\n" + truncate(it.after, 1500),
  ).join("\n\n---\n\n");
  const prompt =
    "You are a strict pre-save verifier inside an IDE. The user requested:\n\"" +
    truncate(task || "improve the code", 600) +
    "\"\n\nProposed changes (truncated before/after):\n\n" +
    truncate(diff, 9000) +
    "\n\nVerify: (1) completeness — every part of the request is actually implemented; " +
    "(2) correctness — obvious functional bugs, broken logic, missing edge cases, regressions; " +
    "(3) relevance — nothing unrelated was changed.\n" +
    "Reply with ONLY JSON: {\"verdict\":\"pass\"|\"warn\"|\"fail\",\"notes\":\"<=700 chars of markdown — bullet the issues, or one line saying it is good\"}";
  try {
    const ans = await callLLM(prompt);
    const obj = extractJson(ans);
    const raw = obj?.verdict;
    const verdict: IntentVerdict = raw === "fail" ? "fail" : raw === "warn" ? "warn" : raw === "pass" ? "pass" : null;
    if (!verdict) {
      return { status: "warn", verdict: null, notes: "Reviewer reply was not in the expected JSON — treat as unverified." };
    }
    const notes = String(obj?.notes || "").slice(0, 1200) || (verdict === "pass" ? "Looks good — the request is covered." : "");
    return { status: verdict, verdict, notes };
  } catch (e: any) {
    return { status: "skipped", verdict: null, notes: "AI reviewer unavailable: " + String(e?.message || e).slice(0, 160) };
  }
}

/** Aggregate: fail beats running beats warn/skip beats pass. */
export function deriveVerdict(syntax: SyntaxResult, intent: IntentResult): VerifyReport["verdict"] {
  if (syntax.status === "fail" || intent.status === "fail") return "fail";
  if (syntax.status === "running" || intent.status === "running") return "running";
  if (syntax.status === "warn" || intent.status === "warn" || syntax.status === "skipped" || intent.status === "skipped") return "warn";
  return "pass";
}
