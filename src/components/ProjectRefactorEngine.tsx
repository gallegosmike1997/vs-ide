// src/components/ProjectRefactorEngine.tsx
import { useState } from "react";
import { FolderKanban, Loader2 } from "lucide-react";
import type { TabDef } from "../store";
import { planProjectEdits } from "../lib/refactor";

type Props = {
  files: TabDef[];
  onApply?: (plan: any) => void;
};

/**
 * Project-wide refactor planner (lives inside an "AI side bar" section, so it
 * renders body-only — the section header provides the title). The plan is only
 * requested when the user presses the button: no silent LLM calls on mount.
 */
const ProjectRefactorEngine = ({ files, onApply }: Props) => {
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPlan = async () => {
    if (!files?.length) return;
    setLoading(true);
    setError(null);
    try {
      setPlan(await planProjectEdits(files, "Project-wide refactor"));
    } catch (e) {
      console.error(e);
      setError(String((e as any)?.message || e).slice(0, 200));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" disabled={loading || !files?.length} onClick={runPlan}
          title="Ask the AI for a refactor plan across every file in view">
          {loading ? <Loader2 size={13} className="spin" /> : <FolderKanban size={13} />} Plan project-wide refactor
        </button>
        <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>{files?.length ?? 0} file(s) in view</span>
      </div>
      {error && <div className="card" style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
      {loading && <div className="shimmer" style={{ height: 48 }} />}
      {!loading && plan && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 12.5 }}><strong>Summary:</strong> {plan.reply ?? "Project-wide plan"}</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)" }}>Files involved: {plan.items?.length ?? files?.length ?? 0}</p>
          {!!plan.items?.length && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-1)", display: "flex", flexDirection: "column", gap: 4 }}>
              {plan.items.map((it: any, idx: number) => (
                <li key={idx}>{it.label ?? it.file ?? "file"}: {it.description ?? "edit"}</li>
              ))}
            </ul>
          )}
          <button className="btn btn-sm" disabled={!plan} onClick={() => onApply?.(plan)}>Review plan</button>
        </div>
      )}
      {!loading && !plan && !error && (
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
          Get an AI plan for a refactor across the whole project — then apply it file by file.
        </div>
      )}
    </div>
  );
};

export default ProjectRefactorEngine;
