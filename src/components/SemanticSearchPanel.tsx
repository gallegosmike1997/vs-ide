import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useLLMCall } from "../aiClient";
import { Markdown } from "./Markdown";
import type { TabDef } from "../store";
export default function SemanticSearchPanel({ files, onOpen }: { files: TabDef[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [out, setOut] = useState("");
  const { loading, run } = useLLMCall();
  const local = useMemo(() => {
    if (!q.trim()) return [];
    const needle = q.toLowerCase();
    return files
      .map((f) => ({ f, score: (f.label.toLowerCase().includes(needle) ? 2 : 0) + (f.content.toLowerCase().includes(needle) ? 1 : 0) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [q, files]);
  async function search() {
    if (!q.trim()) return;
    const ctx = files.map((f) => `FILE: ${f.label}\n${f.content.slice(0, 2000)}`).join("\n\n");
    const ans = await run(`Semantic search over codebase.\nQuery: ${q}\n\n${ctx}\n\nReturn most relevant file paths + one-line why. Markdown.`);
    setOut(ans);
  }
  return (
    <div className="glass" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="panel-header"><span>Semantic search</span><span className="badge badge-accent">AI</span></div>
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. login form, API router…" onKeyDown={(e) => { if (e.key === "Enter") search(); }} />
          <button className="btn btn-primary btn-sm" disabled={loading} onClick={search}>{loading ? <Loader2 size={13} className="spin" /> : <Search size={13} />}</button>
        </div>
        {!!local.length && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {local.map(({ f }) => (
              <div key={f.id} className="result-card" style={{ cursor: "pointer" }} onClick={() => onOpen(f.id)}>
                <b>{f.label}</b> <span style={{ color: "var(--text-2)" }}>— local match, click to open</span>
              </div>
            ))}
          </div>
        )}
        {loading && !out ? <div className="shimmer" style={{ height: 44 }} /> : out ? <div className="card"><Markdown text={out} /></div> : <div style={{ fontSize: 12, color: "var(--text-2)" }}>Results appear here. Local matches show instantly.</div>}
      </div>
    </div>
  );
}
