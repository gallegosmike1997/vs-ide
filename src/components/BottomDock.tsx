import TerminalPanel from "./TerminalPanel";
import AICodeActions from "./AICodeActions";
import ProblemsPanel, { type Problem } from "./ProblemsPanel";
import DebugAssistant from "./DebugAssistant";
import type { DockTab } from "../store";
import type { AiEdit } from "../lib/aiEdits";
export default function BottomDock({ dock, setDock, code, file, problems, onGotoProblem, output, onToast, onPlan }: {
  dock: DockTab; setDock: (d: DockTab) => void; code: string; problems: Problem[]; onGotoProblem: (l: number) => void; output: string;
  onToast: (t: string, b?: string) => void;
  file?: string;
  onPlan?: (reply: string, edits: AiEdit[], task?: string) => void;
}) {
  const tabs: { id: DockTab; label: string; count?: number }[] = [
    { id: "terminal", label: "Terminal" },
    { id: "actions", label: "AI Actions" },
    { id: "problems", label: "Problems", count: problems.length },
    { id: "output", label: "Output" },
    { id: "debug", label: "Debug" },
  ];
  return (
    <div className="glass" style={{ height: 220, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="panel-header">
        <div className="dock-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={"dock-tab" + (dock === t.id ? " active" : "")} onClick={() => setDock(t.id)}>
              {t.label}{typeof t.count === "number" && t.count > 0 ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>
        <span className="badge">{dock}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: dock === "terminal" ? 8 : 0 }}>
        {dock === "terminal" && <TerminalPanel />}
        {dock === "actions" && <div style={{ height: "100%", overflowY: "auto", padding: 10 }}><AICodeActions code={code} file={file} onPlan={onPlan} onApply={(c) => navigator.clipboard?.writeText(c).catch(() => {})} onToast={onToast} /></div>}
        {dock === "problems" && <ProblemsPanel problems={problems} onGoto={onGotoProblem} />}
        {dock === "output" && <pre className="code-output" style={{ margin: 10, maxHeight: 160 }}>{output || "Output / command results appear here."}</pre>}
        {dock === "debug" && <div style={{ height: "100%", overflowY: "auto", padding: 10 }}><DebugAssistant code={code} logs={output} onToast={onToast} /></div>}
      </div>
    </div>
  );
}
