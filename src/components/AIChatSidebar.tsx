import { useEffect, useRef, useState } from "react";
import { Copy, SendHorizonal, Trash2 } from "lucide-react";
import { callLLM, useLLMCall } from "../aiClient";
import { Markdown, extractCodeBlocks } from "./Markdown";
type Msg = { role: "user" | "ai"; text: string };
export default function AIChatSidebar({ code, onToast }: { code: string; onToast: (t: string, b?: string) => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Hi! I'm wired to your local LM Studio. Ask about the open file, or try “explain this file”, “find bugs”, “write tests”." }]);
  const [input, setInput] = useState("");
  const { loading, run } = useLLMCall();
  const scroll = useRef<HTMLDivElement | null>(null);
  useEffect(() => { scroll.current?.scrollTo({ top: 999999 }); }, [msgs, loading]);
  async function send(prefill?: string) {
    const q = (prefill ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text: q }]);
    const prompt = `You are a senior engineer inside an IDE. Active file:\n\`\`\`\n${code.slice(0, 5000)}\n\`\`\`\nUser: ${q}\nAnswer concisely with markdown. Include runnable code blocks when useful.`;
    const ans = await run(prompt);
    setMsgs((m) => [...m, { role: "ai", text: ans }]);
  }
  async function copyLast() {
    const last = [...msgs].reverse().find((m) => m.role === "ai");
    if (!last) return;
    const blocks = extractCodeBlocks(last.text);
    try { await navigator.clipboard.writeText(blocks[0] || last.text); onToast("Copied", blocks[0] ? "Code block copied." : "Response copied."); }
    catch { onToast("Copy failed", "Clipboard blocked."); }
  }
  return (
    <div className="glass chat-wrap" style={{ minHeight: 280 }}>
      <div className="panel-header"><span>AI Chat</span><div style={{ display: "flex", gap: 4 }}><button className="icon-btn" style={{ width: 24, height: 24 }} title="Copy last answer" onClick={copyLast}><Copy size={13} /></button><button className="icon-btn" style={{ width: 24, height: 24 }} title="Clear" onClick={() => setMsgs([])}><Trash2 size={13} /></button></div></div>
      <div className="chat-scroll" ref={scroll}>
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "msg msg-user" : "msg msg-ai"}>
            {m.role === "ai" ? <Markdown text={m.text} /> : m.text}
          </div>
        ))}
        {loading && <div className="msg msg-ai"><span className="typing"><i /><i /><i /></span></div>}
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
