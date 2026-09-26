import { useCallback, useEffect, useState } from "react";
import {
  Check, ChevronDown, ChevronRight, CloudDownload, CloudUpload, GitBranch, GitCommitVertical,
  History, Minus, Plus, RefreshCw, Undo2,
} from "lucide-react";
import { baseName, isDesktop } from "../lib/workspace";
import { showContextMenu } from "../lib/contextMenu";
import { runShell } from "../lib/runner";
import * as scm from "../lib/scm";
import type { GitChange, GitCommitInfo, RepoStatus } from "../lib/scm";

type Props = {
  open: boolean;
  /** Open workspace folders — each gets its own repo group. */
  roots: string[];
  onOpenFile: (absPath: string) => void;
  onToast?: (title: string, body?: string) => void;
};

const emptyStatus = (): RepoStatus => ({
  repo: false, branch: "", upstream: "", ahead: 0, behind: 0,
  remote: "", has_commits: false, detached: false, files: [],
});

const absJoin = (root: string, p: string) =>
  (/^[a-z]:[\\/]|^\//i.test(p) ? p : root.replace(/[\\/]+$/, "") + "/" + p.replace(/\\/g, "/"));

function statusText(c: GitChange): string {
  if (c.untracked) return "Untracked";
  if (c.conflicted) return "Conflicted";
  const s = c.status.trim();
  if (s === "A") return "Added";
  if (s === "D") return "Deleted";
  if (s === "R") return "Renamed";
  if (s === "M") return "Modified";
  return s || "Changed";
}

/**
 * Source control, VS Code shaped: a branch header with ahead/behind + Sync, a
 * commit box, Staged / Changes / Conflicted sections with per-file
 * stage / unstage / discard, and recent history. One group per open folder, so a
 * multi-root workspace can commit to either repo independently.
 */
export default function SourceControl({ open, roots, onOpenFile, onToast }: Props) {
  const [statuses, setStatuses] = useState<Record<string, RepoStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<Record<string, GitCommitInfo[]>>({});
  const [collapsed, setCollapsed] = useState<Record<string, Record<string, boolean>>>({});
  const [showLog, setShowLog] = useState<Record<string, boolean>>({});
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const rootsKey = roots.join("|");

  /** Re-read every open folder. Failures land in `errors`, never in a throw. */
  const refresh = useCallback(async () => {
    const list = isDesktop() ? roots : [];
    if (!list.length) { setStatuses({}); return; }
    setBusy((b) => b || "all");
    const nextStatus: Record<string, RepoStatus> = {};
    const nextErr: Record<string, string> = {};
    await Promise.all(list.map(async (root) => {
      try {
        const s = await scm.status(root);
        nextStatus[root] = s;
        nextErr[root] = s.repo ? "" : "Not a git repository.";
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        nextStatus[root] = emptyStatus();
        const kind = scm.gitErrorKind(msg);
        nextErr[root] = kind === "no-git" ? "git CLI not found on this machine."
          : kind === "no-repo" ? "Not a git repository." : msg;
      }
    }));
    setStatuses(nextStatus);
    setErrors(nextErr);
    await Promise.all(list.map(async (root) => {
      if (!showLog[root] || !nextStatus[root]?.repo) return;
      try {
        const entries = await scm.log(root, 20);
        setLogs((l) => ({ ...l, [root]: entries }));
      } catch { /* no history */ }
    }));
    setBusy(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootsKey, showLog]);

  useEffect(() => { if (open) void refresh(); }, [open, rootsKey]);
  // Stay live while the panel is open, without stomping on a running action.
  useEffect(() => {
    if (!open || !isDesktop()) return;
    const id = window.setInterval(() => { if (!busy) void refresh(); }, 6000);
    return () => window.clearInterval(id);
  }, [open, busy, refresh]);

  /** Run a git action, surface its output, then re-read the status. */
  const act = async (root: string, label: string, fn: () => Promise<string | void>) => {
    setBusy(root);
    try {
      const out = await fn();
      const text = typeof out === "string" ? out.trim() : "";
      if (text) onToast?.(label, text.split("\n").slice(-1)[0].slice(0, 180));
      else onToast?.(label, undefined);
    } catch (e) {
      onToast?.(label + " failed", e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200));
    } finally {
      await refresh();
    }
  };

  const doCommit = async (root: string) => {
    const msg = (msgs[root] || "").trim();
    if (!msg) { onToast?.("Commit message required", "Describe the change first."); return; }
    setBusy(root);
    try {
      await scm.commit(root, msg, true);
      setMsgs((m) => ({ ...m, [root]: "" }));
      onToast?.("Committed to " + baseName(root), msg);
    } catch (e) {
      onToast?.("Commit failed", e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200));
    } finally {
      await refresh();
    }
  };

  if (!open) return null;
  if (!isDesktop()) {
    return (
      <div className="glass">
        <div className="panel-header"><span>Source Control</span></div>
        <div className="panel-body" style={{ fontSize: 11.5, color: "var(--text-2)" }}>Git status needs the desktop app.</div>
      </div>
    );
  }

  /** One changed file: click opens it, the +/- buttons stage it. */
  const fileRow = (root: string, f: GitChange, staged: boolean) => (
    <div
      key={f.path + f.status}
      className={"scm-file" + (f.conflicted ? " conflict" : "")}
      onClick={() => onOpenFile(absJoin(root, f.path))}
      title={`${statusText(f)} · ${root}/${f.path}`}
      onContextMenu={(e) => showContextMenu(e, [
        { label: "Open File", run: () => onOpenFile(absJoin(root, f.path)) },
        { sep: true },
        { label: staged ? "Unstage Changes" : "Stage Changes", run: () => void act(root, staged ? "Unstaged" : "Staged", () => scm.stage(root, [f.path], !staged)) },
        { label: "Discard Changes", danger: true, disabled: f.untracked, run: () => {
            if (window.confirm(`Discard ${statusText(f).toLowerCase()}s to ${f.path}? This cannot be undone.`)) {
              void act(root, "Discarded", () => scm.discard(root, f.path, staged));
            }
          } },
        { sep: true },
        { label: "Copy Path", run: () => void navigator.clipboard?.writeText(f.path) },
        { label: "Copy Full Path", run: () => void navigator.clipboard?.writeText(absJoin(root, f.path)) },
      ], f.path)}
    >
      <span className="scm-badge" style={{ color: scm.statusColor(f.status) }}>{f.status.trim() || "M"}</span>
      <span className="truncate scm-name">{f.path.split("/").pop()}</span>
      <span className="truncate scm-dir">{f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : ""}</span>
      <span className="scm-actions">
        <button className="icon-btn" style={{ width: 18, height: 18 }} title={staged ? "Unstage" : "Stage"}
          onClick={(e) => { e.stopPropagation(); void act(root, staged ? "Unstaged" : "Staged", () => scm.stage(root, [f.path], !staged)); }}>
          {staged ? <Minus size={11} /> : <Plus size={11} />}
        </button>
        {!f.untracked && (
          <button className="icon-btn" style={{ width: 18, height: 18 }} title="Discard changes"
            onClick={(e) => { e.stopPropagation(); if (window.confirm(`Discard changes to ${f.path}?`)) void act(root, "Discarded", () => scm.discard(root, f.path, staged)); }}>
            <Undo2 size={11} />
          </button>
        )}
      </span>
    </div>
  );

  /** A collapsible "Staged Changes (n)" style group. */
  const section = (root: string, title: string, files: GitChange[], staged: boolean, tone?: string) => {
    if (!files.length) return null;
    const isCollapsed = !!collapsed[root]?.[title];
    const toggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCollapsed((c) => ({ ...c, [root]: { ...(c[root] || {}), [title]: !isCollapsed } }));
    };
    return (
      <div className="scm-section">
        <div className="scm-section-head" onClick={toggle}>
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <span style={{ color: tone }}>{title}</span>
          <span className="badge">{files.length}</span>
          <div style={{ flex: 1 }} />
          <button className="icon-btn" style={{ width: 20, height: 20 }} title={staged ? "Unstage all" : "Stage all"}
            onClick={(e) => { e.stopPropagation(); void act(root, staged ? "Unstaged all" : "Staged all", () => scm.stage(root, files.map((f) => f.path), staged ? false : true)); }}>
            {staged ? <Minus size={11} /> : <Plus size={11} />}
          </button>
        </div>
        {!isCollapsed && <div>{files.map((f) => fileRow(root, f, staged))}</div>}
      </div>
    );
  };

  return (
    <div className="glass scm">
      <div className="panel-header">
        <span><GitBranch size={13} style={{ marginRight: 6 }} />Source Control{roots.length > 1 ? ` · ${roots.length} repos` : ""}</span>
        <button className="icon-btn" style={{ width: 22, height: 22 }} title="Refresh" onClick={() => void refresh()}><RefreshCw size={12} /></button>
      </div>
      <div className="panel-body scm-body">
        {!roots.length && <div className="scm-note">{busy ? "Reading git status…" : "Open a workspace folder to use source control."}</div>}
        {roots.map((root) => {
          const s = statuses[root] || emptyStatus();
          const err = errors[root] || "";
          const staged = s.files.filter((f) => f.staged);
          const conflicts = s.files.filter((f) => f.conflicted);
          const changed = s.files.filter((f) => !f.staged && !f.conflicted);
          const repoLog = logs[root] || [];
          return (
            <div key={root} className="scm-repo">
              <div className="scm-repo-head" title={root}>
                {roots.length > 1 && <b className="truncate">{baseName(root)}</b>}
                {s.branch && <span className="badge badge-accent"><GitBranch size={10} /> {s.branch}</span>}
                {s.detached && <span className="badge badge-warn">detached</span>}
                {s.ahead > 0 && <span className="badge" title="commits to push"><CloudUpload size={10} /> {s.ahead}</span>}
                {s.behind > 0 && <span className="badge" title="commits to pull"><CloudDownload size={10} /> {s.behind}</span>}
                {s.upstream && <span className="scm-upstream truncate" title={`upstream: ${s.upstream}`}>{s.upstream}</span>}
                <div style={{ flex: 1 }} />
                <button className="icon-btn" style={{ width: 22, height: 22 }} title="Sync: fetch, fast-forward pull, push"
                  onClick={() => void act(root, "Synced", () => scm.sync(root))}>
                  <RefreshCw size={12} className={busy === root ? "spin" : ""} />
                </button>
                <button className="icon-btn" style={{ width: 22, height: 22 }} title="More git actions"
                  onClick={(e) => showContextMenu(e, [
                    { label: "Commit Staged Only", run: () => void doCommit(root) },
                    { label: "Fetch", run: () => void act(root, "Fetched", () => scm.fetchOnly(root)) },
                    { label: "Push", run: () => void act(root, "Pushed", async () => {
                        const r = await runShell("git push", 60000, undefined, root);
                        if (!r.ok) throw new Error(r.output);
                        return r.output;
                      }) },
                    { sep: true },
                    { label: "New Branch…", run: () => { const n = window.prompt("New branch name:", "feature/"); if (n) void act(root, "Branch created", () => scm.newBranch(root, n)); } },
                    { label: "Add Remote…", run: () => {
                        const url = window.prompt("Remote URL:", "https://github.com/you/repo.git");
                        if (url) void act(root, "Remote added", () => scm.addRemote(root, "origin", url));
                      } },
                    { label: "Unstage All", disabled: !staged.length, run: () => void act(root, "Unstaged all", () => scm.stage(root, staged.map((f) => f.path), false)) },
                    { label: "Discard All Changes", danger: true, disabled: !s.files.length, run: () => {
                        if (!window.confirm(`Discard ALL changes in ${baseName(root)}? This cannot be undone.`)) return;
                        void act(root, "Discarded all", async () => { for (const f of s.files) await scm.discard(root, f.path, f.staged); });
                      } },
                    { sep: true },
                    { label: "Recent History", checked: !!showLog[root], run: () => setShowLog((v) => ({ ...v, [root]: !v[root] })) },
                    { label: "Copy Repo Path", run: () => void navigator.clipboard?.writeText(root) },
                  ], baseName(root))}>
                  <ChevronDown size={12} />
                </button>
              </div>
              {err ? (
                <div className="scm-note">
                  {err}
                  {scm.gitErrorKind(err) === "no-repo" && (
                    <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => void act(root, "Repository created", () => scm.initRepo(root))}>
                      Initialize Repository
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    className="scm-commit" rows={2} placeholder={`Message (${baseName(root)})…`}
                    value={msgs[root] || ""}
                    onChange={(e) => setMsgs((m) => ({ ...m, [root]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void doCommit(root); } }}
                  />
                  <div className="scm-commit-row">
                    <button className="btn btn-primary btn-sm" disabled={busy === root || !s.files.length}
                      onClick={() => void doCommit(root)} title="Stage everything and commit (Ctrl+Enter)">
                      <Check size={12} /> Commit{s.files.length ? ` (${s.files.length})` : ""}
                    </button>
                    {staged.length > 0 && <span className="badge badge-ok">{staged.length} staged</span>}
                    {!s.has_commits && s.files.length > 0 && <span className="badge">first commit</span>}
                  </div>

                  {section(root, "Conflicted", conflicts, false, "#ff5d5d")}
                  {section(root, "Staged Changes", staged, true, "#34d399")}
                  {section(root, "Changes", changed, false)}

                  {!s.files.length && (
                    <div className="scm-note"><Check size={12} style={{ color: "var(--gold)" }} /> Working tree clean</div>
                  )}

                  <button className="scm-history-toggle" onClick={() => setShowLog((v) => ({ ...v, [root]: !v[root] }))}>
                    <History size={12} /> Recent history{showLog[root] ? " (hide)" : ""}
                  </button>
                  {showLog[root] && (
                    <div className="scm-log">
                      {!repoLog.length && <div className="scm-note">No commits yet.</div>}
                      {repoLog.map((c) => (
                        <div key={c.short} className="scm-log-row" title={`${c.author} · ${c.date}`}>
                          <GitCommitVertical size={12} />
                          <span className="scm-sha">{c.short}</span>
                          <span className="truncate" style={{ flex: 1 }}>{c.subject}</span>
                          <span className="scm-log-meta truncate">{c.author} · {c.date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
