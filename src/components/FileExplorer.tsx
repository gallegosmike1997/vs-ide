import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Eraser, FileCode2, FileJson, FileText, Folder, FolderGit2, FolderOpen, FolderPlus, GitFork, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { TabDef } from "../store";
import { showContextMenu } from "../lib/contextMenu";
const extIcon = (n: string) => {
  if (n.endsWith(".json")) return FileJson;
  if (/\.(ts|tsx|js|jsx|py|rs|go)$/.test(n)) return FileCode2;
  return FileText;
};
const normPath = (p: string) => p.replace(/\\/g, "/").toLowerCase();
export default function FileExplorer({ tabs, activeId, onOpen, onNew, onNewFolder, onDelete, onRename, onAddFile, onAddFolder, onAddRepo, onClean, folderName, roots, onRemoveRoot }: {
  tabs: TabDef[]; activeId: string; onOpen: (id: string) => void; onNew: () => void;
  /** File → New Folder… (workspace only). */
  onNewFolder: () => void;
  /** Right-click → Delete / Rename (App owns the disk + tab bookkeeping). */
  onDelete?: (t: TabDef) => void;
  onRename?: (t: TabDef) => void;
  onAddFile: () => void; onAddFolder: () => void; onAddRepo: () => void;
  /** Right-click on a folder root → run the cleanup script on it. */
  onClean?: () => void;
  folderName: string | null;
  /** Open workspace folders (multi-root). Empty = browser/in-memory mode. */
  roots: string[];
  onRemoveRoot?: (path: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);
  const [closedRoots, setClosedRoots] = useState<Record<string, boolean>>({});
  const filtered = useMemo(() => tabs.filter((t) => t.label.toLowerCase().includes(q.toLowerCase())), [tabs, q]);
  const rootLabel = folderName || "src";

  /** Right-click on a file row. */
  const fileMenu = (e: React.MouseEvent, t: TabDef) => {
    showContextMenu(e, [
      { label: "Open", hint: "Enter", run: () => onOpen(t.id) },
      { sep: true },
      { label: "Copy Full Path", command: "copy-path", run: () => void navigator.clipboard?.writeText(t.absPath || t.label) },
      { label: "Copy File Name", icon: <Copy size={13} />, run: () => void navigator.clipboard?.writeText(t.label.split("/").pop() || t.label) },
      { label: "Reveal in File Explorer", command: "reveal-file" },
      { sep: true },
      { label: "New File", command: "new-file", run: onNew },
      { label: "New Folder…", command: "new-folder", run: onNewFolder },
      { sep: true },
      { label: "Ask AI to Explain", command: "explain" },
      { label: "Ask AI to Fix", command: "fix" },
      { sep: true },
      { label: "Rename…", icon: <Pencil size={13} />, disabled: !onRename, run: () => onRename?.(t) },
      { label: "Delete", icon: <Trash2 size={13} />, danger: true, disabled: !t.absPath && !onDelete, run: () => onDelete?.(t) },
    ], t.label);
  };

  /** Right-click on a folder header. */
  const rootMenu = (e: React.MouseEvent, root: string) => {
    const only = roots.length <= 1;
    showContextMenu(e, [
      { label: "New File", command: "new-file", run: onNew },
      { label: "New Folder…", command: "new-folder", run: onNewFolder },
      { sep: true },
      { label: "Add File from Disk…", command: "open-file", run: onAddFile },
      { label: "Add Another Folder…", command: "open-folder", run: onAddFolder },
      { label: "Add Repo from GitHub…", command: "open-repo", run: onAddRepo },
      { sep: true },
      { label: "Copy Folder Path", icon: <Copy size={13} />, run: () => void navigator.clipboard?.writeText(root) },
      { label: "Reveal in File Explorer", command: "reveal-file" },
      { label: "Clean Up Build Junk", icon: <Eraser size={13} />, run: () => onClean?.() },
      { sep: true },
      { label: "Close This Folder", danger: true, disabled: !onRemoveRoot, hint: only ? "last one" : "", run: () => onRemoveRoot?.(root) },
    ], root);
  };

  /** Right-click on the empty part of the tree. */
  const blankMenu = (e: React.MouseEvent) => {
    showContextMenu(e, [
      { label: "New File", command: "new-file", run: onNew },
      { label: "New Folder…", command: "new-folder", run: onNewFolder },
      { sep: true },
      { label: "Add File from Disk…", command: "open-file", run: onAddFile },
      { label: "Add Folder to Workspace…", command: "open-folder", run: onAddFolder },
      { label: "Add Repo from GitHub…", command: "open-repo", run: onAddRepo },
      { sep: true },
      { label: "Project Launcher…", command: "splash" },
    ], "Explorer");
  };
  // Multi-root: group open tabs under the folder they physically live in.
  const sections = useMemo(() => roots.map((r) => {
    const nr = normPath(r);
    return { root: r, name: r.split(/[\\/]/).filter(Boolean).pop() || r, tabs: filtered.filter((t) => t.absPath && normPath(t.absPath).startsWith(nr + "/")) };
  }), [roots, filtered]);
  const rootedIds = useMemo(() => new Set(sections.flatMap((s) => s.tabs.map((t) => t.id))), [sections]);
  const loose = useMemo(() => filtered.filter((t) => !rootedIds.has(t.id)), [filtered, rootedIds]);
  const multi = roots.length > 0;
  const listRows = (rows: TabDef[]) => (
    <div style={{ marginLeft: 14, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
      {rows.map((t) => {
        const Icon = extIcon(t.label);
        return (
          <div key={t.id} className={"file-row" + (t.id === activeId ? " active" : "")} onClick={() => onOpen(t.id)} onContextMenu={(e) => fileMenu(e, t)} title={t.path || t.label}>
            <Icon size={14} /> <span style={{ flex: 1 }} className="truncate">{t.label}</span>
            {t.dirty && <span className="dirty-dot" />}
          </div>
        );
      })}
      {!rows.length && <div style={{ fontSize: 12, color: "var(--text-3)", padding: 8 }}>No files match.</div>}
    </div>
  );
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
      <div style={{ padding: 8, overflowY: "auto", flex: 1 }} onContextMenu={blankMenu}>
        {multi ? (
          <>
            {roots.length > 1 && (
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", padding: "4px 6px 6px" }}>
                {roots.length} folders open
              </div>
            )}
            {sections.map((s) => {
              const isOpen = !closedRoots[s.root];
              return (
                <div key={s.root} style={{ marginBottom: 6 }}>
                  <div className="file-row" style={{ fontWeight: 800 }} onClick={() => setClosedRoots((p) => ({ ...p, [s.root]: isOpen }))} onContextMenu={(e) => rootMenu(e, s.root)}>
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />} <span className="truncate">{s.name}</span>
                    <span className="badge" style={{ marginLeft: "auto" }}>{s.tabs.length}</span>
                    {roots.length > 1 && onRemoveRoot && (
                      <button
                        className="icon-btn"
                        style={{ width: 18, height: 18, marginLeft: 4 }}
                        title={"Close " + s.name + " (keeps the other folder open)"}
                        onClick={(e) => { e.stopPropagation(); onRemoveRoot(s.root); }}
                      ><X size={12} /></button>
                    )}
                  </div>
                  {isOpen && listRows(s.tabs)}
                </div>
              );
            })}
            {roots.length === 1 && (
              <div className="file-row" style={{ fontWeight: 700, color: "var(--text-2)" }}>
                <FolderGit2 size={13} /> {roots[0]} <span className="badge" style={{ marginLeft: "auto" }}>disk</span>
              </div>
            )}
            {loose.length > 0 && (
              <>
                <div className="file-row" style={{ fontWeight: 700, color: "var(--text-2)", marginTop: 6 }}>
                  <FileText size={13} /> Other files <span className="badge" style={{ marginLeft: "auto" }}>{loose.length}</span>
                </div>
                {listRows(loose)}
              </>
            )}
            {!filtered.length && <div style={{ fontSize: 12, color: "var(--text-3)", padding: 8 }}>No files match.</div>}
          </>
        ) : (
          <>
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
            {open && listRows(filtered)}
          </>
        )}
      </div>
    </div>
  );
}
