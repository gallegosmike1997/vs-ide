import { useState } from "react";
import { FolderKanban, Loader2 } from "lucide-react";
import { useLLMCall } from "../aiClient";
import { Markdown } from "./Markdown";
import type { TabDef } from "../store";
export default function ProjectRefactorEngine({ files, onToast }: { files: TabDef[]; onToast: (t: string, b?: string) => void }) {
  const [out, setOut] = useState("");
  const { loading, run } = useLLMCall();
  async function analyze() {
    const ctx = files.map((f) => `FILE: ${f.label}\n${f.content.slice(0, 2500)}`).join("\n\n");
    const ans = await run(`Project-wide refactor engine. Files:\n${ctx}\n\nPropose: architecture notes, dupes, file-by-file plan. Markdown.`);
    setOut(ans);
    onToast("Project plan ready");
  }
  return (
    <div className="glass">
      <div className="panel-header"><span>Project refactor</span><span className="badge">{files.length} files</span></div>
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button className="btn btn-sm" disabled={loading} onClick={analyze}>
          {loading ? <Loader2 size={13} className="spin" /> : <FolderKanban size={13} />} Analyze project
        </button>
        {loading && !out ? <div className="shimmer" style={{ height: 48 }} /> : out ? <div className="card"><Markdown text={out} /></div> : <div style={{ fontSize: 12, color: "var(--text-2)" }}>Get a cross-file refactor plan.</div>}
      </div>
    </div>
  );
}
