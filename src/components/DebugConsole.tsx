import { useState } from "react";
import { Bug, Play } from "lucide-react";
import { runJsPreview } from "../fs";
export default function DebugConsole({ code, onToast, onLog }: {
  code: string; onToast: (t: string, b?: string) => void; onLog: (s: string) => void;
}) {
  const [out, setOut] = useState("");
  const [ok, setOk] = useState(true);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const r = await runJsPreview(code);
      setOk(r.ok);
      setOut(r.output);
      onLog("$ run\n" + r.output);
      onToast(r.ok ? "Run finished" : "Run failed - see Debug panel");
    } finally { setBusy(false); }
  }
  return (
    <div className="glass">
      <div className="panel-header"><span>Run + Debug</span><span className={"badge " + (out ? (ok ? "badge-ok" : "badge-danger") : "")}>{out ? (ok ? "passed" : "failed") : "ready"}</span></div>
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={run}><Play size={13} /> Run JS preview</button>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}><Bug size={11} /> Sandboxed preview with console capture + 3s timeout. Paste the output into Debug AI for fixes.</div>
        {out && <pre className="code-output">{out}</pre>}
      </div>
    </div>
  );
}