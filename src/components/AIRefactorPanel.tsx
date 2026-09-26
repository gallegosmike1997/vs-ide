import { useState } from "react";
import { ArrowRight, Loader2, Wand2 } from "lucide-react";
import { useLLMCall } from "../lib/aiClient";
import { Markdown } from "./Markdown";
export default function AIRefactorPanel({ code, onToast, embedded = false }: { code: string; onToast: (t: string, b?: string) => void; embedded?: boolean }) {
  const [out, setOut] = useState("");
  const { loading, run } = useLLMCall();
  const preview = code.length > 140 ? code.slice(0, 140) + "…" : code;
  async function suggest() {
    const ans = await run(`Give 3-5 concrete refactor suggestions as markdown bullets for:\n${code.slice(0, 5000)}`);
    setOut(ans);
    onToast("Refactor ideas ready");
  }
  return (
    <div className={embedded ? "" : "glass"} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      {!embedded && <div className="panel-header"><span>Refactor</span><span className="badge badge-accent">AI</span></div>}
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="card truncate" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{preview || "(empty file)"}</div>
        <button className="btn btn-primary btn-sm" disabled={loading} onClick={suggest}>
          {loading ? <Loader2 size={13} className="spin" /> : <Wand2 size={13} />} Suggest improvements <ArrowRight size={12} />
        </button>
        {loading && !out ? <div className="shimmer" style={{ height: 54 }} /> : out ? <div className="card"><Markdown text={out} /></div> : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--text-1)", display: "flex", flexDirection: "column", gap: 4 }}>
            <li>Extract helpers for repeated logic</li>
            <li>Add explicit parameter types</li>
            <li>Split file into smaller modules</li>
          </ul>
        )}
      </div>
    </div>
  );
}
