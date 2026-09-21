// src/components/ProjectRefactorEngine.tsx
import React, { useEffect, useState } from "react";
import type { TabDef } from "../store";
import { planProjectEdits } from "../lib/refactor";

type Props = {
  files: TabDef[];
  onApply?: (plan: any) => void;
};

const ProjectRefactorEngine: React.FC<Props> = ({ files, onApply }) => {
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const runPlan = async () => {
    if (!files?.length) return;
    setLoading(true);
    try {
      const p = await planProjectEdits(files, "Project-wide refactor");
      setPlan(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runPlan();
  }, [files?.length]);

  return (
    <section className="project-refactor-engine">
      <h3>Project-wide Refactor</h3>
      {loading && <p>Planning…</p>}
      {!loading && plan && (
        <div className="plan-summary">
          <p><strong>Summary:</strong> {plan.reply ?? "Project-wide plan"}</p>
          <p><strong>Files involved:</strong> {files?.length ?? 0} files</p>
          <ul>
            {plan.items?.map((it: any, idx: number) => (
              <li key={idx}>
                {it.label ?? it.file ?? "file"}: {it.description ?? "edit"}
              </li>
            ))}
          </ul>
          <button onClick={() => onApply?.(plan)} disabled={!plan}>
            Apply plan
          </button>
        </div>
      )}
    </section>
  );
};

export default ProjectRefactorEngine;
