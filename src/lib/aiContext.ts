import type { TabDef } from "../store";
import { absPathFor, isDesktop, readWorkspaceFile } from "./workspace";

// ---------------------------------------------------------------------------
// Workspace context for the AI (VS Code-style folder awareness).
//
// The chat agent used to see ONLY the active editor buffer. Everything the
// folder contains already lives in `tabs` (readWorkspaceTree loads every open
// workspace file), so this module turns that into prompt context:
//
//   1. a compact file tree of the whole workspace (names only — cheap), and
//   2. budgeted content: the active file plus a few peer files, and
//   3. a tiny "read" protocol: the model may end its reply with a fenced
//      ```read block listing any other paths it needs. The IDE loads those
//      files (open buffer first, then disk inside the granted workspace
//      scope) and asks the model ONE more time with the contents attached.
//
// That second pass is what makes the agent actually see the folder without
// ever stuffing hundreds of files into a single prompt — the same retrieve-
// on-demand shape VS Code's chat agent uses.
// ---------------------------------------------------------------------------

/** Hard caps so one prompt can never blow a small model's context window. */
export const TREE_BUDGET = 12000;   // chars of file-tree listing
export const TREE_MAX_LINES = 600;  // files listed before truncating
export const ACTIVE_BUDGET = 8000;  // chars of the active editor buffer
export const PEER_TOTAL_BUDGET = 6000; // chars across ALL peer snippets
export const PEER_ONE_BUDGET = 1500;   // chars per peer snippet
export const PEER_MAX_FILES = 5;
export const READ_ONE_BUDGET = 12000; // chars per file pulled by a read
export const READ_MAX_FILES = 8;      // files pulled per read round

/** Instructions for the on-demand file read protocol. */
export const READ_PROTOCOL = [
  "WORKSPACE VISIBILITY: the file tree above lists every file in the opened folder. If you need the contents of a file that is not included, end your reply with ONE fenced block tagged ```read listing its workspace-relative paths (one per line), for example:",
  "```read",
  "src/lib/workspace.ts",
  "package.json",
  "```",
  "The IDE loads those files and asks you again with their contents attached — then you give your final answer. Request at most 8 files per round, only paths that appear in the tree. If you are also proposing edits, put the ```json edits block AFTER the ```read block. Never invent the contents of files you have not been shown.",
].join("\n");

const norm = (s: string) => (s || "").replace(/\\/g, "/").toLowerCase();

/** Compact listing of every known workspace path (sorted, budgeted). */
export function buildFileTree(labels: string[]): string {
  const sorted = [...new Set(labels.filter(Boolean))].sort((a, b) => norm(a).localeCompare(norm(b)));
  const lines: string[] = [];
  let size = 0;
  for (let i = 0; i < sorted.length; i++) {
    const line = "  " + sorted[i];
    if (lines.length >= TREE_MAX_LINES || size + line.length > TREE_BUDGET) {
      lines.push("  … " + (sorted.length - i) + " more file(s) not listed");
      break;
    }
    lines.push(line);
    size += line.length + 1;
  }
  return lines.join("\n");
}

const dirOf = (label: string) => (label.includes("/") ? label.slice(0, label.lastIndexOf("/")) : "");

/** Peer previews: the active file's folder first, then everything else. */
function pickPeers(tabs: TabDef[], active: TabDef | undefined): TabDef[] {
  const actDir = active ? dirOf(active.label) : "";
  const rest = tabs.filter((t) => t.id !== active?.id);
  const sameDir = rest.filter((t) => dirOf(t.label) === actDir);
  const sameIds = new Set(sameDir.map((t) => t.id));
  return [...sameDir, ...rest.filter((t) => !sameIds.has(t.id))].slice(0, PEER_MAX_FILES);
}

/**
 * Full prompt context: workspace tree + active file + budgeted peer snippets
 * + the read protocol. Used by the chat sidebar on every send.
 */
