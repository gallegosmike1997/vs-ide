import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Combine, FolderPlus, ImagePlus, Loader2, Package, RefreshCw, Rocket, ShieldAlert, ShieldCheck, Sparkles, WifiOff, X } from "lucide-react";
import type { AgentMode, TabDef } from "../store";
import { type FusionStrategy, type RootScan, analyzeFusion, blueprintEdit, buildFusionPrompt, loadImageThumb, previewFusion, scanImportedFolder, scanWorkspaceProjects, verifyFusion, type FusionPreview, type FusionVerifyReport } from "../lib/fusion";
import { isDesktop } from "../lib/workspace";
import { parseAiEdits, type AiEdit } from "../lib/aiEdits";
import { useLLMCall } from "../lib/aiClient";

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
  // ---- Dry-run preview: what this fusion would touch, before any AI request ----
  const [preview, setPreview] = useState<FusionPreview | null>(null);
  // Explicit confirmation when the preview predicts an overwrite.
  const [ackRisk, setAckRisk] = useState(false);
  // ---- Post-fusion verification: fresh re-scan + on-disk checks ----
  const [report, setReport] = useState<FusionVerifyReport | null>(null);
  const [verifying, setVerifying] = useState(false);
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
    if (scans.length < 2) {
      onToast(
        isDesktop() ? "Open two project folders first" : "Import two project folders first",
        isDesktop()
          ? "File → Add Folder to Workspace… — pick this app, then Super-AI-Stack (or any second project)."
          : "Use “Import project folder” below — pick this app's folder, then Super-AI-Stack."
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
    if (scans.length < 2) { onToast("Open two projects first", "The preview needs a host and a source project."); return; }
    setPreview(previewFusion(mode, scans));
    setAckRisk(false);
  }

  /**
   * Verify a fusion that has already been applied. Re-scans from disk first —
   * verifying against the pre-apply snapshot would report on the old state and
   * wrongly fail a merge that actually worked.
   */
  async function verify() {
    if (!isDesktop()) { onToast("Desktop app only", "Verification reads the project folders from disk."); return; }
    setVerifying(true);
    setReport(null);
    try {
      const fresh = await scanWorkspaceProjects();
      if (fresh.length < 2) { onToast("Need both folders open", "Verification compares the host and the source project."); return; }
      const planned = previewFusion(mode, fresh).writes.map((w) => w.path);
      const rep = verifyFusion(fresh, planned);
      setReport(rep);
      onToast(
        rep.verdict === "pass" ? "Fusion verified" : rep.verdict === "warn" ? "Verified with warnings" : "Verification failed",
        rep.pass + " passed · " + rep.fail + " failed",
      );
    } catch (e: any) {
      onToast("Verification failed to run", String(e?.message || e).slice(0, 180));
    } finally { setVerifying(false); }
  }

  /** One entry point: offline blueprint or AI plan, both through onPlan. */
  async function generate() {
    if (!guard() || busy || loading) return;
    // A predicted overwrite must be acknowledged before an AI request is spent.
    if (preview && preview.verdict !== "safe" && !ackRisk) {
      onToast("Overwrite predicted", "Review the dry-run list, then tick the confirm box to continue.");
      return;
    }
    const names = attached.map((x) => x.name);
    if (mode === "blueprint") {
      onPlan("Offline blueprint — FUSION.md (no AI used).", [blueprintEdit(scans, names)], "Project fusion · offline blueprint");
      return;
    }
    if (!(await ensureOnline())) return;
    setBusy(true);
    try {
      const reply = await run(buildFusionPrompt(mode, scans, names));
      const edits = parseAiEdits(reply);
      if (!edits.length) { onToast("No file edits returned", String(reply).slice(0, 180)); return; }
      const how = mode === "bridge" ? "bridge B → A" : mode === "vendor" ? "vendor B → A" : "offline scaffold";
      onPlan(reply, edits, "Project fusion · " + how);
    } catch (e: any) {
      onToast("Fusion request failed", String(e?.message || e).slice(0, 200));
    } finally { setBusy(false); }
  }

  const a = scans[0];
  const b = scans[1];
  const work = busy || loading;
  /**
   * A is the host that receives the output, B is the capability source. The scan
   * order comes from the workspace root order, which is rarely what the user
   * wants — fusing the OTHER direction is a completely different plan, so
   * swapping has to be a first-class control rather than a re-ordering trick.
   */
  const swap = () => setScans((prev) => (prev.length < 2 ? prev : [prev[1], prev[0]]));
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
        <span className={"badge " + (scans.length >= 2 ? "badge-ok" : "")}>{scans.length}/2 projects{roots.length > 1 ? ` · ${roots.length} folders` : ""}</span>
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
        {scans.length >= 2 && (() => {
          const fit = analyzeFusion(scans);
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
            disabled={work || scans.length < 2}
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
            disabled={work || scans.length < 2}
            onClick={dryRun}
            title="Predict exactly which files this fusion would create or overwrite — free, offline, no AI call"
          >
            <ShieldCheck size={13} /> Dry run
          </button>
          <button
            className="btn btn-sm" style={{ flex: 1 }}
            disabled={work || verifying || scans.length < 2}
            onClick={() => void verify()}
            title="Re-scan from disk and check the fusion actually landed — offline, no AI call"
          >
            {verifying ? <Loader2 size={13} className="spin" /> : <ShieldCheck size={13} />} Verify fusion
          </button>
        </div>
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

