import { FileCode2, X } from "lucide-react";
import type { TabDef } from "../store";
export default function EditorTabs({ tabs, activeId, onChange, onClose }: {
  tabs: TabDef[]; activeId: string; onChange: (id: string) => void; onClose: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, minHeight: 36 }}>
      <div className="etabs" style={{ flex: 1 }}>
        {tabs.map((t) => (
          <div key={t.id} className={"etab" + (t.id === activeId ? " active" : "")} onClick={() => onChange(t.id)}>
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
