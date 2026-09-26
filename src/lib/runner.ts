import { invoke } from "@tauri-apps/api/core";
import { currentRoot, isDesktop, hasWorkspace, rootFor, writeWorkspaceFile } from "./workspace";
import type { TabDef } from "../store";

// ---------------------------------------------------------------------------
// Real terminal / code execution (desktop app only).
//
// Commands are executed by the Rust backend (`run_command`) through the shell
// profile the user picked, with the open workspace as the working directory.
// In a plain browser (vite dev without Tauri) everything degrades to demo mode.
// ---------------------------------------------------------------------------

export type RunResult = { ok: boolean; code: number | null; output: string; timedOut: boolean };

/** Rust serialises `timed_out`; normalise so callers only see `timedOut`. */
type RawRun = { ok: boolean; code: number | null; output: string; timed_out?: boolean; timedOut?: boolean };
const normRun = (r: RawRun): RunResult => ({
  ok: r.ok,
  code: r.code ?? null,
  output: r.output ?? "",
  timedOut: !!(r.timed_out ?? r.timedOut),
});

export function canRunReal(): boolean {
  return isDesktop();
}

// ---------------------------------------------------------------------------
// Shell profiles — "preintegrated" terminals.
//
// We cannot bundle interpreters inside the app (that is gigabytes of runtimes),
// so instead we auto-detect everything the user already has and let them pick.
// ---------------------------------------------------------------------------
export type ShellDef = { id: string; label: string; windows?: boolean; unix?: boolean; hint: string };

export const SHELLS: ShellDef[] = [
  { id: "cmd", label: "Command Prompt", windows: true, hint: "cmd.exe (Windows default)" },
  { id: "powershell", label: "PowerShell", hint: "Windows PowerShell 5.x" },
  { id: "pwsh", label: "PowerShell 7", hint: "cross-platform PowerShell Core" },
  { id: "git-bash", label: "Git Bash", windows: true, hint: "bash shipped with Git for Windows" },
  { id: "bash", label: "Bash", unix: true, hint: "POSIX shell" },
  { id: "sh", label: "sh", unix: true, hint: "POSIX shell" },
  { id: "wsl", label: "WSL (Linux)", windows: true, hint: "Windows Subsystem for Linux" },
];

const SHELL_KEY = "vs-ide-shell";

/** Human-readable shell name for the terminal banner / tabs. */
export function SHELL_LABEL(id: string): string {
  return SHELLS.find((s) => s.id === id)?.label ?? id ?? "shell";
}

export function defaultShell(): string {
  const win = navigator.platform.toLowerCase().includes("win");
  return win ? "cmd" : "bash";
}

export function selectedShell(): string {
  try {
    const saved = localStorage.getItem(SHELL_KEY);
    if (saved && SHELLS.some((s) => s.id === saved)) return saved;
  } catch { /* storage blocked */ }
  return defaultShell();
}

export function setSelectedShell(id: string): void {
  try { localStorage.setItem(SHELL_KEY, id); } catch { /* storage blocked */ }
}

export type ShellInfo = { id: string; available: boolean; version: string | null };

/** Which shells actually exist on this machine? Probed once, cached. */
let shellCache: ShellInfo[] | null = null;
export async function detectShells(): Promise<ShellInfo[]> {
  if (shellCache) return shellCache;
  if (!canRunReal()) { shellCache = []; return shellCache; }
  try {
    const raw = await invoke<{ id: string; available: boolean; version: string | null }[]>("detect_shells");
    shellCache = raw.map((s) => ({ id: s.id, available: !!s.available, version: s.version ?? null }));
  } catch {
    shellCache = [];
  }
  return shellCache;
}

/** Run an arbitrary shell command in the workspace (or app) directory. */

// ---------------------------------------------------------------------------
// Language runners: probe (is the toolchain installed?) + how to execute a file.
// ---------------------------------------------------------------------------
type Runner = { label: string; ext: string; probe: string; build: (file: string) => string; install: string };

