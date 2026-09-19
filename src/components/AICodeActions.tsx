import { useState } from "react";
import { ClipboardCopy, Loader2, Sparkles } from "lucide-react";
import { useLLMCall } from "../aiClient";
import { Markdown, extractCodeBlocks } from "./Markdown";
const ACTIONS = [
  { id: "Refactor for readability", label: "Refactor" },
  { id: "Add JSDoc + inline comments", label: "Comment" },
  { id: "Optimize performance", label: "Optimize" },
  { id: "Generate unit tests", label: "Tests" },
  { id: "Fix types and null-safety", label: "Fix types" },
];
export default function AICodeActions({ code, onApply }: { code: string; onApply: (code: string) => void }) {
  const [out, setOut] = useState("");
  const { loading, run } = useLLMCall();
  async function act(kind: string) {
    const ans = await run(`Action: ${kind}\n\nCode:\n${code.slice(0, 6000)}\n\nReturn markdown with explanation then a fenced code block with the result.`);
    setOut(ans);
  }
  function apply() {
    const blocks = extractCodeBlocks(out);
    if (blocks[0]) { onApply(blocks[0]); }
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {ACTIONS.map((a) => (
          <button key={a.id} className="btn btn-sm" disabled={loading} onClick={() => act(a.id)}>
            {loading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} {a.label}
          </button>
        ))}
        {out && <button className="btn btn-sm btn-primary" onClick={apply}><ClipboardCopy size={12} /> Copy result</button>}
      </div>
      {loading && !out ? <div className="shimmer" style={{ height: 60 }} /> : out ? <div className="card"><Markdown text={out} /></div> : <div style={{ fontSize: 12, color: "var(--text-2)" }}>Run an action — result with diff-ready code appears here.</div>}
    </div>
  );
}
