// ---------------------------------------------------------------------------
// Splash screen / project launcher.
//
// Shown before the editor when no project has been chosen yet (or on F1). It
// answers three questions: pick up where I left off, make a new project, or
// browse for an existing folder.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import { Broom, Clock, FolderOpen, FolderPlus, HardDrive, Loader2, Rocket, Sparkles, X } from "lucide-react";
import type { CleanupReport } from "../lib/housekeeping";
import { cleanupSummary } from "../lib/housekeeping";
import { ago, getAutoResume, getHousekeeping, setAutoResume, setHousekeeping, shortPath, type RecentProject } from "../lib/recentProjects";

const TEMPLATES: { id: string; label: string; hint: string }[] = [
  { id: "web", label: "Web (HTML / CSS / JS)", hint: "index.html + styles.css + app.js" },
  { id: "node", label: "Node.js", hint: "package.json + index.js" },
  { id: "python", label: "Python", hint: "main.py + requirements.txt" },
  { id: "react", label: "React + TypeScript", hint: "Vite-style src/ layout" },
  { id: "empty", label: "Empty folder", hint: "just a README and .gitignore" },
];

type Props = {
  recent: RecentProject[];
  desktop: boolean;
  busy?: boolean;
  status?: string;
  cleanupReport?: CleanupReport | null;
  onOpen: (path: string) => void;
  onBrowse: () => void;
  onCreate: (parent: string, name: string, template: string) => void;
  onPickParent: () => Promise<string | null>;
  onSkip: () => void;
  onForget: (path: string) => void;
  onCleanupNow: () => void;
};

export default function SplashScreen({
  recent, desktop, busy, status, cleanupReport, onOpen, onBrowse, onCreate, onPickParent, onSkip, onForget, onCleanupNow,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [parent, setParent] = useState(() => {
    const last = recent[0]?.path;
    if (!last) return "";
    const cut = last.replace(/[\\/]+$/, "").replace(/[\\/][^\\/]+$/, "");
    return cut || last;
  });
  const [template, setTemplate] = useState("web");
  const [autoResume, setAuto] = useState(getAutoResume);
  const [housekeeping, setHouse] = useState(getHousekeeping);

  const last = recent[0] ?? null;
  const canCreate = useMemo(() => name.trim().length > 0 && parent.trim().length > 0, [name, parent]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onSkip(); }
      else if (e.key === "Enter" && creating && canCreate) {
        e.preventDefault();
        onCreate(parent.trim(), name.trim(), template);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip, onCreate, canCreate, creating, parent, name, template]);

  return (
    <div className="overlay splash-overlay" onClick={(e) => { if (e.target === e.currentTarget) onSkip(); }}>
      <div className="glass splash-card" onClick={(e) => e.stopPropagation()}>
        <div className="splash-brand">
          <div className="splash-logo"><Sparkles size={20} /></div>
          <div>
            <h1 className="splash-title">VS-IDE</h1>
            <div className="splash-sub">AI-native code editor · pick a project to begin</div>
          </div>
        </div>

        {last && (
          <button className="glass splash-continue" onClick={() => onOpen(last.path)} disabled={busy}>
            <Clock size={16} />
            <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <b className="truncate" style={{ display: "block" }}>Continue in {last.name}</b>
              <span className="splash-path" title={last.path}>{last.path} · {ago(last.at)}</span>
            </span>
            <span className="btn btn-primary btn-sm">Open</span>
          </button>
        )}

        <div className="splash-actions">
          <button className="btn btn-primary" onClick={onBrowse} disabled={busy}
            title={desktop ? "Pick a folder from disk" : "Only available in the desktop app"}>
            <FolderOpen size={14} /> Open Folder…
          </button>
          <button className="btn" onClick={() => setCreating((v) => !v)} disabled={busy}>
            <FolderPlus size={14} /> New Project…
          </button>
          <button className="btn btn-ghost" onClick={onSkip} disabled={busy}>Continue without a project</button>
        </div>

        {creating && (
          <div className="splash-new">
            <div className="splash-new-grid">
              <label className="splash-field">
                <span>Project name</span>
                <input className="input" autoFocus value={name} placeholder="my-app"
                  onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="splash-field">
                <span>Location (parent folder)</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="input" value={parent} placeholder="C:\Users\me\code"
                    onChange={(e) => setParent(e.target.value)} />
                  <button className="btn btn-sm" title="Browse for the parent folder"
                    onClick={() => void onPickParent().then((p) => { if (p) setParent(p); })}>
                    <FolderOpen size={13} />
                  </button>
                </div>
              </label>
            </div>
            <div className="splash-field">
              <span>Starter template</span>
              <div className="splash-templates">
                {TEMPLATES.map((t) => (
                  <button key={t.id} className={"splash-tpl" + (template === t.id ? " active" : "")}
                    onClick={() => setTemplate(t.id)} title={t.hint}>
                    <b>{t.label}</b>
                    <span>{t.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="splash-new-foot">
              <span className="splash-path">
                Will create <b>{(parent.trim() ? parent.trim().replace(/[\\/]+$/, "") + "\\" : "") + (name.trim() || "…")}</b>
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-sm btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
                <button className="btn btn-sm btn-primary" disabled={!canCreate || busy}
                  onClick={() => onCreate(parent.trim(), name.trim(), template)}>
                  {busy ? <Loader2 size={13} className="spin" /> : <Rocket size={13} />} Create &amp; Open
                </button>
              </div>
            </div>
          </div>
        )}

        {recent.length > 1 && (
          <div className="splash-recent">
            <div className="splash-recent-head">
              <span>Recent projects</span>
              <span className="badge">{recent.length}</span>
            </div>
            {recent.slice(1, 7).map((p) => (
              <div key={p.path} className="splash-row" onClick={() => onOpen(p.path)} title={p.path}>
                <HardDrive size={13} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b className="truncate" style={{ display: "block" }}>{p.name}</b>
                  <span className="splash-path">{shortPath(p.path)} · {ago(p.at)}</span>
                </span>
                <button className="icon-btn" style={{ width: 22, height: 22 }} title="Forget this project"
                  onClick={(e) => { e.stopPropagation(); onForget(p.path); }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}

        <div className="splash-foot">
          <label className="splash-check" title="Skip this screen and open your last project straight away">
            <input type="checkbox" checked={autoResume}
              onChange={(e) => { setAutoResume(e.target.checked); setAuto(e.target.checked); }} />
            <span>Always reopen my last project</span>
          </label>
          <label className="splash-check" title="Runs tools/vs_ide_clean.py in the background on every start">
            <input type="checkbox" checked={housekeeping} disabled={!desktop}
              onChange={(e) => { setHousekeeping(e.target.checked); setHouse(e.target.checked); }} />
            <span>Clean up build junk on startup</span>
          </label>
          <div style={{ flex: 1 }} />
          {(status || cleanupReport) && (
            <span className="splash-status" title={cleanupReport?.output || ""}>
              {busy ? <Loader2 size={12} className="spin" /> : <Broom size={12} />}
              {status || cleanupSummary(cleanupReport ?? null)}
            </span>
          )}
          {desktop && !cleanupReport && (
            <button className="btn btn-sm btn-ghost" onClick={onCleanupNow} title="Run the cleanup script right now">
              <Broom size={12} /> Clean now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
