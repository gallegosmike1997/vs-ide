import { useState } from "react";
import { callLLM } from "../aiClient";

export default function AIChatSidebar() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    const answer = await callLLM(input);
    const aiMsg = { role: "assistant", content: answer };
    setMessages([...messages, userMsg, aiMsg]);
    setInput("");
  }

  return (
    <div className="glass h-full w-full p-3 flex flex-col">
      <h2 className="text-sm font-semibold mb-2">AI Chat</h2>
      <div className="flex-1 overflow-auto text-xs mb-2 space-y-1">
        {messages.map((m, i) => (
          <div key={i}>
            <span className="font-semibold">{m.role === "user" ? "You: " : "AI: "}</span>
            <span>{m.content}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 p-2 bg-black/40 rounded-md text-xs"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI anything..."
        />
        <button className="px-3 py-1 text-xs rounded-md bg.white/10" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
