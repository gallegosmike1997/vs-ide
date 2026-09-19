import { GitFork, Loader2, X } from "lucide-react";
import { useState } from "react";
export default function RepoModal({ open, onClose, onImport, busy }: {
  open: boolean; onClose: () => void; onImport: (url: string) => void; busy: boolean;
}) {
  const [url, setUrl] = useState("https://github.com/");
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header"><span>Add repo from GitHub</span><button className="icon-btn" onClick={onClose}><X size={14} /></button></div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>PUBLIC REPO URL</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" spellCheck={false}
            onKeyDown={(e) => { if (e.key === "Enter") onImport(url); }} />
          <div className="card" style={{ fontSize: 12, color: "var(--text-1)" }}>
            Imports up to ~60 text files via the public GitHub API (no key needed). Private repos are not supported from the browser.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" disabled={busy || !url.trim()} onClick={() => onImport(url)}>
              {busy ? <Loader2 size={13} className="spin" /> : <GitFork size={13} />} Import repo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}