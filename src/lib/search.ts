import { readWorkspaceTree, currentRoot, isDesktop } from "./workspace";

// ---------------------------------------------------------------------------
// Workspace-wide text search (Ctrl+Shift+F).
//
// Runs entirely on the files the Rust backend already handed us via
// `readWorkspaceTree`, so it needs no extra permissions and works on the
// already-sanitized file set (node_modules / .git / binaries are skipped there).
// ---------------------------------------------------------------------------

export type FileGroup = { path: string; matches: Hit[] };
export type Hit = { line: number; col: number; text: string; len: number };
export type SearchResult = { groups: FileGroup[]; files: number; matches: number; truncated: boolean };

const MAX_HITS = 500;
const MAX_PER_FILE = 50;

export const EMPTY_RESULT: SearchResult = { groups: [], files: 0, matches: 0, truncated: false };

export type SearchOptions = {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  include?: string; // glob-ish substring filter on the path, e.g. "src/"
  exclude?: string;
};

/** Escape a literal string so it can be embedded as a RegExp body. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build the matcher, or return null when the query is empty / an invalid regex. */
export function buildMatcher(query: string, opts: SearchOptions = {}): RegExp | null {
  if (!query) return null;
  const body = opts.regex ? query : escapeRe(query);
  const wrapped = opts.wholeWord ? `\\b(?:${body})\\b` : body;
  try {
    return new RegExp(wrapped, opts.caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

/** Pure matcher over an in-memory buffer — used for the open tabs too. */
export function searchText(text: string, query: string, opts: SearchOptions = {}): Hit[] {
  const re = buildMatcher(query, opts);
  if (!re || !text) return [];
  const out: Hit[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      out.push({ line: i + 1, col: m.index + 1, text: line, len: m[0].length || 1 });
      if (m[0].length === 0) re.lastIndex++; // guard against zero-width loops
      if (out.length >= MAX_PER_FILE) break;
    }
    if (out.length >= MAX_PER_FILE) break;
  }
  return out;
}

/**
 * Search every file in the open workspace folder.
 * Returns per-file groups so the results tree can collapse by file.
 */
export async function searchWorkspace(query: string, opts: SearchOptions = {}): Promise<SearchResult> {
  if (!query || !isDesktop() || !currentRoot()) return EMPTY_RESULT;
  const files = await readWorkspaceTree();
  const inc = (opts.include || "").trim().toLowerCase();
  const exc = (opts.exclude || "").trim().toLowerCase();
  const groups: FileGroup[] = [];
  let total = 0;
  let truncated = false;

  for (const f of files) {
    const path = (f.path || f.label || "").replace(/\\/g, "/");
    const low = path.toLowerCase();
    if (inc && !low.includes(inc)) continue;
    if (exc && low.includes(exc)) continue;
    const hits = searchText(f.content ?? "", query, opts);
    if (!hits.length) continue;
    groups.push({ path, matches: hits });
    total += hits.length;
    if (total >= MAX_HITS) { truncated = true; break; }
  }
  groups.sort((a, b) => b.matches.length - a.matches.length);
  return { groups, files: groups.length, matches: total, truncated };
}

/** Highlight ranges for a line, so the UI can render <mark> segments. */
export function highlight(line: string, hit: Hit, query: string, opts: SearchOptions = {}): { pre: string; mid: string; post: string } {
  const re = buildMatcher(query, opts);
  if (!re) return { pre: line, mid: "", post: "" };
  // Prefer the exact match at the recorded column; fall back to a fresh search.
  const start = Math.max(0, hit.col - 1);
  const width = Math.max(1, hit.len);
  if (line.substr(start, width).length === width) {
    return { pre: line.slice(0, start), mid: line.substr(start, width), post: line.slice(start + width) };
  }
  re.lastIndex = 0;
  const m = re.exec(line);
  if (!m) return { pre: line, mid: "", post: "" };
  return { pre: line.slice(0, m.index), mid: m[0], post: line.slice(m.index + m[0].length) };
}
