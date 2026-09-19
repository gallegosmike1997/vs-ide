import { Bot, X } from "lucide-react";
export default function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header"><span>About VS-IDE</span><button className="icon-btn" onClick={onClose}><X size={14} /></button></div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5, color: "var(--text-1)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#4f8cff,#7c5cff)", color: "#fff" }}><Bot size={18} /></span>
            <div><b style={{ color: "var(--text-0)", fontSize: 14 }}>VS-IDE v0.1.0</b><div>Local-first AI code editor. Monaco + React + Tauri.</div></div>
          </div>
          <div className="card">AI talks to any OpenAI-compatible <code>/v1</code> server (LM Studio, Ollama, OpenAI, vLLM…). No account needed for local models. Everything degrades gracefully offline.</div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn btn-primary btn-sm" onClick={onClose}>Close</button></div>
        </div>
      </div>
    </div>
  );
}
