import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Copy, Play, SendHorizonal, ShieldCheck, Terminal, Trash2, Wand2 } from "lucide-react";
import { callLLM, useLLMCall } from "../lib/aiClient";
import { Markdown, extractCodeBlocks } from "./Markdown";
import { EDIT_PROTOCOL, extractCommands, parseAiEdits, type AiEdit } from "../lib/aiEdits";
import { buildChatContext, loadRequestedFiles, parseReadRequests, stripReadBlocks } from "../lib/aiContext";
import { canRunReal, runShell } from "../lib/runner";
import { showContextMenu } from "../lib/contextMenu";
import type { AgentMode, ApprovalMode } from "../store";
import type { TabDef } from "../store";

type Msg = { role: "user" | "ai"; text: string };
type CmdState = { key: string; cmd: string; status: "running" | "ok" | "error"; output: string };

export default function AIChatSidebar({ code, file, tabs = [], onToast, onPlan, agentMode, approvalMode, onApprovalMode, embedded = false }: {
  code: string; file?: string; /** Every file in the workspace — the AI sees the whole folder, not just the active tab. */
  tabs?: TabDef[];
  onToast: (t: string, b?: string) => void;
  onPlan?: (reply: string, edits: AiEdit[], task?: string) => void;
  agentMode: AgentMode; approvalMode: ApprovalMode; onApprovalMode: (m: ApprovalMode) => void;
  /** Inside the AI side bar the section header already says "AI Chat". */
  embedded?: boolean;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Hi! I can see the whole workspace — the file tree plus the open files. Ask about any file, or say what to change and press **Apply changes** to write it straight into the tabs." }]);
  const [input, setInput] = useState("");
  const { loading, run } = useLLMCall();
  const editCounts = useMemo(() => msgs.map((m) => (m.role === "ai" ? parseAiEdits(m.text, file).length : 0)), [msgs, file]);
  const cmdLists = useMemo(() => msgs.map((m) => (m.role === "ai" ? extractCommands(m.text) : [])), [msgs]);
  const [cmdRuns, setCmdRuns] = useState<Record<string, CmdState>>({});
  const scroll = useRef<HTMLDivElement | null>(null);
  useEffect(() => { scroll.current?.scrollTo({ top: 999999 }); }, [msgs, loading]);

  /** Run one proposed command under the current approval policy. */
  async function exec(mi: number, ci: number, cmd: string): Promise<string> {
    const key = mi + ":" + ci;
    setCmdRuns((p) => ({ ...p, [key]: { key, cmd, status: "running", output: "" } }));
    if (!canRunReal()) {
      setCmdRuns((p) => ({ ...p, [key]: { key, cmd, status: "error", output: "Shell commands need the desktop app (Tauri)." } }));
      return "";
    }
    try {
      const r = await runShell(cmd, 60000);
      const out = (r.output || "").slice(0, 4000);
      setCmdRuns((p) => ({ ...p, [key]: { key, cmd, status: r.ok ? "ok" : "error", output: out } }));
      return out;
    } catch (e: any) {
      const out = String(e?.message || e).slice(0, 2000);
      setCmdRuns((p) => ({ ...p, [key]: { key, cmd, status: "error", output: out } }));
      return out;
    }
  }

  async function send(prefill?: string) {
    const q = (prefill ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    const inDo = agentMode === "do";
    const modeBrief = inDo
      ? "You are in DO mode: you may propose file edits via the JSON edit protocol below, and propose shell commands in ```bash blocks (the IDE runs them per the user's approval setting)."
      : agentMode === "idea"
      ? "You are in IDEA mode: brainstorm, design and plan — features, architecture, trade-offs, next steps. Do NOT propose file edits and do NOT ask to run shell commands. Ship ideas, not code."
      : "You are in THINK mode: explain, analyse and suggest code only. Do NOT propose file edits and do NOT ask to run shell commands.";
    // Whole-workspace context: file tree + active file + peer previews + read protocol.
    const ctx = buildChatContext({ tabs, file, code });
    const ask = (extra = "") =>
      `You are a senior engineer inside an IDE with full visibility of the user's workspace (every open folder).\n\n${ctx}${extra}\n\nUser: ${q}\nAnswer concisely with markdown. Include runnable code blocks when useful.\n\n${modeBrief}\n\n${inDo ? EDIT_PROTOCOL : ""}`;
    let ans = await run(ask());
    // On-demand folder reads: the model asked for more files → load them from
    // the workspace and ask ONE more time with the contents attached.
    const wanted = parseReadRequests(ans);
    if (wanted.length) {
      const { block, missing } = await loadRequestedFiles(tabs, wanted);
      const note = missing.length ? `\n\n(Unavailable paths: ${missing.join(", ")})` : "";
      if (block) ans = await run(ask(`\n\nFILES YOU REQUESTED:\n\n${block}${note}`));
      else if (missing.length) ans = ans + `\n\n> Could not read: ${missing.map((m) => "`" + m + "`").join(", ")}`;
    }
    ans = stripReadBlocks(ans) || ans;
    const aiIndex = msgs.length + 1; // the user message landed at msgs.length
    setMsgs((m) => [...m, { role: "ai", text: ans }]);
    // Auto-approve: run proposed commands and feed one consolidated result back.
    const cmds = extractCommands(ans);
    if (inDo && approvalMode === "auto" && cmds.length) {
      const outs: string[] = [];
      for (let ci = 0; ci < cmds.length; ci++) {
        const out = await exec(aiIndex, ci, cmds[ci]);
        outs.push("$ " + cmds[ci] + (out ? "\n" + out : ""));
      }
      const feedback = await run("The IDE ran your proposed command(s). Output:\n\n" + outs.join("\n\n") + "\n\nContinue from here — next step or final answer, concisely.");
      setMsgs((m) => [...m, { role: "ai", text: feedback }]);
    }
  }
  async function copyLast() {
    const last = [...msgs].reverse().find((m) => m.role === "ai");
    if (!last) return;
    const blocks = extractCodeBlocks(last.text);
    try { await navigator.clipboard.writeText(blocks[0] || last.text); onToast("Copied", blocks[0] ? "Code block copied." : "Response copied."); }
    catch { onToast("Copy failed", "Clipboard blocked."); }
  }
  /** Right-click on a chat bubble: copy it, re-ask about it, apply its edits,
   *  copy the commands it proposed, or drop the whole conversation. */
  const messageMenu = (e: React.MouseEvent, m: Msg, i: number) => {
    const lastAi = [...msgs].reverse().find((x) => x.role === "ai");
    const edits = m.role === "ai" ? parseAiEdits(m.text, file).length : 0;
    showContextMenu(e, [
      { label: "Copy This Message", icon: <Copy size={13} />, run: () => void navigator.clipboard?.writeText(m.text) },
      { label: "Copy Last Answer", icon: <Copy size={13} />, disabled: !lastAi, run: copyLast },
      { label: "Copy Selection", run: () => { const s = window.getSelection()?.toString(); if (s) void navigator.clipboard?.writeText(s); } },
      { sep: true },
      { label: "Ask About This", run: () => setInput((v) => (v ? v + " " : "") + "Explain this: " + m.text.slice(0, 400)) },
      { label: "Apply Changes" + (edits ? " (" + edits + ")" : ""), disabled: !edits || !onPlan || agentMode !== "do", run: () => onPlan?.(m.text, parseAiEdits(m.text, file), "AI chat") },
      { sep: true },
      { label: "Copy Proposed Commands", disabled: !cmdLists[i]?.length, run: () => void navigator.clipboard?.writeText((cmdLists[i] || []).join("\n")) },
      { label: "Re-run Commands", disabled: !cmdLists[i]?.length, run: () => void Promise.all(cmdLists[i].map((c, ci) => exec(i, ci, c))) },
      { sep: true },
      { label: "Clear Conversation", icon: <Trash2 size={13} />, danger: true, run: () => setMsgs([]) },
    ], m.role === "ai" ? "AI answer" : "Your message");
  };

  return (
    <div className={embedded ? "chat-wrap" : "glass chat-wrap"} style={{ minHeight: embedded ? 240 : 280 }}>
      <div className="panel-header"><span style={{ display: "flex", alignItems: "center", gap: 6 }}>{!embedded && <b style={{ fontWeight: 800 }}>AI Chat</b>}<span className="badge badge-ok" title="The AI sees the whole workspace: file tree of every open folder, plus on-demand reads of any file">{tabs.length} file(s) in view</span></span><div style={{ display: "flex", gap: 4 }}><button className="icon-btn" style={{ width: 24, height: 24 }} title="Copy last answer" onClick={copyLast}><Copy size={13} /></button><button className="icon-btn" style={{ width: 24, height: 24 }} title="Clear" onClick={() => setMsgs([])}><Trash2 size={13} /></button></div></div>
      {/* Mode banner: shows what the AI is allowed to do right now. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontSize: 11, color: "var(--text-2)", background: agentMode === "do" ? "rgba(194,36,74,0.14)" : agentMode === "idea" ? "rgba(65,105,225,0.14)" : "rgba(120,81,169,0.14)", borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontWeight: 700, color: agentMode === "do" ? "#ff8fa6" : agentMode === "idea" ? "#60a5fa" : "#a78bfa" }}>
          {agentMode === "do" ? "Do mode" : agentMode === "idea" ? "Idea mode" : "Think mode"}
        </span>
        <span>{agentMode === "do" ? "— the AI can propose edits + commands." : agentMode === "idea" ? "— brainstorming and planning, no code." : "— the AI analyses code, but takes no actions."}</span>
      </div>
      <div className="chat-scroll" ref={scroll}>
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "msg msg-user" : "msg msg-ai"}
            onContextMenu={(e) => messageMenu(e, m, i)}>
            {m.role === "ai" ? <Markdown text={m.text} /> : m.text}
            {m.role === "ai" && agentMode === "do" && cmdLists[i].length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {cmdLists[i].map((cmd, ci) => {
                  const st = cmdRuns[i + ":" + ci];
                  return (
                    <div key={ci} style={{ background: "rgba(0,0,0,0.28)", border: "1px solid var(--border)", borderRadius: 8, padding: 8, fontFamily: "var(--mono)", fontSize: 11.5 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Terminal size={13} color="var(--gold)" />
                        <code style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cmd}</code>
                        {approvalMode === "never" && <span className="badge" title="Approval set to Never"><Ban size={10} /> off</span>}
                        {approvalMode === "each" && !st && (
                          <button className="btn btn-sm btn-primary" onClick={() => void exec(i, ci, cmd)}><Play size={12} /> Run</button>
                        )}
                        {st?.status === "running" && <span className="badge badge-accent">running…</span>}
                        {st && st.status !== "running" && <span className={"badge " + (st.status === "ok" ? "badge-ok" : "badge-danger")}>{st.status === "ok" ? "ran" : "error"}</span>}
                      </div>
                      {st?.output && <pre className="code-output" style={{ marginTop: 6, maxHeight: 160, fontSize: 11 }}>{st.output}</pre>}
                    </div>
                  );
                })}
              </div>
            )}
            {editCounts[i] > 0 && onPlan && agentMode === "do" && (
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-sm btn-primary" onClick={() => onPlan(m.text, parseAiEdits(m.text, file), "AI chat")}>
                  <Wand2 size={12} /> Apply changes ({editCounts[i]})
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && <div className="msg msg-ai"><span className="typing"><i /><i /><i /></span></div>}
      </div>
      {/* Script-run approval: the "toggling tab" inside the chat. */}
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", padding: "8px 10px 0 10px" }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)", marginRight: 4 }}>Script run</span>
        {([
          { id: "each" as const, label: "Approve each", icon: ShieldCheck, title: "Every proposed command shows a Run button" },
          { id: "auto" as const, label: "Auto-approve", icon: Play, title: "Run proposed commands automatically and feed output back to the AI" },
          { id: "never" as const, label: "Never", icon: Ban, title: "Never run proposed commands" },
        ]).map((a) => {
          const on = approvalMode === a.id;
          return (
            <button key={a.id} onClick={() => onApprovalMode(a.id)} title={a.title}
              className={"btn btn-sm " + (on ? "btn-primary" : "btn-ghost")}
              style={{ fontSize: 10.5, padding: "3px 8px", border: on ? undefined : "1px solid var(--border)", opacity: agentMode === "do" ? 1 : 0.6 }}>
              <a.icon size={11} /> {a.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, padding: 10, borderTop: "1px solid var(--border)" }}>
        <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask AI… (Enter)" onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button className="btn btn-primary btn-sm" onClick={() => send()} disabled={loading}><SendHorizonal size={13} /> Send</button>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 10px 10px 10px", flexWrap: "wrap" }}>
        {(["Explain this file", "Find bugs", "Write tests"] as const).map((s) => (
          <button key={s} className="btn btn-sm btn-ghost" style={{ border: "1px solid var(--border)" }} onClick={() => send(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}
// keep old import alive
export async function legacyChat(q: string) { return callLLM(q); }
