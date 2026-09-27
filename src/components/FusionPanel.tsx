import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Combine, FolderPlus, History, ImagePlus, Loader2, Package, Play, RefreshCw, Rocket, ShieldAlert, ShieldCheck, Sparkles, Trash2, WifiOff, X } from "lucide-react";
import type { AgentMode, TabDef } from "../store";
import { type FusionStrategy, type RootScan, analyzeFusion, asPair, blueprintEdit, buildFusionPrompt, buildRetryPrompt, clearFusionHistory, expectedPaths, loadFusionHistory, loadImageThumb, previewFusion, reconcilePlan, recordFusion, scanImportedFolder, scanWorkspaceProjects, verifyFusion, type FusionDrift, type FusionPreview, type FusionRecord, type FusionVerifyReport } from "../lib/fusion";
import { runFusionLauncher, type ExecCheck } from "../lib/fusionExec";
import { isDesktop } from "../lib/workspace";
import { parseAiEdits, type AiEdit } from "../lib/aiEdits";
import { useLLMCall } from "../lib/aiClient";

/** How many problems a retry would try to fix — drives the button label. */
function failedChecks(report: FusionVerifyReport | null, drift: FusionDrift | null): number {
  const failed = (report?.checks || []).filter((c) => c.status === "fail" || c.status === "warn").length;
  const driftIssues = (drift?.missing.length ? 1 : 0) + (drift?.unplannedOverwrites.length ? 1 : 0) + (drift?.unexpected.length ? 1 : 0);
  return failed + driftIssues;
}

/**
 * Project fusion — load two workspace folders, show both inventories plus an
 * image gallery (project screenshots + attached references like an architecture
 * diagram), pick a combine strategy and generate the merge plan.
 *
 * Files are NEVER written here: everything goes through onPlan → showPlan →
 * AIApplyModal, where the pre-save verification gate runs first (same
 * discipline as BuildPanel). The blueprint path needs no AI at all.
 */
