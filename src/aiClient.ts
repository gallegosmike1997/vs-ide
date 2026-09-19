import { useCallback, useEffect, useState } from "react";
export const LLM_ENDPOINT = "http://localhost:1234";
export const MODEL_NAME = "your-model-name";
export type ConnState = "unknown" | "online" | "offline";
let cachedConn: ConnState = "unknown";
const listeners = new Set<(s: ConnState) => void>();
function emit(s: ConnState) { cachedConn = s; listeners.forEach((l) => l(s)); }
export function useLLMStatus() {
  const [status, setStatus] = useState<ConnState>(cachedConn);
  useEffect(() => {
    listeners.add(setStatus);
    checkLLM(true);
    const t = setInterval(() => checkLLM(true), 20000);
    return () => { listeners.delete(setStatus); clearInterval(t); };
  }, []);
  return status;
}
export async function checkLLM(silent = false): Promise<ConnState> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(LLM_ENDPOINT + "/v1/models", { signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) throw new Error("bad status");
    emit("online"); return "online";
  } catch (err) {
    if (!silent) console.warn("[LLM] offline:", err);
    emit("offline"); return "offline";
  }
}
function offlineFallback(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("diagnostic"))
    return "LINE: 1 - LLM offline. Start LM Studio on :1234 for live diagnostics.";
  if (p.includes("semantic search"))
    return "LLM offline - local keyword match only. Start LM Studio for ranking.";
  if (p.includes("debugging") || p.includes("root cause"))
    return "LLM offline. Local triage:\n1. Check first error line in logs\n2. Verify imports near that line\n3. Start LM Studio (:1234) for full analysis.";
  return "LLM offline (tried " + LLM_ENDPOINT + "). Start LM Studio OpenAI-server on :1234.";
}
export async function callLLM(prompt: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 30000);
    const res = await fetch(LLM_ENDPOINT + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL_NAME, messages: [{ role: "user", content: prompt }], temperature: 0.2 }),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    emit("online");
    return data?.choices?.[0]?.message?.content || "No response.";
  } catch (err) {
    console.warn("[LLM] fallback:", err);
    emit("offline");
    return offlineFallback(prompt);
  }
}
export function useLLMCall() {
  const [loading, setLoading] = useState(false);
  const run = useCallback(async (prompt: string) => {
    setLoading(true);
    try { return await callLLM(prompt); }
    finally { setLoading(false); }
  }, []);
  return { loading, run };
}
// re-export for compat
export default callLLM;
