import { useCallback, useEffect, useState } from "react";

export type LLMProvider = "lmstudio" | "ollama" | "openai" | "custom";
export type ConnState = "unknown" | "online" | "offline";
export type LLMConfig = { provider: LLMProvider; baseUrl: string; apiKey: string; model: string; temperature: number };
export const PROVIDER_PRESETS: Record<LLMProvider, { label: string; baseUrl: string; needsKey: boolean; hint: string }> = {
  lmstudio: { label: "LM Studio (local)", baseUrl: "http://localhost:1234/v1", needsKey: false, hint: "LM Studio → Developer tab → Start Server (:1234)" },
  ollama: { label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", needsKey: false, hint: "Run: ollama serve + ollama pull llama3.1" },
  openai: { label: "OpenAI (cloud)", baseUrl: "https://api.openai.com/v1", needsKey: true, hint: "Paste an sk- key. Billed by OpenAI." },
  custom: { label: "Custom OpenAI-compatible", baseUrl: "http://localhost:1234/v1", needsKey: false, hint: "Any /v1 server (vLLM, llama.cpp…)" },
};
const LS_KEY = "vs-ide-llm-config";
function loadConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        provider: p.provider || "lmstudio",
        baseUrl: String(p.baseUrl || PROVIDER_PRESETS.lmstudio.baseUrl).replace(/\/$/, ""),
        apiKey: p.apiKey || "",
        model: p.model || localStorage.getItem("vs-ide-model") || "",
        temperature: typeof p.temperature === "number" ? p.temperature : 0.2,
      };
    }
  } catch { /* ignore */ }
  return { provider: "lmstudio", baseUrl: PROVIDER_PRESETS.lmstudio.baseUrl, apiKey: "", model: localStorage.getItem("vs-ide-model") || "", temperature: 0.2 };
}
export function getLLMConfig(): LLMConfig { return loadConfig(); }
export function saveLLMConfig(c: LLMConfig) {
  const clean = { ...c, baseUrl: c.baseUrl.trim().replace(/\/$/, "") || PROVIDER_PRESETS.lmstudio.baseUrl };
  localStorage.setItem(LS_KEY, JSON.stringify(clean));
  try { localStorage.setItem("vs-ide-model", clean.model); } catch { /* ignore */ }
  emitCfg(clean);
}
let cachedConn: ConnState = "unknown";
let cachedCfg: LLMConfig | null = null;
const listeners = new Set<(s: ConnState) => void>();
const cfgListeners = new Set<(c: LLMConfig) => void>();
function emit(s: ConnState) { cachedConn = s; listeners.forEach((l) => l(s)); }
function emitCfg(c: LLMConfig) { cachedCfg = c; cfgListeners.forEach((l) => l(c)); }
function cfg(): LLMConfig { if (!cachedCfg) cachedCfg = loadConfig(); return cachedCfg; }
export function useLLMConfig() {
  const [c, setC] = useState<LLMConfig>(() => cfg());
  useEffect(() => { cfgListeners.add(setC); setC(cfg()); return () => { cfgListeners.delete(setC); }; }, []);
  return [c, (n: LLMConfig) => saveLLMConfig(n)] as const;
}
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
function authHeaders(): Record<string, string> {
  const c = cfg();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (c.apiKey) h["Authorization"] = "Bearer " + c.apiKey;
  return h;
}
export async function listModels(): Promise<string[]> {
  const c = cfg();
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(c.baseUrl + "/models", { headers: authHeaders(), signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const arr = Array.isArray(data?.data) ? data.data : [];
    return arr.map((m: any) => m.id || m.name).filter(Boolean);
  } finally { clearTimeout(to); }
}
export async function checkLLM(silent = false): Promise<ConnState> {
  try {
    const c = cfg();
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(c.baseUrl + "/models", { headers: authHeaders(), signal: ctrl.signal });
    clearTimeout(to);
    if (!res.ok) throw new Error("bad status " + res.status);
    emit("online"); return "online";
  } catch (err) {
    if (!silent) console.warn("[LLM] offline:", err);
    emit("offline"); return "offline";
  }
}
function offlineFallback(prompt: string): string {
  const c = cfg();
  const where = c.baseUrl + " [" + c.provider + (c.model ? " / " + c.model : "") + "]";
  const p = prompt.toLowerCase();
  if (p.includes("line:") || p.includes("diagnostic") || p.includes("bugs, types"))
    return "LINE: 1 - LLM offline (tried " + where + "). Settings → LLM → Test Connection.";
  if (p.includes("semantic search"))
    return "LLM offline - local keyword match only. Settings → LLM to go online.";
  if (p.includes("debugging") || p.includes("root cause"))
    return "LLM offline. Local triage:\n1. Check first error line\n2. Verify imports there\n3. Settings → LLM → Test Connection.";
  return "LLM offline (tried " + where + "). Settings → LLM: pick provider, Test, choose model.";
}
export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
export async function callChat(messages: ChatMsg[]): Promise<string> {
  const c = cfg();
  if (!c.model) return "No model selected. Open Settings → LLM → Refresh models → pick one.";
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(c.baseUrl + "/chat/completions", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ model: c.model, messages, temperature: c.temperature }),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("HTTP " + res.status + " " + txt.slice(0, 300));
    }
    const data = await res.json();
    emit("online");
    return data?.choices?.[0]?.message?.content || "No response.";
  } catch (err) {
    console.warn("[LLM] fallback:", err);
    emit("offline");
    const ctx = messages.map((m) => m.content).join("\n").slice(0, 1500);
    return offlineFallback(ctx) + "\n\n_Detail: " + String(err).slice(0, 220) + "_";
  }
}
export async function callLLM(prompt: string): Promise<string> {
  return callChat([
    { role: "system", content: "You are a senior engineer inside a VS Code-like IDE. Be concise, markdown, runnable code blocks when useful." },
    { role: "user", content: prompt },
  ]);
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
// compat exports (old constant names)
export const LLM_ENDPOINT = "http://localhost:1234/v1";
export const MODEL_NAME = "";
// re-export for compat
export default callLLM;