export default function FusionPanel({ roots, tabs, agentMode, onToast, onPlan, ensureOnline, onAddRoot }: {
  roots: string[];
  tabs: TabDef[];
  agentMode: AgentMode;
  onToast: (t: string, b?: string) => void;
  onPlan: (reply: string, edits: AiEdit[], task: string) => void;
  ensureOnline: () => Promise<boolean>;
  onAddRoot: () => void;
}) {
  const [scans, setScans] = useState<RootScan[]>([]);
  const [busy, setBusy] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [attached, setAttached] = useState<{ name: string; url: string }[]>([]);
  const [mode, setMode] = useState<FusionStrategy | "blueprint">("bridge");
  // Which of the N scanned projects play host and source. Indices into `scans`
  // rather than reordering the array, so picking a different pair from three or
  // more open folders never disturbs the workspace root order.
  const [hostIdx, setHostIdx] = useState(0);
  const [sourceIdx, setSourceIdx] = useState(1);
  // ---- Dry-run preview: what this fusion would touch, before any AI request ----
  const [preview, setPreview] = useState<FusionPreview | null>(null);
  // Explicit confirmation when the preview predicts an overwrite.
  const [ackRisk, setAckRisk] = useState(false);
  // ---- Post-fusion verification: fresh re-scan + on-disk checks ----
  const [report, setReport] = useState<FusionVerifyReport | null>(null);
  const [verifying, setVerifying] = useState(false);
  // ---- Plan drift: predicted vs actually produced ----
  const [drift, setDrift] = useState<FusionDrift | null>(null);
  // ---- Retry: the last attempt, so a failure can be fed back to the model ----
  const [lastAttempt, setLastAttempt] = useState<{ prompt: string; files: number } | null>(null);
  // ---- Execution check: actually run the generated launcher ----
  const [exec, setExec] = useState<ExecCheck | null>(null);
  const [running, setRunning] = useState(false);
  // ---- History of past fusions ----
  const [history, setHistory] = useState<FusionRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { loading, run } = useLLMCall();
  const locked = agentMode !== "do";
  const rootsKey = roots.join("|");
  const ownedUrls = useRef<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  /** Rescan both folders and load a handful of image thumbnails. */
  const refresh = useCallback(async () => {
    if (!isDesktop()) return; // browser mode: scans come from folder imports instead
    setBusy(true);
    try {
      const s = await scanWorkspaceProjects();
      setScans(s);
      const next: Record<string, string> = {};
      for (const img of s.flatMap((x) => x.images).slice(0, 8)) {
        const url = await loadImageThumb(img.abs);
        if (url) { next[img.abs] = url; ownedUrls.current.push(url); }
      }
      setThumbs(next);
    } finally { setBusy(false); }
  }, [rootsKey]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => () => { ownedUrls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);
  // History lives in localStorage, so it is read once when the panel opens.
  useEffect(() => { setHistory(loadFusionHistory()); }, []);
  // A different host/source pair invalidates everything derived from the old one.
  useEffect(() => { setPreview(null); setAckRisk(false); setDrift(null); setReport(null); setExec(null); }, [hostIdx, sourceIdx]);

  function attachFiles(files: FileList | null) {
    if (!files?.length) return;
    const added: { name: string; url: string }[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(f);
      ownedUrls.current.push(url);
      added.push({ name: f.name, url });
    }
    if (added.length) setAttached((p) => [...p, ...added]);
    else onToast("No images", "Pick PNG/JPG/WebP screenshots or diagrams.");
  }

  /** Browser mode: scan a picked folder (webkitdirectory input) into a RootScan. */
  async function importFolder(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const list = Array.from(files);
      const folder = (list[0].webkitRelativePath || "").split("/")[0] || list[0].name || "imported";
      if (scans.some((s) => s.name === folder)) { onToast("Already imported", folder + " is already in the list below."); return; }
      const scan = await scanImportedFolder(list, folder);
      if (!scan.total) { onToast("No text files", "That folder had no importable text files."); return; }
      const next = [...scans, scan].slice(0, 2);
      setScans(next);
      const add: Record<string, string> = {};
      for (const img of next.flatMap((x) => x.images).slice(0, 8)) {
        const url = await loadImageThumb(img.abs);
        if (url) { add[img.abs] = url; ownedUrls.current.push(url); }
      }
      setThumbs((t) => ({ ...t, ...add }));
      onToast("Imported " + folder, scan.total + " file(s) · " + scan.manifests.length + " manifest(s) found.");
    } catch (e: any) {
      onToast("Import failed", String(e?.message || e).slice(0, 180));
    } finally { setBusy(false); }
  }

  /** Remove a browser import (revokes its object URLs + thumbnails). */
  function removeImport(root: string) {
    const gone = scans.find((s) => s.root === root);
    if (!gone) return;
    const absSet = new Set(gone.images.map((i) => i.abs));
    for (const u of absSet) {
      if (u.startsWith("blob:")) { try { URL.revokeObjectURL(u); } catch { /* already revoked */ } }
      ownedUrls.current = ownedUrls.current.filter((x) => x !== u);
    }
    setThumbs((t) => { const n = { ...t }; for (const k of Object.keys(n)) if (absSet.has(k)) delete n[k]; return n; });
    setScans((prev) => prev.filter((s) => s.root !== root));
  }

  function guard(): boolean {
    if (!pair) {
      onToast(
        isDesktop() ? "Pick a host and a source" : "Pick two project folders",
        scans.length < 2
          ? (isDesktop()
            ? "File → Add Folder to Workspace… — open this app plus at least one other project."
            : "Use “Import project folder” below to add a second project.")
          : "Choose two DIFFERENT projects — a project cannot be fused into itself."
      );
      return false;
    }
    if (locked) {
      onToast(agentMode === "idea" ? "Idea mode" : "Think mode", "Combining writes files — switch Mode → Do (top toolbar) first.");
      return false;
    }
    return true;
  }

  /** Dry run: predict the touched paths. Costs nothing and runs no AI. */
  function dryRun() {
    if (!pair) { onToast("Pick a host and a source", "The preview needs two different projects."); return; }
    setPreview(previewFusion(mode, pair));
    setAckRisk(false);
  }

  /**
   * Verify a fusion that has already been applied. Re-scans from disk first —
   * verifying against the pre-apply snapshot would report on the old state and
   * wrongly fail a merge that actually worked.
   */
  async function verify() {
    if (!isDesktop()) { onToast("Desktop app only", "Verification reads the project folders from disk."); return; }
    if (!pair) { onToast("Pick a host and a source", "Verification compares two projects."); return; }
    setVerifying(true);
    setReport(null);
    setExec(null);
    try {
      const fresh = await scanWorkspaceProjects();
      const hostRoot = pair[0].root, sourceRoot = pair[1].root;
      const host = fresh.find((s) => s.root === hostRoot);
      const source = fresh.find((s) => s.root === sourceRoot);
      if (!host || !source) { onToast("Re-scan needed", "One of the two folders is no longer open — press refresh."); return; }
      const freshPair: [RootScan, RootScan] = [host, source];
      const planned = expectedPaths(mode, host, source).map((w) => w.path);
      const rep = verifyFusion(freshPair, planned);
      setReport(rep);
      // recordFusion returns the new list, so the history stays in sync.
      setHistory(recordFusion({
        at: Date.now(), host: host.root, source: source.root,
        hostName: host.name, sourceName: source.name, strategy: mode, outcome: rep.verdict,
      }));
      onToast(
        rep.verdict === "pass" ? "Fusion verified" : rep.verdict === "warn" ? "Verified with warnings" : "Verification failed",
        rep.pass + " passed · " + rep.fail + " failed",
      );
    } catch (e: any) {
      onToast("Verification failed to run", String(e?.message || e).slice(0, 180));
    } finally { setVerifying(false); }
  }

  /**
   * Actually execute the launcher the fusion generated and report the exit code.
   * This is the one place fusion runs something, and it is always user-initiated.
   */
  async function runLauncher() {
    if (!pair) { onToast("Pick a host and a source", "Nothing to run yet."); return; }
    setRunning(true);
    setExec(null);
    try {
      const r = await runFusionLauncher(mode, pair[0]);
      setExec(r);
    } finally { setRunning(false); }
  }

  /** Re-run generation, feeding the previous failure back as constraints. */
  async function retry() {
    if (!guard() || busy || loading || !lastAttempt) return;
    if (!(await ensureOnline())) return;
    setBusy(true);
    try {
      // The retry prompt carries the same hard rules plus what actually failed.
      const reply = await run(buildRetryPrompt(lastAttempt.prompt, report, drift));
      const edits = parseAiEdits(reply);
      if (!edits.length) { onToast("No file edits returned", String(reply).slice(0, 180)); return; }
      setDrift(reconcilePlan(mode, pair!, edits.map((e) => e.file)));
      onPlan(reply, edits, "Project fusion · retry after failure");
    } catch (e: any) {
      onToast("Retry failed", String(e?.message || e).slice(0, 200));
    } finally { setBusy(false); }
  }

  /** One entry point: offline blueprint or AI plan, both through onPlan. */
  async function generate() {
    if (!guard() || busy || loading || !pair) return;
    // A predicted overwrite must be acknowledged before an AI request is spent.
    if (preview && preview.verdict !== "safe" && !ackRisk) {
      onToast("Overwrite predicted", "Review the dry-run list, then tick the confirm box to continue.");
      return;
    }
    const names = attached.map((x) => x.name);
    if (mode === "blueprint") {
      onPlan("Offline blueprint — FUSION.md (no AI used).", [blueprintEdit(pair, names)], "Project fusion · offline blueprint");
      setLastAttempt(null);
      return;
    }
    if (!(await ensureOnline())) return;
    setBusy(true);
    try {
      const prompt = buildFusionPrompt(mode, pair, names);
      const reply = await run(prompt);
      const edits = parseAiEdits(reply);
      if (!edits.length) { onToast("No file edits returned", String(reply).slice(0, 180)); return; }
      // Reconcile what was planned against what the model actually produced, so
      // off-plan writes are visible in the review dialog rather than a surprise.
      setDrift(reconcilePlan(mode, pair, edits.map((e) => e.file)));
      setLastAttempt({ prompt, files: edits.length });
      const how = mode === "bridge" ? "bridge B → A" : mode === "vendor" ? "vendor B → A" : "offline scaffold";
      onPlan(reply, edits, "Project fusion · " + how);
    } catch (e: any) {
      onToast("Fusion request failed", String(e?.message || e).slice(0, 200));
    } finally { setBusy(false); }
  }

  const a = scans[hostIdx];
  const b = scans[sourceIdx];
  const work = busy || loading;
  /**
   * A is the host that receives the output, B is the capability source. With more
   * than two folders open the user picks the pair explicitly rather than getting
   * whatever order the workspace roots happen to be in — fusing in the opposite
   * direction is a completely different plan, so this must be a real choice.
   */
  const pair = asPair(scans, hostIdx, sourceIdx);
  const swap = () => { setHostIdx(sourceIdx); setSourceIdx(hostIdx); setPreview(null); setDrift(null); };
  const STRATEGIES: { id: FusionStrategy | "blueprint"; icon: any; title: string; desc: string }[] = [
    { id: "bridge", icon: Combine, title: a && b ? `Bridge ${b.name} → ${a.name}` : "Bridge B → A", desc: "Wire the second project's AI pipeline into this app as a callable module — AI plans thin adapter files." },
    { id: "vendor", icon: Package, title: a && b ? `Vendor ${b.name} into ${a.name}/vendor` : "Vendor B inside A", desc: "Generated sync scripts copy B into A's vendor/ folder at build time — one offline launcher runs both, no network." },
    { id: "monorepo", icon: Sparkles, title: "Fusion scaffold", desc: "Offline launcher, shared config and docs so both halves run as one tool — AI plans the edits." },
    { id: "blueprint", icon: WifiOff, title: "FUSION.md blueprint", desc: "Deterministic: both trees, stats, images, fit check and a 5-step roadmap in one markdown file. No AI needed." },
  ];
  return (
    <div className="glass" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header">
        <span><Combine size={12} style={{ marginRight: 6 }} />Project Fusion</span>
        <span className={"badge " + (pair ? "badge-ok" : "")}>{scans.length} project{scans.length === 1 ? "" : "s"}{roots.length > 1 ? ` · ${roots.length} folders` : ""}</span>
        {history.length > 0 && (
          <button
            className="btn btn-sm btn-ghost"
            style={{ marginLeft: 8, padding: "2px 8px", fontSize: 10.5 }}
            onClick={() => setShowHistory((v) => !v)}
            title={`${history.length} previous fusion(s) on this machine`}
          >
            <History size={12} /> {history.length}
          </button>
        )}
        {scans.length >= 2 && (
          <button
            className="btn btn-sm btn-ghost"
            style={{ marginLeft: 8, padding: "2px 8px", fontSize: 10.5 }}
            onClick={swap}
            disabled={work}
            title={`Swap the host and the source: make ${b?.name} the host and ${a?.name} the capability source`}
          >
            <ArrowLeftRight size={12} /> Swap A/B
          </button>
        )}
      </div>
      {showHistory && (
        <div className="card" style={{ margin: "8px 10px 0", padding: 9, display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <b style={{ fontSize: 12 }}>Fusion history</b>
            <button
              className="icon-btn" style={{ width: 18, height: 18, marginLeft: "auto" }}
              title="Clear history"
              onClick={() => { clearFusionHistory(); setHistory([]); }}
            ><Trash2 size={11} /></button>
            <button className="icon-btn" style={{ width: 18, height: 18 }} title="Dismiss" onClick={() => setShowHistory(false)}><X size={11} /></button>
          </div>
          {history.map((h, i) => {
            const tone = h.outcome === "pass" ? "#34d399" : h.outcome === "fail" ? "var(--danger, #ff6b6b)" : h.outcome === "warn" ? "#febc2e" : "var(--text-3)";
            return (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "baseline", fontSize: 11, minWidth: 0 }}>
                <span style={{ color: tone, fontWeight: 800, fontFamily: "var(--mono)", fontSize: 9 }}>[{h.outcome || "none"}]</span>
                <span className="truncate" title={h.host + " ← " + h.source} style={{ minWidth: 0 }}>
                  {h.sourceName} → {h.hostName} <span style={{ color: "var(--text-3)" }}>({h.strategy})</span>
                </span>
                <span style={{ marginLeft: "auto", color: "var(--text-3)", fontSize: 10, flexShrink: 0 }}>{new Date(h.at).toLocaleDateString()}</span>
              </div>
            );
          })}
        </div>
      )}
      {scans.length >= 2 && (
        <div style={{ padding: "8px 10px 0", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>Fuse</span>
          <select className="input" style={{ width: "auto", flex: 1, minWidth: 0, padding: "3px 6px", fontSize: 11.5 }} value={hostIdx} title="Host — receives every output file" onChange={(e) => setHostIdx(Number(e.target.value))}>
            {scans.map((s, i) => <option key={s.root} value={i} disabled={i === sourceIdx}>{s.name} (host)</option>)}
          </select>
          <ArrowLeftRight size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
          <select className="input" style={{ width: "auto", flex: 1, minWidth: 0, padding: "3px 6px", fontSize: 11.5 }} value={sourceIdx} title="Source — contributes the capabilities" onChange={(e) => setSourceIdx(Number(e.target.value))}>
            {scans.map((s, i) => <option key={s.root} value={i} disabled={i === hostIdx}>{s.name} (source)</option>)}
          </select>
        </div>
      )}
      <div style={{ padding: "10px 10px 0", fontSize: 11.5, color: "var(--text-2)", lineHeight: 1.5 }}>
        Two projects in → one offline tool out. Output lands in project A after review + verification.
      </div>
      <div style={{ padding: 10, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {work && !scans.length && (
          <div className="card" style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}><Loader2 size={13} className="spin" /> Scanning projects…</div>
        )}
        {scans.map((s, i) => {
          const nr = s.root.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") + "/";
          const openInRoot = tabs.filter((t) => t.absPath && t.absPath.replace(/\\/g, "/").toLowerCase().startsWith(nr)).length;
          return (
          <div key={s.root} className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <span className={"badge " + (i === 0 ? "badge-accent" : "")}>{i === 0 ? "A · host" : "B · source"}</span>
              <b style={{ fontSize: 12.5 }} className="truncate">{s.name}</b>
              {!roots.includes(s.root) && (
                <button
                  className="icon-btn" style={{ width: 20, height: 20, marginLeft: "auto", flexShrink: 0 }}
                  title={`Remove import ${s.name}`}
                  onClick={() => removeImport(s.root)}
                ><X size={12} /></button>
              )}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-3)" }} className="truncate" title={s.root}>{s.root}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <span className="badge">{s.total} files</span>
              <span className="badge">{openInRoot} open</span>
              {s.manifests.slice(0, 3).map((m) => <span key={m} className="badge badge-ok">{m}</span>)}
              {!s.manifests.length && <span className="badge">no manifest</span>}
              {s.entry && (
                <span className="badge badge-accent truncate" style={{ maxWidth: 190 }} title={`Entry point: ${s.entry}`}>▶ {s.entry}</span>
              )}
              {s.deps.slice(0, 4).map((d) => (
                <span key={d} className="badge" title="Dependency parsed from a manifest">{d}</span>
              ))}
              {s.deps.length > 4 && <span className="badge">+{s.deps.length - 4} deps</span>}
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)", lineHeight: 1.6, minWidth: 0 }}>
              {s.files.slice(0, 5).map((f) => <div key={f} className="truncate" title={f}>{f}</div>)}
              {s.files.length > 5 && <div style={{ color: "var(--text-3)" }}>… {s.files.length - 5} more</div>}
            </div>
          </div>
          );
        })}
        {pair && (() => {
          const fit = analyzeFusion(pair);
          const warn = fit.findings.some((f) => f.kind === "warn");
          const tone = (k: string) => (k === "ok" ? "#34d399" : k === "warn" ? "#febc2e" : "var(--accent, #4169e1)");
          return (
            <div className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
                Offline fit check
                <span style={{ marginLeft: 8, letterSpacing: 0, textTransform: "none", fontWeight: 700, fontSize: 11, color: warn ? "#febc2e" : "#34d399" }}>{fit.verdict}</span>
              </div>
              {fit.findings.map((f, i) => (
                <div key={i} style={{ fontSize: 11, display: "flex", gap: 6, lineHeight: 1.45, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: tone(f.kind), flexShrink: 0, textTransform: "uppercase", fontWeight: 800, marginTop: 1 }}>[{f.kind}]</span>
                  <span style={{ color: "var(--text-2)" }}>{f.text}</span>
                </div>
              ))}
              {fit.collisions.length > 0 && (
                <div style={{ marginTop: 3, paddingTop: 6, borderTop: "1px solid var(--line, rgba(255,255,255,0.08))" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#febc2e", marginBottom: 3 }}>
                    Overlapping paths — would overwrite
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)", display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {fit.collisions.map((c) => (
                      <span key={c} className="badge" style={{ color: "#febc2e" }} title={c}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {scans.length < 2 && (
          <div className="card" style={{ padding: 12, borderStyle: "dashed", textAlign: "center", display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            <FolderPlus size={18} color="var(--gold)" />
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>
              {isDesktop()
                ? <>Open your <b>second</b> project folder (e.g. Super-AI-Stack) to unlock fusion.</>
                : <>Import {scans.length ? <><b>your second</b></> : "your"} project folder{scans.length ? "" : "s"} (this app, then Super-AI-Stack) — works fully in the browser.</>}
            </div>
            {isDesktop() ? (
              <button className="btn btn-sm btn-primary" onClick={onAddRoot}><FolderPlus size={13} /> Add Folder to Workspace…</button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={() => importRef.current?.click()}><FolderPlus size={13} /> Import project folder…</button>
            )}
            <input
              ref={importRef}
              type="file" multiple style={{ display: "none" }}
              {...{ webkitdirectory: "", directory: "" } as any}
              onChange={(e) => { void importFolder(e.target.files); e.target.value = ""; }}
            />
          </div>
        )}
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", display: "flex", alignItems: "center", gap: 6 }}>
          Project images
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto", padding: "2px 8px", fontSize: 10.5 }} onClick={() => fileRef.current?.click()}>
            <ImagePlus size={12} /> Attach
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { attachFiles(e.target.files); e.target.value = ""; }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {Object.entries(thumbs).map(([abs, url]) => (
            <div key={abs} title={abs} style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", background: "rgba(0,0,0,0.3)" }}>
              <img src={url} alt={abs} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, fontSize: 9, padding: "2px 4px", background: "rgba(0,0,0,0.62)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{abs.split(/[\\/]/).pop()}</span>
            </div>
          ))}
          {attached.map((x) => (
            <div key={x.url} title={x.name} style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 8, overflow: "hidden", border: "1px solid var(--gold)", background: "rgba(0,0,0,0.3)" }}>
              <img src={x.url} alt={x.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, fontSize: 9, padding: "2px 4px", background: "rgba(122,15,43,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</span>
            </div>
          ))}
        </div>
        {!Object.keys(thumbs).length && !attached.length && (
          <div style={{ fontSize: 11.5, color: "var(--text-3)", lineHeight: 1.5 }}>
            No images found in either project — attach your architecture screenshots (diagrams, mockups) for context.
          </div>
        )}
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Combine strategy</div>
        {STRATEGIES.map((s) => {
          const on = mode === s.id;
          return (
            <div
              key={s.id}
              onClick={() => setMode(s.id)}
              className="card"
              style={{
                padding: 9, cursor: "pointer", display: "flex", gap: 8, alignItems: "flex-start", minWidth: 0,
                borderColor: on ? "var(--gold)" : undefined,
                boxShadow: on ? "0 0 10px var(--maroon-glow)" : undefined,
              }}
            >
              <s.icon size={14} style={{ marginTop: 1, flexShrink: 0, color: on ? "var(--gold)" : "var(--text-2)" }} />
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 12 }}>{s.title}</b>
                <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.45 }}>{s.desc}</div>
              </div>
            </div>
          );
        })}
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            disabled={work || !pair}
            title={locked ? "Switch to Do mode (top toolbar) — combining writes files" : "Opens the review dialog; nothing is written before verification"}
            onClick={() => void generate()}
          >
            {work ? <Loader2 size={13} className="spin" /> : <Rocket size={13} />} Generate fusion plan →
          </button>
          <button className="btn btn-sm" disabled={work} title="Re-scan both folders" onClick={() => void refresh()}>
            <RefreshCw size={13} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn btn-sm" style={{ flex: 1 }}
            disabled={work || !pair}
            onClick={dryRun}
            title="Predict exactly which files this fusion would create or overwrite — free, offline, no AI call"
          >
            <ShieldCheck size={13} /> Dry run
          </button>
          <button
            className="btn btn-sm" style={{ flex: 1 }}
            disabled={work || verifying || !pair}
            onClick={() => void verify()}
            title="Re-scan from disk and check the fusion actually landed — offline, no AI call"
          >
            {verifying ? <Loader2 size={13} className="spin" /> : <ShieldCheck size={13} />} Verify
          </button>
          <button
            className="btn btn-sm" style={{ flex: 1 }}
            disabled={work || running || !pair}
            onClick={() => void runLauncher()}
            title="Run the launcher this fusion generated and report its exit code — the only thing here that executes code"
          >
            {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />} Run
          </button>
        </div>
        {lastAttempt && (
          <button
            className="btn btn-sm"
            style={{ width: "100%" }}
            disabled={work || !lastAttempt}
            onClick={() => void retry()}
            title={report || drift ? "Re-run generation, telling the model exactly which checks failed" : "Re-run generation with the same prompt"}
          >
            <RefreshCw size={13} /> Retry{failedChecks(report, drift) ? ` — fix ${failedChecks(report, drift)} problem${failedChecks(report, drift) === 1 ? "" : "s"}` : ""}
          </button>
        )}
        {drift && (() => {
          const tone = drift.verdict === "as-planned" ? "#34d399" : drift.verdict === "drift" ? "#febc2e" : "var(--danger, #ff6b6b)";
          return (
            <div className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 5, borderColor: tone }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <b style={{ fontSize: 12 }}>Plan vs actual</b>
                <span className="badge" style={{ marginLeft: "auto", color: tone }}>{drift.verdict}</span>
                <button className="icon-btn" style={{ width: 18, height: 18 }} title="Dismiss" onClick={() => setDrift(null)}><X size={11} /></button>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.45 }}>{drift.summary}</div>
              {drift.unplannedOverwrites.length > 0 && (
                <div style={{ fontSize: 11, color: "var(--danger, #ff6b6b)", lineHeight: 1.45 }}>
                  <b>Unannounced overwrites:</b> {drift.unplannedOverwrites.join(", ")}
                </div>
              )}
              {drift.missing.length > 0 && (
                <div style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.45 }}>
                  <b style={{ color: "var(--text-2)" }}>Predicted but not produced:</b> {drift.missing.join(", ")}
                </div>
              )}
              {drift.unexpected.length > 0 && (
                <div style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.45 }}>
                  <b style={{ color: "var(--text-2)" }}>Extra files:</b> {drift.unexpected.join(", ")}
                </div>
              )}
            </div>
          );
        })()}
        {exec && (() => {
          const tone = exec.status === "ran" ? (exec.code === 0 ? "#34d399" : "var(--danger, #ff6b6b)") : "var(--text-3)";
          return (
            <div className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 5, borderColor: tone }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <b style={{ fontSize: 12 }}>Execution check</b>
                <span className="badge" style={{ marginLeft: "auto", color: tone }}>{exec.status === "ran" ? "exit " + exec.code : exec.status}</span>
                <button className="icon-btn" style={{ width: 18, height: 18 }} title="Dismiss" onClick={() => setExec(null)}><X size={11} /></button>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.45 }}>{exec.detail}</div>
              {exec.command && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--text-3)", wordBreak: "break-all" }}>{exec.command}</div>}
              {exec.output && (
                <pre style={{ margin: 0, padding: 6, background: "rgba(0,0,0,0.3)", borderRadius: 5, fontSize: 10, maxHeight: 130, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{exec.output}</pre>
              )}
            </div>
          );
        })()}
        {preview && (
          <div className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6, borderColor: preview.verdict === "safe" ? "rgba(52,211,153,0.5)" : preview.verdict === "caution" ? "#febc2e" : "var(--danger, #ff6b6b)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b style={{ fontSize: 12 }}>Dry run — predicted writes</b>
              <span className={"badge " + (preview.verdict === "safe" ? "badge-ok" : "")} style={{ marginLeft: "auto" }}>
                {preview.createCount} new · {preview.overwriteCount} overwrite
              </span>
              <button className="icon-btn" style={{ width: 18, height: 18 }} title="Dismiss" onClick={() => setPreview(null)}><X size={11} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {preview.writes.map((w) => (
                <div key={w.path} style={{ display: "flex", gap: 6, alignItems: "baseline", fontSize: 11, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9, fontWeight: 800, flexShrink: 0, color: w.clashes ? "#febc2e" : "#34d399" }}>{w.clashes ? "OVERWRITE" : "NEW"}</span>
                  <span style={{ fontFamily: "var(--mono)", color: w.clashes ? "#febc2e" : "var(--text-2)", minWidth: 0, wordBreak: "break-all" }}>{w.path}</span>
                </div>
              ))}
            </div>
            {preview.notes.map((n, i) => (
              <div key={i} style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.45 }}>{n}</div>
            ))}
            {preview.verdict !== "safe" && (
              <label style={{ display: "flex", gap: 7, alignItems: "flex-start", fontSize: 11, cursor: "pointer", color: "#febc2e", lineHeight: 1.45 }}>
                <input type="checkbox" checked={ackRisk} onChange={(e) => setAckRisk(e.target.checked)} style={{ marginTop: 2 }} />
                <span>I understand the overwrite(s) above and want to continue.</span>
              </label>
            )}
          </div>
        )}
        {report && (
          <div className="card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 5, borderColor: report.verdict === "pass" ? "rgba(52,211,153,0.5)" : report.verdict === "warn" ? "#febc2e" : "var(--danger, #ff6b6b)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <b style={{ fontSize: 12 }}>Verification</b>
              <span className={"badge " + (report.verdict === "pass" ? "badge-ok" : "")} style={{ marginLeft: "auto" }}>{report.pass} pass · {report.fail} fail</span>
              <button className="icon-btn" style={{ width: 18, height: 18 }} title="Dismiss" onClick={() => setReport(null)}><X size={11} /></button>
            </div>
            {report.checks.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 6, fontSize: 11, lineHeight: 1.45, minWidth: 0 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, fontWeight: 800, flexShrink: 0, marginTop: 1, color: c.status === "pass" ? "#34d399" : c.status === "fail" ? "var(--danger, #ff6b6b)" : c.status === "warn" ? "#febc2e" : "var(--text-3)" }}>[{c.status}]</span>
                <span style={{ minWidth: 0 }}>
                  <b style={{ color: "var(--text-2)" }}>{c.label}</b>
                  <span style={{ color: "var(--text-3)" }}> — {c.detail}</span>
                </span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.45 }}>
              Structural checks only — run the host build for a real compile verdict.
            </div>
          </div>
        )}
        {locked && (
          <div className="card" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11.5, padding: 9, lineHeight: 1.45 }}>
            <ShieldAlert size={14} color="#febc2e" style={{ flexShrink: 0 }} /> Combining writes files — flip <b>Mode → Do</b> in the top toolbar first.
          </div>
        )}
        <div style={{ fontSize: 10.5, color: "var(--text-3)", lineHeight: 1.5 }}>
          Nothing is written until you review the diff — pre-save verification runs in the apply dialog first.
        </div>
      </div>
    </div>
  );
}

