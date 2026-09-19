import { useEffect, useState } from "react";
import { Check, Sparkles, Undo2, X } from "lucide-react";
import { DiffEditor } from "@monaco-editor/react";
import { summarizePlan, type EditPlanItem } from "../aiEdits";
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
  useEffect(() => { setSkip({}); setSel(0); setShowReply(false); }, [plan]);
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
              {!applied && (
                <button className="btn btn-primary btn-sm" disabled={!chosen.length} onClick={() => onApply(chosen)}>
                  <Check size={13} /> Apply {chosen.length} change{chosen.length === 1 ? "" : "s"}
                </button>
              )}
            </div>
          </div>
          {showReply && plan.reply ? <div className="card"><Markdown text={plan.reply} /></div> : null}
        </div>
      </div>
    </div>
  );
}