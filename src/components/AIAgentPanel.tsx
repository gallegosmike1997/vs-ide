import { useState } from "react";
import { Check, ListChecks, Loader2, Sparkles, Undo2, Wand2 } from "lucide-react";

/** One-click "implement this" presets. Each becomes a full agent prompt. */
const TASKS = [
  { id: "fix", label: "Fix bugs", prompt: "Find and fix the bugs in this file. Keep the public behaviour intact and explain each fix in one line." },
  { id: "improve", label: "Improve", prompt: "Improve this file: readability, naming, structure and error handling. Do not change what it does." },
  { id: "refactor", label: "Refactor", prompt: "Refactor this file into smaller, well-named functions and remove duplication. Preserve behaviour exactly." },
  { id: "types", label: "Fix types", prompt: "Remove every `any` and add precise types, null-safety and runtime guards where values can be missing." },
  { id: "perf", label: "Optimize", prompt: "Optimize this file for performance (algorithmic complexity, allocations, repeated work) without changing behaviour." },
  { id: "tests", label: "Write tests", prompt: "Write a complete test file for this code, covering the main path, boundaries and error cases." },
  { id: "docs", label: "Docs & comments", prompt: "Add a file-level doc comment and concise JSDoc to each exported function. Do not restructure the code." },
] as const;

/**
 * The agent buttons: pick a task (or type one), the model returns real file
 * edits, and the user reviews the diff before anything is written.
 */
export default function AIAgentPanel({ busy, onImplement, pending, applied, onReview, onUndo }: {
  busy: boolean;
  onImplement: (task: string, auto: boolean) => void;
  pending?: number;
  applied?: boolean;
  onReview?: () => void;
  onUndo?: () => void;
}) {
  const [auto, setAuto] = useState(false);
  const [free, setFree] = useState("");
  function fire(task: string) { if (task.trim() && !busy) onImplement(task.trim(), auto); }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="badge badge-accent"><Sparkles size={11} /> AI agent</span>
        <label style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-2)", display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> apply automatically
        </label>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TASKS.map((t) => (
          <button key={t.id} className="btn btn-sm" disabled={busy} title={t.prompt} onClick={() => fire(t.prompt)}>
            {busy ? <Loader2 size={12} className="spin" /> : <Wand2 size={12} />} {t.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          className="input" value={free} onChange={(e) => setFree(e.target.value)}
          placeholder="Implement a change… e.g. “add retry with exponential backoff”"
          onKeyDown={(e) => { if (e.key === "Enter") { fire(free); setFree(""); } }}
        />
        <button className="btn btn-sm btn-primary" disabled={busy || !free.trim()} onClick={() => { fire(free); setFree(""); }}>
          {busy ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Implement
        </button>
      </div>
      {(applied || pending) ? (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ListChecks size={14} />
          <span style={{ flex: 1, fontSize: 12 }}>{applied ? "Changes applied to the open tabs." : pending + " change(s) ready to apply."}</span>
          {applied
            ? <button className="btn btn-sm" onClick={onUndo}><Undo2 size={12} /> Undo</button>
            : <button className="btn btn-sm btn-primary" onClick={onReview}><Check size={12} /> Review &amp; apply</button>}
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: "var(--text-2)", display: "flex", gap: 6, alignItems: "center" }}>
          <Check size={11} /> The AI returns real file edits — you see the diff before anything is written.
        </div>
      )}
    </div>
  );
}