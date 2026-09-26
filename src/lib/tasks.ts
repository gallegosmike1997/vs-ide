import { isDesktop, currentRoots, baseName, readWorkspaceFile } from "./workspace";

// ---------------------------------------------------------------------------
// VS Code-compatible tasks (tasks.json v2.0.0).
//
// Reads <each-open-folder>/.vscode/tasks.json (or <folder>/tasks.json) and
// hands typed task defs to the TasksPanel, which runs them through the Rust
// `run_command` backend with cwd = the folder the task came from.
// Degrades to an empty task list in the browser.
// ---------------------------------------------------------------------------

export type TaskDef = {
  label: string;
  command?: string;
  args?: string[];
  /** "shell" | "process" — both end up shell-executed here. */
  type?: string;
  /** Predefined matcher id ($tsc, $rustc…) or a custom regex; matched output becomes clickable. */
  problemMatcher?: string;
  /** Windows override, VS Code-style. */
  windows?: string;
  linux?: string;
  osx?: string;
  group?: string;
  isDefault?: boolean;
  /** Milliseconds before we kill the process (default 60s). */
  timeoutMs?: number;
  /** Absolute root folder this task was defined in (multi-root workspaces). */
  root: string;
  /** Which file it came from, e.g. "Super-AI-Stack/.vscode/tasks.json". */
  source: string;
};

const MATCHER_IDS: Record<string, RegExp> = {
  $tsc: /(.+\.[tp]sx?)[:(](\d+)/g,
  $rustc: /--> ([^\s:]+):(\d+):(\d+)/g,
  $gcc: /([\w./\\-]+\.[ch](?:pp)?):(\d+):(\d+)/g,
  $msCompile: /([\w.\\/-]+)\((\d+)[,:](\d+)\)/g,
  $eslintCompact: /([\w./\\-]+\.[tj]sx?): line (\d+)/g,
};

/** Translate a matcher id or custom regex into the generic file:line pattern. */
export function matcherRegex(matcher: string | undefined): RegExp | null {
  if (!matcher) return /([\w./\\-]+?\.\w+)[:(](\d+)/g;
  if (MATCHER_IDS[matcher]) return MATCHER_IDS[matcher];
  try { return new RegExp(matcher, "g"); } catch { return null; }
}

const CANDIDATE_PATHS = [".vscode/tasks.json", "tasks.json"];
const joinRoot = (root: string, rel: string) => root.replace(/[\\/]+$/, "") + "/" + rel;

async function readFirstAvailable(root: string): Promise<{ text: string; path: string } | null> {
  for (const rel of CANDIDATE_PATHS) {
    try {
      const text = await readWorkspaceFile(joinRoot(root, rel));
      if (text && text.trim()) return { text, path: rel };
    } catch { /* not found — try next */ }
  }
  return null;
}

/** Load + validate tasks.json from EVERY open workspace folder (multi-root). */
export async function loadTasks(): Promise<{ tasks: TaskDef[]; source: string }> {
  if (!isDesktop() || !currentRoots().length) return { tasks: [], source: "" };
  const tasks: TaskDef[] = [];
  const sources: string[] = [];
  for (const root of currentRoots()) {
    const found = await readFirstAvailable(root);
    if (!found) continue;
    const source = baseName(root) + "/" + found.path;
    sources.push(source);
    let list: any[];
    try {
      const parsed = JSON.parse(found.text.replace(/^\uFEFF/, ""));
      list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.tasks) ? parsed.tasks : []);
    } catch (e) {
      throw new Error(source + " is not valid JSON: " + String(e));
    }
    for (const t of list) {
      if (!t || typeof t.label !== "string" || !t.label) continue;
      tasks.push({
        label: String(t.label),
        command: typeof t.command === "string" ? t.command : undefined,
        args: Array.isArray(t.args) ? t.args.map(String) : undefined,
        type: typeof t.type === "string" ? t.type : "shell",
        problemMatcher: typeof t.problemMatcher === "string" ? t.problemMatcher : undefined,
        windows: typeof t.windows === "string" ? t.windows : typeof t.windows?.command === "string" ? t.windows.command : undefined,
        linux: typeof t.linux === "string" ? t.linux : undefined,
        osx: typeof t.osx === "string" ? t.osx : undefined,
        group: typeof t.group === "string" ? t.group : undefined,
        isDefault: !!t.isDefault,
        timeoutMs: typeof t.timeoutMs === "number" ? t.timeoutMs : undefined,
        root,
        source,
      });
    }
  }
  return { tasks, source: sources.join(", ") };
}