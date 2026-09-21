import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FilePlus2, RefreshCw } from "lucide-react";
import { currentRoot, isDesktop } from "../lib/workspace";

/** One changed file as reported by the Rust `git_status` command. */
export type GitChange = { path: string; status: string; staged?: boolean };

type Props = {
  open: boolean;                                    // sidebar section visible?
  onOpenFile: (absPath: string) => void;            // click a changed file
  onCommit?: (msg: string) => Promise<void> | void; // commit button
  onToast?: (title: string, body?: string) => void;
};

/**
 * Source Control sidebar: `git status` list + commit box.
 * Reads through the Rust backend (git_status) so no repo files are touched
 * from JS and everything works inside the granted workspace scope.
 */
export default function SourceControl({ open, onOpenFile, onCommit, onToast }: Props) {
  const [changes, setChanges] = useState<GitChange[]>([]);
  const [branch, setBranch] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    if (!open) return;
    setBusy(true); setErr(null);
    const root = currentRoot();
    if (!root || !isDesktop()) { setErr("Open a workspace folder (File → Open folder) to see git status."); setChanges([]); setBranch(""); setBusy(false); return; }
    try {
      const res = await invoke<{ repo: boolean; branch: string; files: GitChange[] }>("git_status", { cwd: root });
      setBranch(res.branch || "");
      setChanges(res.files || []);
      if (!res.repo) setErr("This folder is not a git repository.");
    } catch (e: any) {
      // git missing / not a repo — show a friendly note, never crash the panel.
      const raw = String(e?.message || e);
      setErr(raw.includes("git unavailable") || raw.toLowerCase().includes("fatal") ? "This folder is not a git repository." : raw);
      setChanges([]); setBranch("");
    } finally { setBusy(false); }
  };

  useEffect(() => { void refresh(); }, [open]);

  const commit = async () => {
    if (!msg.trim()) { onToast?.("Commit message required", "Type a message describing the change."); return; }
    setBusy(true);
    try {
      if (onCommit) await onCommit(msg.trim());
      else {
        // Default: stage everything and commit via the shell runner.
        await invoke("run_command", { cmd: `git add -A && git commit -m ${JSON.stringify(msg.trim())}`, cwd: null, timeoutMs: 30000 });
      }
      setMsg("");
      onToast?.("Committed", msg.trim());
      await refresh();
    } catch (e: any) { onToast?.("Commit failed", String(e?.message || e)); }
    finally { setBusy(false); }
  };

  const color = (s: string) =>
    s.includes("A") ? "var(--ok, #7ee2a8)" : s.includes("D") ? "#ff5d5d" : s.includes("R") || s.includes("C") ? "#e9c46a" : "var(--warn, #febc2e)";

  if (!open) return null;
  return (
    <div className="glass" style={{ padding: 0, display: "flex", flexDirection: "column", maxHeight: 420, overflow: "hidden" }}>
      <div className="panel-header">
        <span>Source Control{branch ? ` · ${branch}` : ""}</span>
        <span style={{ display: "flex", gap: 6 }}>
          <button className="icon-btn" style={{ width: 22, height: 22 }} title="Refresh" onClick={refresh}><RefreshCw size={12} /></button>
          <span className="badge">{changes.length ? `${changes.length} changes` : "clean"}</span>
        </span>
      </div>
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input className="input" style={{ flex: 1 }} placeholder="Commit message…" value={msg} onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void commit(); }} />
          <button className="btn btn-primary btn-sm" disabled={busy || !changes.length} onClick={commit} title="Stage all + commit (Ctrl+Enter)">
            <FilePlus2 size={12} /> Commit
          </button>
        </div>
        {err && <div style={{ fontSize: 11, color: "var(--text-2, #8b93a9)" }}>{err}</div>}
        {!err && !changes.length && !busy && <div style={{ fontSize: 11, color: "var(--text-2, #8b93a9)" }}>No changes — working tree clean.</div>}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {changes.map((c) => (
            <button key={c.path + c.status} className="file-row" style={{ justifyContent: "flex-start", textAlign: "left" }}
              onClick={() => onOpenFile(c.path)} title={`Open ${c.path}`}>
              <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: color(c.status), width: 14 }}>{c.status.trim() || "M"}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{c.path}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
