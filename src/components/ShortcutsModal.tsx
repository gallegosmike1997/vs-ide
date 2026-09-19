import { Keyboard, X } from "lucide-react";
const ROWS: [string, string][] = [
  ["Ctrl/⌘ + K", "Command palette / Ask AI"],
  ["Ctrl/⌘ + S", "Save active file"],
  ["Ctrl/⌘ + N", "New file"],
  ["Ctrl/⌘ + O", "Add file from disk"],
  ["Ctrl/⌘ + W", "Close tab"],
  ["Ctrl/⌘ + G", "Go to line"],
  ["Ctrl/⌘ + F", "Find in file"],
  ["Ctrl/⌘ + Z / Ctrl+Y", "Undo / Redo"],
  ["Shift + Alt + F", "Format document"],
  ["Ctrl/⌘ + /", "Toggle line comment"],
  ["Ctrl/⌘ + ,", "Settings"],
];
export default function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header"><span><Keyboard size={13} style={{ marginRight: 6 }} />Keyboard shortcuts</span><button className="icon-btn" onClick={onClose}><X size={14} /></button></div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ROWS.map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12.5 }}>
              <span className="kbd" style={{ minWidth: 130, textAlign: "center" }}>{k}</span><span style={{ color: "var(--text-1)" }}>{v}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
