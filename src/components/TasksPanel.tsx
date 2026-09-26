import { useEffect, useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { loadTasks, matcherRegex, type TaskDef } from "../lib/tasks";
import { baseName, isDesktop } from "../lib/workspace";

type Props = {
  onToast?: (title: string, body?: string) => void;
  /** Append raw task output somewhere visible (we route it to the Output dock). */
  onOutput?: (text: string) => void;
  /** Click-to-jump for matched problems: (file, line). */
  onGoto?: (file: string, line: number) => void;
};

/** Task output paths are relative to THEIR root — make them absolute for jumps. */
const absJoin = (root: string, p: string) =>
  (/^[A-Za-z]:[\\/]|^\//.test(p) || !root ? p : root.replace(/[\\/]+$/, "") + "/" + p.replace(/\\/g, "/"));

/**
 * Tasks panel: reads tasks.json from EVERY open folder (VS Code-compatible
 * shape, version 2.0.0) and runs each task with cwd = the folder it came
 * from (multi-root). Output is scanned with the task's problemMatcher;
 * matches become clickable and resolve against that same root.
 */
export default function TasksPanel({ onToast, onOutput, onGoto }: Props) {
  const [tasks, setTasks] = useState<TaskDef[]>([]);
  const [src, setSrc] = useState<string>("");
  const [running, setRunning] = useState<string | null>(null);
  const [lastOut, setLastOut] = useState<string>("");
  const [lastTask, setLastTask] = useState<TaskDef | null>(null);

  useEffect(() => {
    if (!isDesktop()) return;
    void (async () => {
      try {
        const r = await loadTasks();
        setTasks(r.tasks);
        setSrc(r.source);
      } catch { setTasks([]); }
    })();
  }, []);

  const run = async (t: TaskDef) => {
    // Multi-root: run with cwd = the folder THIS task was defined in.
    const root = t.root;
    if (!root) { onToast?.("No workspace", "Open a workspace folder to run tasks."); return; }
    setRunning(t.label);
    setLastTask(t);
    try {
      const shell = t.windows && navigator.platform.toLowerCase().includes("win") ? t.windows : (t.command ?? "");
      const res = await invoke<{ ok: boolean; code: number | null; output: string; timedOut: boolean }>("run_command", {
        cmd: shell, cwd: root, timeoutMs: t.timeoutMs ?? 60000, shell: null,
      });
      setLastOut(res.output || "(no output)");
      onOutput?.(res.output || "");
      const problems = matchProblems(res.output, t.problemMatcher ? [t.problemMatcher] : [], t.label)
        .map((p) => ({ ...p, file: absJoin(root, p.file) }));
      if (problems.length) onToast?.(`${t.label}: ${problems.length} problem(s)`, "Click a line in the output to jump.");
      else if (res.ok) onToast?.(`${t.label} finished`, "Exit code 0.");
      else onToast?.(`${t.label} failed`, res.timedOut ? "Timed out." : `Exit code ${res.code ?? "?"}.`);
      // Stash matches for click-to-jump from the output area.
      (window as any).__mzsgTaskProblems = problems;
    } catch (e: any) { onToast?.("Task error", String(e?.message || e)); }
    finally { setRunning(null); }
  };

  if (!tasks.length) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "var(--text-2, #8b93a9)" }}>
        No <b>tasks.json</b> in any open folder (.vscode/tasks.json or tasks.json). Create one like:
        <pre className="code-output" style={{ marginTop: 8, maxHeight: 180 }}>{`{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "cargo build",
      "problemMatcher": "$rustc"
    }
  ]
}`}</pre>
        {src ? <div style={{ marginTop: 6 }}>{src}</div> : null}
      </div>
    );
  }

  const multiRoot = new Set(tasks.map((t) => t.root)).size > 1;
  return (
    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {tasks.map((t) => (
          <button key={t.root + ":" + t.label} className="btn btn-sm" disabled={running === t.label} onClick={() => run(t)}
            title={`${t.label} — ${t.source} · cwd: ${t.root}`}>
            {running === t.label ? <RefreshCw size={12} className="spin" /> : <Play size={12} />} {t.label}
            {multiRoot && <span className="badge" style={{ marginLeft: 6 }}>{baseName(t.root)}</span>}
          </button>
        ))}
      </div>
      {lastOut && (
        <pre className="code-output" style={{ maxHeight: 130, margin: 0 }}
          onClick={(e) => {
            // Click-to-jump: lines like "src/x.ts:12:5" or "src\x.ts(12)"
            const m = (e.target as HTMLElement)?.textContent?.match(/([\w./\\-]+?\.\w+)[:(](\d+)/);
            if (m && onGoto) onGoto(absJoin(lastTask?.root ?? "", m[1]), parseInt(m[2], 10));
          }}>
          {lastOut}
        </pre>
      )}
    </div>
  );
}

/** Minimal problemMatcher support: file:line (and file(line) on Windows). */
function matchProblems(out: string, matchers: string[], task: string) {
  if (!out) return [];
  const found: { file: string; line: number; task: string }[] = [];
  const rxes = (matchers.length ? matchers : [undefined])
    .map(matcherRegex)
    .filter((r): r is RegExp => !!r);
  for (const rx of rxes) {
    rx.lastIndex = 0;
    for (const m of out.matchAll(rx)) {
      const file = m[1];
      const line = parseInt(m[2], 10);
      if (file && line > 0) found.push({ file, line, task });
    }
  }
  return found.slice(0, 50);
}
