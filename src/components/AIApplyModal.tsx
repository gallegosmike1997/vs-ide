import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, ShieldAlert, ShieldCheck, ShieldX, Sparkles, Undo2, X } from "lucide-react";
import { DiffEditor } from "@monaco-editor/react";
import { summarizePlan, type EditPlanItem } from "../lib/aiEdits";
import { deriveVerdict, initialReport, runIntentCheck, runSyntaxChecks, type VerifyReport } from "../lib/aiVerify";
import { langFromName } from "../store";
import { Markdown } from "./Markdown";

/** A parsed model answer waiting for review. */
export type ApplyPlan = { items: EditPlanItem[]; reply: string; task: string; at: number };

/**
 * Review-and-apply dialog for AI edits: pick which files to write, see the real
 * diff, then apply everything in one go (undo restores the whole session).
 */
export default function AIApplyModal({ plan, applied, onClose, onApply, onUndo }: {
  plan: ApplyPlan | null;
  applied: boolean;
  onClose: () => void;
  onApply: (items: EditPlanItem[]) => void;
  onUndo: () => void;
}) {
  const [skip, setSkip] = useState<Record<number, boolean>>({});
  const [sel, setSel] = useState(0);
  const [showReply, setShowReply] = useState(false);
  // ---- Pre-save verification gate (must pass before applyItems writes) -----
  const [report, setReport] = useState<VerifyReport>(initialReport);
  const [nonce, setNonce] = useState(0);
  const [strict, setStrict] = useState<boolean>(() => {
    try { return localStorage.getItem("vs-ide-verify") !== "off"; } catch { return true; }
  });
  useEffect(() => { setSkip({}); setSel(0); setShowReply(false); }, [plan]);

  const chosenKey = plan
    ? plan.items.filter((it, i) => !it.error && !skip[i]).map((it) => it.label).join("|")
    : "";

  // Check 1 — deterministic syntax on the SELECTED proposed contents (offline-safe).
  useEffect(() => {
    if (!plan || applied) return;
    let alive = true;
    setReport((r) => ({ ...r, syntax: { status: "running", problems: [], checked: 0, aiOnly: 0 }, verdict: "running" }));
    const chosen = plan.items.filter((it, i) => !it.error && !skip[i]);
    void runSyntaxChecks(chosen).then((syntax) => {
      if (!alive) return;
      setReport((r) => { const next = { ...r, syntax, at: Date.now() }; return { ...next, verdict: deriveVerdict(next.syntax, next.intent) }; });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.at, applied, chosenKey, nonce]);

  // Check 2 — AI intent review against the original task (once per plan).
  useEffect(() => {
    if (!plan || applied) return;
    let alive = true;
    setReport((r) => ({ ...r, intent: { status: "running", verdict: null, notes: "" }, verdict: "running" }));
    void runIntentCheck(plan.task, plan.items.filter((it) => !it.error)).then((intent) => {
      if (!alive) return;
      setReport((r) => { const next = { ...r, intent, at: Date.now() }; return { ...next, verdict: deriveVerdict(next.syntax, next.intent) }; });
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.at, applied, nonce]);

  if (!plan) return null;

  const rows = plan.items.map((item, i) => ({ item, i }));
  const chosen = plan.items.filter((it, i) => !it.error && !skip[i]);
  const stats = summarizePlan(chosen);
  const current = rows[Math.min(sel, rows.length - 1)];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" style={{ width: "min(980px, 96vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span>
            <Sparkles size={12} style={{ marginRight: 6 }} />
            AI changes{plan.task ? " · " + plan.task.slice(0, 70) : ""}
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className={"badge " + (applied ? "badge-ok" : "")}>{applied ? "applied" : rows.length + " file(s)"}</span>
            <button className="icon-btn" onClick={onClose}><X size={14} /></button>
          </div>
        </div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "74vh", overflowY: "auto" }}>
          {applied ? (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Check size={16} />
              <div style={{ flex: 1, fontSize: 12.5 }}>
                <b>Applied.</b> The touched tabs are dirty — Ctrl+S saves them. Everything can be reverted in one click.
              </div>
              <button className="btn btn-sm" onClick={onUndo}><Undo2 size={13} /> Undo this change</button>
            </div>
          ) : null}
          {!applied && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {report.verdict === "running" && <Loader2 size={15} className="spin" color="var(--gold)" />}
                {report.verdict === "pass" && <ShieldCheck size={15} color="#34d399" />}
                {report.verdict === "warn" && <ShieldAlert size={15} color="#febc2e" />}
                {report.verdict === "fail" && <ShieldX size={15} color="#ff6b6b" />}
                <b style={{ fontSize: 12.5 }}>Pre-save verification</b>
                <span className={"badge " + (report.verdict === "fail" ? "badge-danger" : report.verdict === "pass" ? "badge-ok" : "badge-accent")}>
                  {report.verdict === "running" ? "checking…" : report.verdict}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-2)" }}>runs before anything is written to disk</span>
                <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto" }} title="Re-run verification" onClick={() => setNonce((n) => n + 1)}>
                  <RefreshCw size={12} /> Re-run
                </button>
              </div>
              {/* Check 1 — deterministic syntax / structure */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5 }}>
                <span style={{ width: 16, flexShrink: 0, textAlign: "center", marginTop: 1 }}>
                  {report.syntax.status === "running" ? <Loader2 size={12} className="spin" />
                    : report.syntax.status === "fail" ? <X size={12} color="#ff6b6b" />
                    : report.syntax.status === "pass" ? <Check size={12} color="#34d399" />
                    : <ShieldAlert size={12} color="#febc2e" />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>Syntax &amp; structure</b>{" "}
                  <span style={{ color: "var(--text-2)" }}>
                    {report.syntax.status === "running" ? "parsing proposed files…"
                      : report.syntax.status === "fail" ? report.syntax.problems.length + " problem(s) found"
                      : report.syntax.checked ? report.syntax.checked + " file(s) clean" + (report.syntax.aiOnly ? " · " + report.syntax.aiOnly + " checked by AI only" : "")
                      : "no machine-checkable files — covered by the AI review"}
                  </span>
                  {report.syntax.problems.length > 0 && (
                    <ul style={{ margin: "4px 0 0", paddingLeft: 16, color: "#ff9c9c" }}>
                      {report.syntax.problems.slice(0, 6).map((p, k) => <li key={k} style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{p}</li>)}
                    </ul>
                  )}
                </span>
              </div>
              {/* Check 2 — AI intent / functionality review */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11.5 }}>
                <span style={{ width: 16, flexShrink: 0, textAlign: "center", marginTop: 1 }}>
                  {report.intent.status === "running" ? <Loader2 size={12} className="spin" />
                    : report.intent.status === "fail" ? <X size={12} color="#ff6b6b" />
                    : report.intent.status === "pass" ? <Check size={12} color="#34d399" />
                    : <ShieldAlert size={12} color="#febc2e" />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>AI review vs your request</b>{" "}
                  <span style={{ color: "var(--text-2)" }}>
                    {report.intent.status === "running" ? "checking completeness, correctness, relevance…"
                      : report.intent.verdict === "fail" ? "reviewer flagged issues (below)"
                      : report.intent.verdict === "pass" ? "covers the request"
                      : report.intent.status === "skipped" ? "reviewer unavailable (offline?) — syntax checks still applied"
                      : "unverified reply"}
                  </span>
                  {report.intent.notes && report.intent.status !== "running" && (
                    <div style={{ marginTop: 4 }}><Markdown text={report.intent.notes} /></div>
                  )}
                </span>
              </div>
              {/* Strict gate preference */}
              <label style={{ display: "flex", gap: 7, alignItems: "center", fontSize: 11.5, color: "var(--text-2)", borderTop: "1px solid var(--border)", paddingTop: 7, cursor: "pointer" }}>
                <input type="checkbox" checked={strict}
                  onChange={(e) => { const v = e.target.checked; setStrict(v); try { localStorage.setItem("vs-ide-verify", v ? "on" : "off"); } catch { /* storage blocked */ } }} />
                Require verification to pass before applying (blocks only on <b>fail</b>)
              </label>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
            <div style={{ width: 290, flexShrink: 0, display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
              {rows.map(({ item, i }) => {
                const on = !skip[i] && !item.error;
                return (
                  <div
                    key={i}
                    className="result-card"
                    onClick={() => setSel(i)}
                    style={{ cursor: item.error ? "not-allowed" : "pointer", opacity: item.error ? 0.6 : 1, borderColor: i === sel ? "var(--border-strong)" : undefined, display: "flex", gap: 8, alignItems: "flex-start" }}
                  >
                    <input
                      type="checkbox" checked={on} disabled={!!item.error} style={{ marginTop: 2 }}
                      onChange={(e) => setSkip((s) => ({ ...s, [i]: !e.target.checked }))}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="truncate" style={{ display: "block", fontFamily: "var(--mono)", fontSize: 11.5 }}>{item.label}</span>
                      <span style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                        <span className="badge">{item.edit.kind === "create" ? "new file" : item.edit.kind === "patch" ? "patch" : "rewrite"}</span>
                        {!item.error && <span className="badge badge-ok">+{item.added}</span>}
                        {!item.error && <span className="badge badge-danger">−{item.removed}</span>}
                      </span>
                      {item.error
                        ? <span style={{ display: "block", fontSize: 11, color: "var(--danger, #ff6b6b)", marginTop: 4 }}>{item.error}</span>
                        : item.note ? <span style={{ display: "block", fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>{item.note}</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="glass" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", padding: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 4px 6px" }}>
                <span className="badge" style={{ fontFamily: "var(--mono)" }}>{current?.item.label}</span>
                {current?.item.edit.kind === "patch" && <span className="badge badge-accent">search → replace</span>}
                <span className="badge" style={{ marginLeft: "auto" }}>before / after</span>
              </div>
              <DiffEditor
                original={current?.item.before ?? ""}
                modified={current?.item.after ?? ""}
                language={langFromName(current?.item.label || "untitled.ts")}
                theme="vs-dark"
                height="320"
                options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, automaticLayout: true, renderOverviewRuler: false }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-sm btn-ghost" style={{ border: "1px solid var(--border)" }} onClick={() => setShowReply((v) => !v)}>
              {showReply ? "Hide" : "Show"} AI explanation
            </button>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>{chosen.length} of {rows.length} selected · {stats.label}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {applied && <button className="btn btn-sm" onClick={onUndo}><Undo2 size={13} /> Undo</button>}
              <button className="btn btn-sm btn-ghost" onClick={onClose}>Close</button>
              {!applied && (() => {
                const running = report.verdict === "running";
                const failed = report.verdict === "fail";
                const blocked = running || (strict && failed);
                const reason = running
                  ? "Verification is still running — or untick 'Require verification' to apply immediately."
                  : "Verification failed — fix or uncheck the failing files, or untick 'Require verification' to apply anyway.";
                return (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!chosen.length || blocked}
                    title={blocked ? reason : "Verified — the write happens only now, and is undoable."}
                    onClick={() => onApply(chosen)}
                  >
                    <Check size={13} /> {running ? "Verifying…" : blocked ? "Blocked by verification" : `Apply ${chosen.length} change${chosen.length === 1 ? "" : "s"}`}
                  </button>
                );
              })()}
            </div>
          </div>
          {showReply && plan.reply ? <div className="card"><Markdown text={plan.reply} /></div> : null}
        </div>
      </div>
    </div>
  );
}