import { useState } from "react";
import { ClipboardCopy, Loader2, Play, Sparkles, Wand2 } from "lucide-react";
import { useLLMCall } from "../aiClient";
import { Markdown, extractCodeBlocks } from "./Markdown";
import { runJsPreview } from "../fs";
const ACTIONS = [
  { id: "Refactor for readability", label: "Refactor" },
  { id: "Add JSDoc + inline comments", label: "Comment" },
  { id: "Optimize performance", label: "Optimize" },
  { id: "Generate unit tests", label: "Tests" },
  { id: "Fix types and null-safety", label: "Fix types" },
  { id: "Explain this code in plain English", label: "Explain" },
];
export default function AICodeActions({ code, onApply, onToast }: { code: string; onApply: (code: string) => void; onToast?: (t: string, b?: string) => void }) {
  const [out, setOut] = useState("");
  const [runOut, setRunOut] = useState("");
  const [running, setRunning] = useState(false);
  const { loading, run } = useLLMCall();
  async function act(kind: string) {
    setRunOut("");
    const ans = await run(`Action: ${kind}\n\nCode:\n${code.slice(0, 6000)}\n\nReturn markdown with a 2-4 line explanation then ONE fenced code block with the complete result.`);
    setOut(ans);
  }
  function apply() {
    const blocks = extractCodeBlocks(out);
    if (blocks[0]) { onApply(blocks[0]); onToast?.("Applied AI result", "First code block written to editor."); }
    else onToast?.("Nothing to apply", "No code block found in the AI answer.");
  }
  async function quickRun() {
    setRunning(true);
    try {
      const r = await runJsPreview(code);
      setRunOut((r.ok ? "✓ Ran OK\n\n" : "✖ Error\n\n") + r.output);
      onToast?.(r.ok ? "Run finished" : "Run failed", r.output.slice(0, 140));
    } finally { setRunning(false); }
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {ACTIONS.map((a) => (
          <button key={a.id} className="btn btn-sm" disabled={loading} onClick={() => act(a.id)}>
            {loading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} {a.label}
          </button>
        ))}
        <button className="btn btn-sm btn-primary" disabled={running} onClick={quickRun}>
          {running ? <Loader2 size={12} className="spin" /> : <Play size={12} />} Run JS
        </button>
        {out && <button className="btn btn-sm btn-primary" onClick={apply}><ClipboardCopy size={12} /> Apply to editor</button>}
      </div>
      {runOut && <pre className="code-output" style={{ marginBottom: 8 }}>{runOut}</pre>}
      {loading && !out ? <div className="shimmer" style={{ height: 60 }} /> : out ? <div className="card"><Markdown text={out} /></div> : <div style={{ fontSize: 12, color: "var(--text-2)" }}>Run an action — result with diff-ready code appears here. <Wand2 size={11} /> Tip: Apply writes the first code block into the editor.</div>}
    </div>
  );
}
