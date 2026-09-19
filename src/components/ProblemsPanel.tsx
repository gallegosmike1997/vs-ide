import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
export type Problem = { line: number; message: string; severity: "error" | "warn" | "info"; source: string };
export default function ProblemsPanel({ problems, onGoto }: { problems: Problem[]; onGoto: (line: number) => void }) {
  if (!problems.length) {
    return (
      <div style={{ padding: 14, display: "flex", gap: 10, alignItems: "center", color: "var(--text-2)", fontSize: 12.5 }}>
        <CheckCircle2 size={16} color="#34d399" /> No problems detected. AI diagnostics will appear here.
      </div>
    );
  }
  return (
    <div style={{ overflowY: "auto", maxHeight: 220 }}>
      {problems.map((p, i) => (
        <div key={i} className="file-row" style={{ alignItems: "flex-start" }} onClick={() => onGoto(p.line)}>
          {p.severity === "error" ? <AlertTriangle size={14} color="#ff5d5d" /> : p.severity === "warn" ? <AlertTriangle size={14} color="#ffb224" /> : <Info size={14} color="#4f8cff" />}
          <span style={{ flex: 1 }}><b style={{ color: "var(--text-0)" }}>Ln {p.line}</b> — {p.message}</span>
          <span className="badge">{p.source}</span>
        </div>
      ))}
    </div>
  );
}
