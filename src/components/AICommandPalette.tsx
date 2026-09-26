import { useEffect, useMemo, useRef, useState } from "react";
import { Command, FileSearch, Sparkles } from "lucide-react";
import { callLLM } from "../lib/aiClient";
import { COMMANDS, hintFor } from "../lib/commands";
import { fuzzyFilterTop } from "../lib/fuzzy";
import type { MenuAction, TabDef } from "../store";

type Row = { kind: "file"; id: string; label: string; language: string }
  | { kind: "cmd"; id: MenuAction; label: string; group: string; hint: string };

/**
 * One quick-open box with two modes: files by default, commands behind ">".
 * Enter on a query that matches nothing asks the AI instead of doing nothing.
 *
 * The command list is the real registry (src/lib/commands.ts), so every menu
 * item is reachable by name and the hint shows the user's current binding.
 */
export default function AICommandPalette({ open, onClose, tabs, onOpenFile, onCommand, onRun, onToast }: {
  open: boolean; onClose: () => void; tabs: TabDef[];
  onOpenFile: (id: string) => void;
  /** Runs a registry command through App's dispatcher. */
  onCommand: (id: MenuAction) => void;
  onRun: (cmd: string, res: string) => void;
  onToast: (t: string, b?: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [aiOut, setAiOut] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (open) { setQ(""); setAiOut(""); setSel(0); } }, [open]);

  const isCmd = q.startsWith(">");
  const term = q.replace(/^>\s*/, "").trim();
  const asking = !isCmd && q.trim().length > 0;

  const rows = useMemo<Row[]>(() => {
    if (isCmd) {
      return fuzzyFilterTop(COMMANDS.filter((c) => c.id !== "palette"), term, (c) => c.label, 40)
        .map(({ item }) => ({ kind: "cmd", id: item.id, label: item.label, group: item.group, hint: hintFor(item.id) }));
    }
    const hits = term ? fuzzyFilterTop(tabs, term, (t) => t.label, 40) : null;
    const list = hits ? hits.map(({ item }) => item) : tabs;
    return list.map((t) => ({ kind: "file", id: t.id, label: t.label, language: t.language } as Row));
  }, [isCmd, term, tabs]);

  useEffect(() => { setSel(0); listRef.current?.scrollTo({ top: 0 }); }, [term, isCmd]);

  async function askAI() {
    const prompt = q.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setAiOut("thinking…");
    try {
      const ans = await callLLM(
        `IDE quick question: ${prompt}\nOpen files: ${tabs.map((t) => t.label).join(", ") || "none"}\nAnswer helpfully and briefly.`,
      );
      setAiOut(ans);
      onRun(prompt, ans);
    } catch (e: any) {
      setAiOut("Request failed: " + String(e?.message || e).slice(0, 200));
    } finally {
      setBusy(false);
    }
  }

  function choose(row: Row | undefined) {
    if (!row) { if (asking) askAI(); return; }
    if (row.kind === "file") { onOpenFile(row.id); onClose(); onToast("Opened " + row.label); }
    else { onCommand(row.id); onClose(); }
  }

  const current = rows[sel];
  const noneMatch = !isCmd && term && !rows.length;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass palette" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderBottom: "1px solid var(--border)" }}>
          {isCmd ? <Command size={15} /> : <Sparkles size={15} />}
          <input
            autoFocus className="input" style={{ border: "none", background: "transparent", fontSize: 14 }} value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search files · ">" for commands · Enter asks the AI'
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(rows.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter") {
                e.preventDefault();
                if (isCmd || current) choose(current);
                else askAI();
              }
            }}
          />
          {noneMatch && <span className="badge badge-accent">asks the AI</span>}
          <span className="kbd">esc</span>
        </div>

        <div className="palette-list" ref={listRef}>
          {isCmd && !rows.length && (
            <div style={{ padding: 12, fontSize: 12, color: "var(--text-3)" }}>
              No command matches “{term}” — every File / Edit / Selection / View / Go item is in here.
            </div>
          )}
          {noneMatch && (
            <div className="palette-item" onClick={askAI}>
              <Sparkles size={13} /> Ask AI: “{q.trim()}”{busy ? " (working…)" : ""}
            </div>
          )}
          {rows.map((r, i) => (
            <div key={r.kind + r.id + i} className={"palette-item" + (i === sel ? " selected" : "")}
              onMouseEnter={() => setSel(i)} onClick={() => choose(r)}>
              {r.kind === "cmd" ? <Command size={13} /> : <FileSearch size={13} />}
              <span className="truncate" style={{ flex: 1 }}>{r.label}</span>
              {r.kind === "cmd" && r.hint && <span className="kbd">{r.hint}</span>}
              {r.kind === "cmd" ? <span className="badge">{r.group}</span> : <span className="badge">{r.language}</span>}
            </div>
          ))}
          {!isCmd && !term && (
            <div style={{ padding: 10, fontSize: 12, color: "var(--text-2)" }}>
              Recent: {tabs.map((t) => t.label).join(" · ") || "no files open"}
            </div>
          )}
          {aiOut && <pre className="code-output" style={{ margin: 8, whiteSpace: "pre-wrap" }}>{aiOut}</pre>}
        </div>

        <div className="palette-foot">
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> {isCmd ? "run" : current ? "open" : "ask AI"}</span>
          <span><span className="kbd">&gt;</span> commands</span>
          <div style={{ flex: 1 }} />
          {current?.kind === "cmd" && <span className="badge badge-ok">{current.label}</span>}
        </div>
      </div>
    </div>
  );
}
