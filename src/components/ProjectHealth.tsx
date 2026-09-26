import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Broom, FolderTree, HardDrive, Loader2, RefreshCw, ScanSearch } from "lucide-react";
import type { CleanupReport } from "../lib/housekeeping";
import { cleanupSummary } from "../lib/housekeeping";
import { isDesktop } from "../lib/workspace";

export type Usage = { path: string; total_bytes: number; files: number; top: { name: string; bytes: number }[] };

const human = (n: number) => {
  let v = n;
  for (const u of ["B", "KB", "MB", "GB", "TB"]) {
    if (v < 1024 || u === "TB") return u === "B" ? `${v} B` : `${v.toFixed(1)} ${u}`;
    v /= 1024;
  }
  return `${v.toFixed(1)} TB`;
};

/**
 * Project health: how big the workspace is, what is eating the space, and a
 * button for the housekeeping script. Makes the cleanup feature discoverable
 * instead of hiding it in a menu.
 */
export default function ProjectHealth({ root, cleanup, cleaning, onClean, onPreview, onToast }: {
  root: string | null; cleanup: CleanupReport | null; cleaning: boolean;
  onClean: () => void; onPreview: () => void; onToast: (t: string, b?: string) => void;
}) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(false);

  const scan = async () => {
    if (!root || !isDesktop()) return;
    setBusy(true);
    try {
      setUsage(await invoke<Usage>("workspace_usage", { path: root, limit: 8 }));
    } catch (e: any) {
      onToast("Could not scan the project", String(e?.message || e).slice(0, 160));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { setUsage(null); void scan(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [root]);

  if (!root) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-2)", display: "flex", flexDirection: "column", gap: 8 }}>
        <span>No project open.</span>
        <button className="btn btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("vs-ide:cmd", { detail: "open-folder" }))}>
          Open a folder
        </button>
      </div>
    );
  }

  const max = usage?.top[0]?.bytes || 1;

  return (
    <div className="health">
      <div className="health-head">
        <FolderTree size={13} />
        <span className="truncate" title={root}>{root}</span>
        <button className="icon-btn" style={{ width: 22, height: 22 }} title="Rescan" onClick={() => void scan()}>
          {busy ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
        </button>
      </div>

      <div className="health-stats">
        <div className="health-stat">
          <b>{usage ? human(usage.total_bytes) : busy ? "…" : "—"}</b>
          <span>on disk</span>
        </div>
        <div className="health-stat">
          <b>{usage ? usage.files.toLocaleString() : "—"}</b>
          <span>files</span>
        </div>
        <div className="health-stat">
          <b>{cleanup ? cleanup.freed_human : "—"}</b>
          <span>last clean</span>
        </div>
      </div>

      {usage && usage.top.length > 0 && (
        <div className="health-bars">
          {usage.top.map((t) => (
            <div key={t.name} className="health-bar" title={t.name + " · " + human(t.bytes)}>
              <span className="truncate">{t.name}</span>
              <span className="health-track"><i style={{ width: Math.max(2, (t.bytes / max) * 100) + "%" }} /></span>
              <span className="health-size">{human(t.bytes)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="health-actions">
        <button className="btn btn-sm btn-primary" onClick={onClean} disabled={cleaning} title="Remove build output, stale AI checkpoints and junk">
          {cleaning ? <Loader2 size={12} className="spin" /> : <Broom size={12} />} Clean up
        </button>
        <button className="btn btn-sm btn-ghost" onClick={onPreview} disabled={cleaning} title="See what would be deleted, without deleting it">
          <ScanSearch size={12} /> Preview
        </button>
      </div>

      {cleanup && (
        <div className="health-report" title={cleanup.output}>
          <b>{cleanupSummary(cleanup)}</b>
          {cleanup.steps.filter((s) => s.freed > 0).map((s) => (
            <div key={s.name} className="health-step">
              <span>{s.name}</span><span className="health-size">{human(s.freed)}</span>
            </div>
          ))}
          {cleanup.notes.map((n) => <div key={n} className="health-step"><span>{n}</span></div>)}
          <div className="health-foot"><HardDrive size={10} /> {cleanup.python} · {cleanup.script.split(/[\\/]/).slice(-1)[0]}</div>
        </div>
      )}
    </div>
  );
}
