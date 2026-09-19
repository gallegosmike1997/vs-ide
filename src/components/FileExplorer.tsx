import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileCode2, FileJson, FileText, Folder, FolderGit2, FolderOpen, FolderPlus, GitFork, Plus, Search } from "lucide-react";
import type { TabDef } from "../store";
const extIcon = (n: string) => {
  if (n.endsWith(".json")) return FileJson;
  if (/\.(ts|tsx|js|jsx|py|rs|go)$/.test(n)) return FileCode2;
  return FileText;
};
export default function FileExplorer({ tabs, activeId, onOpen, onNew, onAddFile, onAddFolder, onAddRepo, folderName }: {
  tabs: TabDef[]; activeId: string; onOpen: (id: string) => void; onNew: () => void;
  onAddFile: () => void; onAddFolder: () => void; onAddRepo: () => void; folderName: string | null;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);
  const filtered = useMemo(() => tabs.filter((t) => t.label.toLowerCase().includes(q.toLowerCase())), [tabs, q]);
  const rootLabel = folderName || "src";
  return (
    <div className="glass" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header">
        <span>Explorer</span>
        <div style={{ display: "flex", gap: 2 }}>
          <button className="icon-btn" style={{ width: 24, height: 24 }} title="New file" onClick={onNew}><Plus size={14} /></button>
          <button className="icon-btn" style={{ width: 24, height: 24 }} title="Add file from disk (Ctrl+O)" onClick={onAddFile}><FileText size={14} /></button>
          <button className="icon-btn" style={{ width: 24, height: 24 }} title="Add folder from disk" onClick={onAddFolder}><FolderPlus size={14} /></button>
          <button className="icon-btn" style={{ width: 24, height: 24 }} title="Add repo from GitHub URL" onClick={onAddRepo}><GitFork size={14} /></button>
        </div>
      </div>
      <div style={{ padding: "10px 10px 0 10px" }}>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 9, top: 9, color: "var(--text-3)" }} />
          <input className="input" style={{ paddingLeft: 28 }} placeholder="Filter files…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div style={{ padding: 8, overflowY: "auto", flex: 1 }}>
        <div className="file-row" style={{ fontWeight: 800 }} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {open ? <FolderOpen size={14} /> : <Folder size={14} />} {rootLabel}
          <span className="badge" style={{ marginLeft: "auto" }}>{filtered.length}</span>
        </div>
        {folderName && (
          <div className="file-row" style={{ fontWeight: 700, color: "var(--text-2)" }}>
            <FolderGit2 size={13} /> {folderName} <span className="badge" style={{ marginLeft: "auto" }}>disk</span>
          </div>
        )}
        {open && (
          <div style={{ marginLeft: 14, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
            {filtered.map((t) => {
              const Icon = extIcon(t.label);
              return (
                <div key={t.id} className={"file-row" + (t.id === activeId ? " active" : "")} onClick={() => onOpen(t.id)} title={t.path || t.label}>
                  <Icon size={14} /> <span style={{ flex: 1 }} className="truncate">{t.label}</span>
                  {t.dirty && <span className="dirty-dot" />}
                </div>
              );
            })}
            {!filtered.length && <div style={{ fontSize: 12, color: "var(--text-3)", padding: 8 }}>No files match.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
