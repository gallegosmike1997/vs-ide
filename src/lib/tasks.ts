import { isDesktop, currentRoot, absPathFor, readWorkspaceFile } from "./workspace";

// ---------------------------------------------------------------------------
// VS Code-compatible tasks (tasks.json v2.0.0).
//
// Reads <workspace>/.vscode/tasks.json (or <workspace>/tasks.json) and hands
// typed task defs to the TasksPanel, which runs them through the Rust
// `run_command` backend. Degrades to an empty task list in the browser.
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

async function readFirstAvailable(): Promise<{ text: string; path: string } | null> {
  for (const rel of CANDIDATE_PATHS) {
    try {
      const text = await readWorkspaceFile(absPathFor(rel));
      if (text && text.trim()) return { text, path: rel };
    } catch { /* not found — try next */ }
  }
  return null;
}

/** Load + validate tasks.json from the open workspace. */
export async function loadTasks(): Promise<{ tasks: TaskDef[]; source: string }> {
  if (!isDesktop() || !currentRoot()) return { tasks: [], source: "" };
  const found = await readFirstAvailable();
  if (!found) return { tasks: [], source: "" };
  try {
    const parsed = JSON.parse(found.text.replace(/^\uFEFF/, ""));
    const list: any[] = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.tasks) ? parsed.tasks : []);
    const tasks: TaskDef[] = list
      .filter((t) => t && typeof t.label === "string" && t.label)
      .map((t) => ({
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
      }));
    return { tasks, source: found.path };
  } catch (e) {
    throw new Error("tasks.json is not valid JSON: " + String(e));
  }
}
