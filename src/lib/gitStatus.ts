import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./workspace";

// ---------------------------------------------------------------------------
// Git integration (desktop only).
//
// The Rust backend shells out to `git -C <workspace>` and hands back plain
// data; every call here degrades to an empty result when git is missing, the
// folder is not a repo, or we are running in a plain browser, so the UI never
// has to guard with try/catch.
// ---------------------------------------------------------------------------

export type GitFile = { path: string; status: string; staged: boolean };
export type GitStatus = { repo: boolean; branch: string; files: GitFile[] };
/** Gutter markers: "+" added, "-" deleted, "~" modified. */
export type LineChange = { line: number; kind: "+" | "-" | "~" };

export const EMPTY_STATUS: GitStatus = { repo: false, branch: "", files: [] };

export async function gitStatus(cwd: string | null): Promise<GitStatus> {
  if (!cwd || !isDesktop()) return EMPTY_STATUS;
  try {
    const raw = await invoke<GitStatus>("git_status", { cwd });
    return { repo: !!raw?.repo, branch: raw?.branch || "", files: raw?.files ?? [] };
  } catch {
    return EMPTY_STATUS;
  }
}

export async function gitDiff(cwd: string | null, path: string, staged = false): Promise<string> {
  if (!cwd || !isDesktop()) return "";
  try {
    return await invoke<string>("git_diff", { cwd, path, staged });
  } catch {
    return "";
  }
}

export async function gitGutter(cwd: string | null, path: string): Promise<LineChange[]> {
  if (!cwd || !isDesktop() || !path) return [];
  try {
    const raw = await invoke<LineChange[]>("git_gutter", { cwd, path });
    return (raw ?? []).filter((c) => c && typeof c.line === "number" && c.line > 0);
  } catch {
    return [];
  }
}

export type StatusKind = "add" | "mod" | "del" | "untracked" | "conflict" | "rename" | "clean";

/**
 * Decode a two-letter `git status --porcelain` code into something displayable.
 * Codes: " M" modified, "??" untracked, "A " added, " D" deleted, "UU" conflict,
 * "R " renamed. X = index/staged column, Y = working-tree column.
 */
export function decodeStatus(code: string): { kind: StatusKind; short: string; label: string } {
  const x = code[0] ?? " ";
  const y = code[1] ?? " ";
  const both = code.trim();
  if (both === "??") return { kind: "untracked", short: "U", label: "Untracked" };
  if (x === "U" || y === "U" || both === "AA" || both === "DD") return { kind: "conflict", short: "!", label: "Merge conflict" };
  if (x === "R" || y === "R") return { kind: "rename", short: "R", label: "Renamed" };
  if (x === "A" || y === "A") return { kind: "add", short: "A", label: "Added" };
  if (x === "D" || y === "D") return { kind: "del", short: "D", label: "Deleted" };
  if (x === "M" || y === "M") return { kind: "mod", short: "M", label: "Modified" };
  if (both) return { kind: "mod", short: both[0], label: "Changed" };
  return { kind: "clean", short: "", label: "Clean" };
}

/** path -> porcelain code, for explorer dirty badges. */
export function badgeMap(status: GitStatus): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of status.files) out[f.path.replace(/\\/g, "/")] = f.status;
  return out;
}

// ---------------------------------------------------------------------------
// Unified-diff parsing for the diff viewer.
// ---------------------------------------------------------------------------
export type DiffLine = { kind: "add" | "del" | "ctx" | "hunk"; text: string; oldNo?: number; newNo?: number };
export type DiffSection = { file: string; lines: DiffLine[]; added: number; removed: number };

/** Split a `git diff` blob into per-file sections with line numbers. */
export function parseDiff(text: string): DiffSection[] {
  const out: DiffSection[] = [];
  let cur: DiffSection | null = null;
  let oldNo = 0;
  let newNo = 0;
  const push = () => { if (cur) out.push(cur); };
  for (const line of String(text || "").replace(/\r/g, "").split("\n")) {
    if (line.startsWith("diff --git")) {
      push();
      // "diff --git a/x b/x" -> prefer the b/ path.
      const parts = line.split(" ");
      const b = parts.find((p) => p.startsWith("b/"));
      cur = { file: (b ?? parts[parts.length - 1] ?? "").replace(/^b\//, ""), lines: [], added: 0, removed: 0 };
      continue;
    }
    if (!cur) continue; // ignore headers before the first file
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("index ") || line.startsWith("new file") || line.startsWith("deleted file") || line.startsWith("similarity")) {
      continue;
    }
    if (line.startsWith("@@")) {
      // @@ -a,b +c,d @@
      const body = line.split("@@")[1]?.trim() ?? "";
      const [oS, nS] = body.split(/\s+/);
      oldNo = Number(oS?.slice(1).split(",")[0]) || 0;
      newNo = Number(nS?.slice(1).split(",")[0]) || 0;
      cur.lines.push({ kind: "hunk", text: body });
      continue;
    }
    if (line.startsWith("+")) {
      cur.lines.push({ kind: "add", text: line.slice(1), newNo });
      newNo++;
      cur.added++;
    } else if (line.startsWith("-")) {
      cur.lines.push({ kind: "del", text: line.slice(1), oldNo });
      oldNo++;
      cur.removed++;
    } else {
      cur.lines.push({ kind: "ctx", text: line.startsWith(" ") ? line.slice(1) : line, oldNo, newNo });
      oldNo++;
      newNo++;
    }
  }
  push();
  return out;
}
