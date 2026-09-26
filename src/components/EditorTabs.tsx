import { Copy, FileCode2, X } from "lucide-react";
import type { TabDef } from "../store";
import { showContextMenu } from "../lib/contextMenu";

export default function EditorTabs({ tabs, activeId, onChange, onClose }: {
  tabs: TabDef[]; activeId: string; onChange: (id: string) => void; onClose: (id: string) => void;
}) {
  /** Right-click on a tab: close / copy path / split. */
  const tabMenu = (e: React.MouseEvent, t: TabDef) => {
    showContextMenu(e, [
      { label: "Close", command: "close-tab", run: () => onClose(t.id) },
      { label: "Close Others", run: () => tabs.filter((x) => x.id !== t.id).forEach((x) => onClose(x.id)) },
      { label: "Close All", run: () => tabs.forEach((x) => onClose(x.id)) },
      { sep: true },
      { label: "Copy Full Path", icon: <Copy size={13} />, command: "copy-path", run: () => void navigator.clipboard?.writeText(t.absPath || t.label) },
      { label: "Reveal in File Explorer", command: "reveal-file" },
      { sep: true },
      { label: "Split Editor Right", command: "split-right" },
      { label: "Ask AI to Explain", command: "explain" },
    ], t.label);
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, minHeight: 36 }}>
      <div className="etabs" style={{ flex: 1 }}>
        {tabs.map((t) => (
          <div key={t.id} className={"etab" + (t.id === activeId ? " active" : "")} onClick={() => onChange(t.id)} onContextMenu={(e) => tabMenu(e, t)}>
            <FileCode2 size={13} />
            <span>{t.label}</span>
            {t.dirty ? <span className="dirty-dot" title="Unsaved" /> : null}
            <button
              className="icon-btn" style={{ width: 20, height: 20 }}
              title="Close"
              onClick={(e) => { e.stopPropagation(); onClose(t.id); }}
            ><X size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
