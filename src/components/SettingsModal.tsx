import { X } from "lucide-react";
export default function SettingsModal({ open, onClose, model, setModel, fontSize, setFontSize }: {
  open: boolean; onClose: () => void; model: string; setModel: (s: string) => void; fontSize: number; setFontSize: (n: number) => void;
}) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header"><span>Settings</span><button className="icon-btn" onClick={onClose}><X size={14} /></button></div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>MODEL NAME (LM Studio)</label>
          <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="your-model-name" />
          <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>EDITOR FONT SIZE: {fontSize}px</label>
          <input type="range" min={11} max={20} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
          <div className="card" style={{ fontSize: 12, color: "var(--text-1)" }}>
            Backend: <code>http://localhost:1234/v1</code> (OpenAI-compatible). Start LM Studio server to go online.
            All panels degrade gracefully to local fallbacks when offline.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn btn-primary btn-sm" onClick={onClose}>Done</button></div>
        </div>
      </div>
    </div>
  );
}
