import { useEffect, useMemo, useState } from "react";
import { Command, CornerDownLeft, FileSearch, Sparkles } from "lucide-react";
import { callLLM } from "../aiClient";
import type { TabDef } from "../store";
export default function AICommandPalette({ open, onClose, tabs, onOpenFile, onRun, onToast }: {
  open: boolean; onClose: () => void; tabs: TabDef[]; onOpenFile: (id: string) => void; onRun: (cmd: string, res: string) => void; onToast: (t: string, b?: string) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [aiOut, setAiOut] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setQ(""); setAiOut(""); setSel(0); } }, [open ]);
  const files = useMemo(() => tabs.filter((t) => t.label.toLowerCase().includes(q.replace(/^>?\s*/, "").toLowerCase())), [tabs, q]);
  const isCmd = q.startsWith(">");
  const commands = useMemo(() => {
    const all = ["New file", "Add file…", "Add folder…", "Add repo…", "Toggle theme", "Save file", "Run JS", "Explain active file", "Fix active file (writes changes)", "Write tests (creates a file)", "Go to terminal", "Show problems"];
    return all.filter((c) => c.toLowerCase().includes(q.replace(/^>\s*/, "").toLowerCase()));
  }, [q]);
  useEffect(() => setSel(0), [q]);
  if (!open) return null;
  async function askAI() {
    if (!q.trim() || busy) return;
    setBusy(true);
    const ans = await callLLM(`IDE command palette query: ${q}\nActive files: ${tabs.map((t) => t.label).join(", ")}\nAnswer helpfully and briefly.`);
    setAiOut(ans);
    onRun(q, ans);
    setBusy(false);
  }
  function chooseFile(f: TabDef) { onOpenFile(f.id); onClose(); onToast("Opened " + f.label); }
  function chooseCmd(c: string) { onRun("cmd:" + c, c); onClose(); }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass palette" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderBottom: "1px solid var(--border)" }}>
          {isCmd ? <Command size={15} /> : <Sparkles size={15} />}
          <input
            autoFocus className="input" style={{ border: "none", background: "transparent", fontSize: 14 }} value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Type to search files, “>” for commands, or Enter for AI…'
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => s + 1); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter") {
                if (isCmd && commands[sel]) chooseCmd(commands[sel]);
                else if (!isCmd && q && files[sel]) chooseFile(files[sel]);
                else askAI();
              }
            }}
          />
          <span className="kbd">esc</span>
        </div>
        <div style={{ padding: 8, maxHeight: 320, overflowY: "auto" }}>
          {isCmd ? commands.map((c, i) => (
            <div key={c} className={"palette-item" + (i === sel ? " selected" : "")} onClick={() => chooseCmd(c)}><CornerDownLeft size={13} /> {c}</div>
          )) : (
            <>
              {q && <div className="palette-item" onClick={askAI}><Sparkles size={13} /> Ask AI: “{q}” {busy ? "(working…)" : ""}</div>}
              {files.map((f, i) => (
                <div key={f.id} className={"palette-item" + (i === sel ? " selected" : "")} onClick={() => chooseFile(f)}><FileSearch size={13} /> {f.label} <span className="badge" style={{ marginLeft: "auto" }}>{f.language}</span></div>
              ))}
              {!q && <div style={{ padding: 10, fontSize: 12, color: "var(--text-2)" }}>Recent: {tabs.map((t) => t.label).join(" · ")}</div>}
            </>
          )}
          {aiOut && <pre className="code-output" style={{ margin: 8 }}>{aiOut}</pre>}
        </div>
      </div>
    </div>
  );
}
