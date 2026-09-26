import { useState } from "react";
import { Bug, Loader2 } from "lucide-react";
import { useLLMCall } from "../lib/aiClient";
import { Markdown } from "./Markdown";
export default function DebugAssistant({ code, logs, onToast, embedded = false }: { code: string; logs: string; onToast: (t: string, b?: string) => void; embedded?: boolean }) {
  const [out, setOut] = useState("");
  const [logText, setLogText] = useState(logs);
  const { loading, run } = useLLMCall();
  async function analyze() {
    const ans = await run(`You are a debugging assistant.\nCode:\n${code.slice(0, 5000)}\n\nLogs/errors:\n${(logText || logs).slice(0, 3000)}\n\nGive: likely root cause, evidence, 2-3 fixes with code. Markdown.`);
    setOut(ans);
    onToast("Debug analysis ready");
  }
  return (
    <div className={embedded ? "" : "glass"}>
      {!embedded && <div className="panel-header"><span>Debug</span><span className="badge">AI</span></div>}
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea className="textarea" style={{ minHeight: 56 }} value={logText} onChange={(e) => setLogText(e.target.value)} placeholder="Paste error / logs here…" />
        <button className="btn btn-sm" disabled={loading} onClick={analyze}>
          {loading ? <Loader2 size={13} className="spin" /> : <Bug size={13} />} Analyze
        </button>
        {loading && !out ? <div className="shimmer" style={{ height: 48 }} /> : out ? <div className="card"><Markdown text={out} /></div> : <div style={{ fontSize: 12, color: "var(--text-2)" }}>Paste a stack trace and hit Analyze.</div>}
      </div>
    </div>
  );
}