export function buildChatContext(opts: { tabs: TabDef[]; file?: string; code?: string }): string {
  const { tabs = [], file = "", code = "" } = opts;
  const fileName = file.split(/[\\/]/).pop() || file;
  const active = tabs.find((t) => t.label === file) || tabs.find((t) => t.label === fileName);
  const tree = tabs.length
    ? buildFileTree(tabs.map((t) => t.label))
    : "(no workspace folder open — only the active file below)";

  // Peer snippets stay inside a shared budget so the tree + active file always fit.
  let left = PEER_TOTAL_BUDGET;
  const peerBlocks: string[] = [];
  for (const p of pickPeers(tabs, active)) {
    if (left <= 0) break;
    const snippet = p.content.slice(0, Math.min(PEER_ONE_BUDGET, left));
    if (!snippet.trim()) continue;
    left -= snippet.length;
    peerBlocks.push(`FILE: ${p.label}\n\`\`\`\n${snippet}\n\`\`\``);
  }

  return [
    "WORKSPACE — every file in the opened folder:",
    "```",
    tree,
    "```",
    "",
    `ACTIVE FILE (${file || "untitled"}):`,
    "```",
    code.slice(0, ACTIVE_BUDGET),
    "```",
    peerBlocks.length ? "OTHER WORKSPACE FILES (truncated previews):" : "",
    peerBlocks.join("\n\n"),
    "",
    READ_PROTOCOL,
  ].filter((s) => s !== "").join("\n");
}


/** Pull the ```read blocks out of a model reply → requested paths. */
export function parseReadRequests(reply: string): string[] {
  const out: string[] = [];
  const re = /```read[ \t]*\r?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply))) {
    for (const raw of m[1].split(/\r?\n/)) {
      const p = raw
        .trim()
        .replace(/^["'`*•\-\s]+/, "")
        .replace(/^(path|file)\s*:\s*/i, "")
        .replace(/[",;]+$/, "")
        .trim();
      if (!p || p.startsWith("(")) continue;
      if (!out.some((x) => norm(x) === norm(p))) out.push(p);
    }
  }
  return out.slice(0, READ_MAX_FILES);
}

/** Remove protocol plumbing so the user never sees raw ```read blocks. */
export function stripReadBlocks(reply: string): string {
  return reply.replace(/```read[ \t]*\r?\n[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export type ReadResult = {
  /** "FILE: <path>\n```…```" blocks to append to the next prompt. */
  block: string;
  loaded: string[];
  missing: string[];
};

/**
 * Resolve requested paths to contents: open buffers first (so unsaved edits
 * are visible), then disk inside the granted workspace scope (desktop only).
 */
export async function loadRequestedFiles(tabs: TabDef[], paths: string[]): Promise<ReadResult> {
  const blocks: string[] = [];
  const loaded: string[] = [];
  const missing: string[] = [];
  for (const p of paths.slice(0, READ_MAX_FILES)) {
    const np = p.replace(/\\/g, "/");
    const npLower = norm(np);
    const base = npLower.split("/").pop() || npLower;
    let content: string | null = null;
    let seenAs = np;

    let hit = tabs.find((t) => norm(t.label) === npLower || norm(t.path || "") === npLower);
    if (!hit) hit = tabs.find((t) => norm(t.label).endsWith("/" + npLower) || npLower.endsWith("/" + norm(t.label)));
    if (!hit) hit = tabs.find((t) => (norm(t.label).split("/").pop() || "") === base);
    if (hit) { content = hit.content; seenAs = hit.label; }
    else if (isDesktop()) {
      try { content = await readWorkspaceFile(absPathFor(np)); seenAs = np; }
      catch { content = null; } // outside every root, unreadable, or not a text file
    }

    if (content == null) { missing.push(np); continue; }
    loaded.push(seenAs);
    const alias = norm(seenAs) !== npLower ? ` (requested as ${np})` : "";
    blocks.push(`FILE: ${seenAs}${alias}\n\`\`\`\n${content.slice(0, READ_ONE_BUDGET)}\n\`\`\``);
  }
  return { block: blocks.join("\n\n"), loaded, missing };
}
