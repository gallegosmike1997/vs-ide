// ---------------------------------------------------------------------------
// Source control, typed.
//
// A thin, honest wrapper over the Rust git commands: one `invoke` per git
// operation, no state, no caching. Every function returns a plain result or
// throws with git's own message, so the panel can show what actually happened
// instead of a generic "failed".
// ---------------------------------------------------------------------------
import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./workspace";

export type GitChange = {
  path: string;
  status: string;      // porcelain XY, e.g. " M", "??", "A "
  staged: boolean;
  untracked: boolean;
  conflicted: boolean;
  orig_path: string | null;
};

export type RepoStatus = {
  repo: boolean;
  branch: string;
  upstream: string;
  ahead: number;
  behind: number;
  remote: string;
  has_commits: boolean;
  detached: boolean;
  files: GitChange[];
};

export type GitCommitInfo = { short: string; author: string; date: string; subject: string };

const empty = (): RepoStatus => ({
  repo: false, branch: "", upstream: "", ahead: 0, behind: 0,
  remote: "", has_commits: false, detached: false, files: [],
});

function errText(e: unknown): string {
  return String((e as { message?: string })?.message || e || "git failed").trim();
}

/** Friendly "not a repo" / "no git" detection for the empty states. */
export function gitErrorKind(msg: string): "no-git" | "no-repo" | "other" {
  const m = msg.toLowerCase();
  if (m.includes("git unavailable") || m.includes("not recognized") || m.includes("no such file")) return "no-git";
  if (m.includes("not a git repository") || m.includes("fatal: not a")) return "no-repo";
  return "other";
}

export async function status(cwd: string): Promise<RepoStatus> {
  if (!isDesktop()) return empty();
  try {
    return await invoke<RepoStatus>("git_status", { cwd });
  } catch (e) {
    throw new Error(errText(e));
  }
}

export const log = (cwd: string, limit = 20) =>
  invoke<GitCommitInfo[]>("git_log", { cwd, limit });

/** `stage = true` -> git add, `false` -> unstage. */
export const stage = (cwd: string, paths: string[], stageIt = true) =>
  invoke<string>("git_stage", { cwd, paths, staged: stageIt });

/** Throw away changes; `staged` also drops it from the index. */
export const discard = (cwd: string, path: string, staged = false) =>
  invoke<string>("git_discard", { cwd, path, staged });

/** Commit the staged set (or everything, when `all`). */
export const commit = (cwd: string, message: string, all = true) =>
  invoke<string>("git_commit", { cwd, message, all });

/** fetch + fast-forward pull + push, in that order. */
export const sync = (cwd: string) => invoke<string>("git_sync", { cwd });
export const fetchOnly = (cwd: string) => invoke<string>("git_fetch", { cwd });
export const newBranch = (cwd: string, name: string) => invoke<string>("git_branch_new", { cwd, name });
export const initRepo = (cwd: string) => invoke<string>("git_init", { cwd });
export const addRemote = (cwd: string, name: string, url: string) =>
  invoke<string>("git_remote_add", { cwd, name, url });
export const diff = (cwd: string, path: string, staged = false) =>
  invoke<string>("git_diff", { cwd, path, staged });

/** How the changes split across the panel's three sections. */
export type ChangeGroups = { staged: GitChange[]; conflicts: GitChange[]; changes: GitChange[] };

/**
 * A conflicted file always wins (it can be both staged and dirty), everything
 * else splits on the index flag. This is the panel's core rule, so it lives
 * here where a test can reach it instead of inside the component.
 */
export function groupChanges(files: GitChange[]): ChangeGroups {
  return {
    conflicts: files.filter((f) => f.conflicted),
    staged: files.filter((f) => f.staged && !f.conflicted),
    changes: files.filter((f) => !f.staged && !f.conflicted),
  };
}

/** One-letter badge + colour for a porcelain code. */
export function statusColor(code: string): string {
  const c = code.trim();
  if (c === "??" || c === "!!") return "var(--text-2)";
  if (c.includes("U") || c === "AA" || c === "DD") return "#ff5d5d";
  if (c === "A" || c.includes("A")) return "#34d399";
  if (c === "D" || c.includes("D")) return "#ff8fa6";
  if (c === "M" || c.includes("M")) return "#f0b429";
  if (c === "R" || c.includes("R")) return "#8fb4ff";
  return "var(--text-2)";
}