const stripExt = (f: string) => f.replace(/\.\w+$/, "");

export const RUNNERS: Record<string, Runner> = {
  python: { label: "Python", ext: "py", probe: "python --version", build: (f) => `python "${f}"`, install: "https://www.python.org/downloads/" },
  javascript: { label: "JavaScript (Node)", ext: "js", probe: "node --version", build: (f) => `node "${f}"`, install: "https://nodejs.org/" },
  typescript: { label: "TypeScript (tsx)", ext: "ts", probe: "npx -y tsx --version", build: (f) => `npx -y tsx "${f}"`, install: "https://nodejs.org/ (tsx runs via npx)" },
  go: { label: "Go", ext: "go", probe: "go version", build: (f) => `go run "${f}"`, install: "https://go.dev/dl/" },
  rust: { label: "Rust", ext: "rs", probe: "rustc --version", build: (f) => `rustc "${f}" -o "${stripExt(f)}.exe" && "${stripExt(f)}.exe"`, install: "https://rustup.rs/" },
  java: { label: "Java", ext: "java", probe: "java -version", build: (f) => `java "${f}"`, install: "https://adoptium.net/" },
  ruby: { label: "Ruby", ext: "rb", probe: "ruby -v", build: (f) => `ruby "${f}"`, install: "https://rubyinstaller.org/" },
  php: { label: "PHP", ext: "php", probe: "php --version", build: (f) => `php "${f}"`, install: "https://windows.php.net/download/" },
  lua: { label: "Lua", ext: "lua", probe: "lua -v", build: (f) => `lua "${f}"`, install: "https://luabinaries.sourceforge.net/" },
  perl: { label: "Perl", ext: "pl", probe: "perl -v", build: (f) => `perl "${f}"`, install: "https://strawberryperl.com/" },
  c: { label: "C (gcc)", ext: "c", probe: "gcc --version", build: (f) => `gcc "${f}" -o "${stripExt(f)}.exe" && "${stripExt(f)}.exe"`, install: "https://www.mingw-w64.org/" },
  cpp: { label: "C++ (g++)", ext: "cpp", probe: "g++ --version", build: (f) => `g++ "${f}" -o "${stripExt(f)}.exe" && "${stripExt(f)}.exe"`, install: "https://www.mingw-w64.org/" },
  powershell: { label: "PowerShell", ext: "ps1", probe: "powershell -NoProfile -Command $PSVersionTable.PSVersion.Major", build: (f) => `powershell -NoProfile -ExecutionPolicy Bypass -File "${f}"`, install: "built into Windows" },
  batch: { label: "Batch", ext: "bat", probe: "cmd /C ver", build: (f) => `"${f}"`, install: "built into Windows" },
  shell: { label: "Shell / bash", ext: "sh", probe: "bash --version", build: (f) => `bash "${f}"`, install: "https://git-scm.com/downloads (Git Bash)" },
  r: { label: "R", ext: "r", probe: "Rscript --version", build: (f) => `Rscript "${f}"`, install: "https://cran.r-project.org/bin/windows/base/" },
};

/** Best runner for a Monaco language id / editor tab. */
export function runnerForLanguage(language: string): Runner | null {
  if (RUNNERS[language]) return RUNNERS[language];
  const alias: Record<string, string> = {
    javascriptreact: "javascript", typescriptreact: "typescript", csharp: "c",
    "c++": "cpp", golang: "go", bat: "batch", ps1: "powershell", rscript: "r",
  };
  const mapped = alias[language];
  return mapped ? RUNNERS[mapped] ?? null : null;
}

/** Match a runner purely from a file name (used for workspace-tree files). */
export function runnerForFile(name: string): { id: string; runner: Runner } | null {
  const n = name.toLowerCase();
  for (const [id, r] of Object.entries(RUNNERS)) {
    if (n.endsWith("." + r.ext)) return { id, runner: r };
  }
  return null;
}

