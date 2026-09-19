import { Bell, GitBranch, XCircle, CheckCircle2, WifiOff, Wifi } from "lucide-react";
import type { Toast } from "../store";
import { useLLMStatus } from "../aiClient";
type Props = { language: string; problems: number; toasts: Toast[]; onDismiss: (id: number) => void; onOpenProblems: () => void; line: number; col: number };
export default function StatusBar({ language, problems, toasts, onDismiss, onOpenProblems, line, col }: Props) {
  const llm = useLLMStatus();
  return (
    <>
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.kind === "error" ? <XCircle size={15} color="#ff5d5d" /> : t.kind === "ok" ? <CheckCircle2 size={15} color="#34d399" /> : <Bell size={15} color="#8fb4ff" />}</span>
            <div style={{ flex: 1 }}><b>{t.title}</b>{t.body && <div style={{ color: "var(--text-2)", marginTop: 2 }}>{t.body}</div>}</div>
            <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => onDismiss(t.id)}>x</button>
          </div>
        ))}
      </div>
      <div className="statusbar">
        <span className="status-item"><GitBranch size={12} /> main</span>
        <span className="status-item clickable" onClick={onOpenProblems}><XCircle size={12} color={problems > 0 ? "#ff5d5d" : "#34d399"} /> {problems} problems</span>
        <span className="status-item">Ln {line}, Col {col}</span>
        <span style={{ flex: 1 }} />
        <span className="status-item">{language}</span>
        <span className="status-item">{llm === "online" ? <Wifi size={12} color="#34d399" /> : <WifiOff size={12} color="#ff5d5d" />} LM Studio :1234</span>
        <span className="status-item">UTF-8</span>
      </div>
    </>
  );
}