/** Which toolchains are installed on this machine? Probed once, cached. */
let availableCache: Record<string, boolean> | null = null;
export async function detectAvailableLanguages(): Promise<Record<string, boolean>> {
  if (availableCache) return availableCache;
  const out: Record<string, boolean> = {};
  if (!canRunReal()) {
    availableCache = out;
    return out;
  }
  await Promise.all(
    Object.entries(RUNNERS).map(async ([id, r]) => {
      try {
        const res = await runShell(r.probe, 20000);
        out[id] = res.ok;
      } catch {
        out[id] = false;
      }
    })
  );
  availableCache = out;
  return out;
}

export function resetRunnerCaches(): void {
  availableCache = null;
  shellCache = null;
}

export async function runShell(cmd: string, timeoutMs = 20000, shell?: string, cwdOverride?: string | null): Promise<RunResult> {
  // cwdOverride: undefined = primary root (default), null = app dir, string = that folder.
  const cwd = cwdOverride !== undefined ? cwdOverride : currentRoot();
  const raw = await invoke<RawRun>("run_command", {
    cmd,
    cwd: cwd ?? null,
    timeoutMs,
    shell: shell ?? selectedShell(),
  });
  return normRun(raw);
}

/** Reveal a path in the OS file manager (desktop only). Uses the shell we
 *  already have instead of a new plugin: `explorer /select,` on Windows. */
export async function revealInFolder(path: string): Promise<boolean> {
  if (!canRunReal() || !path) return false;
  const cmd = navigator.platform.toLowerCase().includes("win")
    ? `explorer /select,"${path.replace(/[\\/]+$/, "")}"`
    : `xdg-open "${/^\//.test(path) ? path : (currentRoot() ?? "") + "/" + path}"`;
  const r = await runShell(cmd, 15000);
  return r.ok;
}

/** Write editor content to a temp file so unsaved buffers can be executed. */
export async function writeTempFile(name: string, contents: string): Promise<string> {
  return await invoke<string>("write_temp_file", { name, contents });
}

const toNativePath = (p: string) => (navigator.platform.toLowerCase().includes("win") ? p.replace(/\//g, "\\") : p);

/**
 * Run the given editor tab with its language's interpreter.
 * Workspace files are saved first; everything else is written to a temp file.
 */
export async function runActiveFile(tab: TabDef): Promise<{ result: RunResult | null; command: string; error?: string }> {
  const runner = runnerForLanguage(tab.language);
  if (!runner) {
    return { result: null, command: "", error: `No runner for "${tab.language}". Open a .py / .js / .ts / .go / .rs / .java / .rb / .php / .c file, or use \`run <lang>\`.` };
  }

  let path: string;
  if (tab.absPath && hasWorkspace()) {
    await writeWorkspaceFile(tab.absPath, tab.content); // save before running
    path = toNativePath(tab.absPath);
  } else {
    const base = (tab.label.split("/").pop() || "untitled").replace(/[^\w.-]/g, "_");
    const name = base.toLowerCase().endsWith("." + runner.ext) ? base : `${base}.${runner.ext}`;
    path = toNativePath(await writeTempFile(name, tab.content));
  }
  const command = runner.build(path);
  // Workspace files run in the root that CONTAINS them (multi-root aware).
  const result = await runShell(command, 60000, undefined, rootFor(tab.absPath));
  return { result, command };
}

/** Run the active buffer through a specific language runner, by id. */
export async function runWithLanguage(tab: TabDef, langId: string): Promise<{ result: RunResult | null; command: string; error?: string }> {
  const runner = RUNNERS[langId];
  if (!runner) return { result: null, command: "", error: `No runner "${langId}".` };
  const base = (tab.label.split("/").pop() || "untitled").replace(/[^\w.-]/g, "_");
  const stem = base.replace(/\.\w+$/, "") || "untitled";
  const path = toNativePath(await writeTempFile(`${stem}.${runner.ext}`, tab.content));
  const command = runner.build(path);
  const result = await runShell(command, 60000);
  return { result, command };
}
