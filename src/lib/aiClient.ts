import { useCallback, useEffect, useState } from "react";
import type { AgentMode } from "../store";

// ---------------------------------------------------------------------------
// Providers
//  free  -> cloud, no API key, no install (works out of the box)
//  local -> LM Studio / Ollama / any OpenAI-compatible server on your machine
//  cloud -> hosted vendor, needs an API key
// ---------------------------------------------------------------------------
export type LLMProvider =
  | "puter"
  | "lmstudio" | "ollama" | "custom"
  | "openai" | "groq" | "gemini" | "openrouter" | "mistral" | "deepseek";

export type ProviderKind = "free" | "local" | "cloud";
export type ConnState = "unknown" | "online" | "offline" | "signin";
export type LLMConfig = { provider: LLMProvider; baseUrl: string; apiKey: string; model: string; temperature: number };
export type ProbeResult = { baseUrl: string; provider: LLMProvider; models: string[]; ok: boolean; error?: string };

export type Preset = {
  label: string; baseUrl: string; needsKey: boolean; kind: ProviderKind; hint: string;
  modelsUrl?: string; chatUrl?: string; defaultModel?: string; keyLabel?: string; keyUrl?: string;
  /** Provider works without a key but accepts a token instead (Puter). */
  keyOptional?: boolean;
};

export const PROVIDER_PRESETS: Record<LLMProvider, Preset> = {
  puter: {
    label: "Free cloud · Puter (no key)", baseUrl: "https://api.puter.com", needsKey: false, kind: "free",
    hint: "Free, no API key ever. Click 'Sign in to Puter' once (free account) and you get 500+ models: gpt-5-nano, claude, gemini… Paste a Puter auth token below to skip the sign-in popup completely.",
    defaultModel: "gpt-5-nano", keyUrl: "https://puter.com",
    keyOptional: true, keyLabel: "eyJhbGciOi… (Puter auth token)",
  },
  lmstudio: { label: "LM Studio (local)", baseUrl: "http://localhost:1234/v1", needsKey: false, kind: "local", hint: "LM Studio → Developer tab → Start Server (:1234) → load a model." },
  ollama: { label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", needsKey: false, kind: "local", hint: "Run `ollama serve`, then `ollama pull llama3.1`." },
  custom: { label: "Custom OpenAI-compatible", baseUrl: "http://localhost:1234/v1", needsKey: false, kind: "local", hint: "Any server exposing /v1 (vLLM, llama.cpp, LocalAI, LiteLLM…)." },
  openai: { label: "OpenAI", baseUrl: "https://api.openai.com/v1", needsKey: true, kind: "cloud", hint: "Paste an sk- key from platform.openai.com.", keyLabel: "sk-...", keyUrl: "https://platform.openai.com/api-keys", defaultModel: "gpt-4o-mini" },
  groq: { label: "Groq (fastest)", baseUrl: "https://api.groq.com/openai/v1", needsKey: true, kind: "cloud", hint: "Free key at console.groq.com/keys — very fast open models.", keyLabel: "gsk_...", keyUrl: "https://console.groq.com/keys", defaultModel: "llama-3.3-70b-versatile" },
  gemini: { label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", needsKey: true, kind: "cloud", hint: "Free-tier key at aistudio.google.com/apikey.", keyLabel: "AIza...", keyUrl: "https://aistudio.google.com/apikey", defaultModel: "gemini-2.0-flash" },
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", needsKey: true, kind: "cloud", hint: "One key → hundreds of models incl. `:free` ones.", keyLabel: "sk-or-...", keyUrl: "https://openrouter.ai/keys", defaultModel: "openai/gpt-4o-mini" },
  mistral: { label: "Mistral", baseUrl: "https://api.mistral.ai/v1", needsKey: true, kind: "cloud", hint: "Free tier key at console.mistral.ai.", keyLabel: "key", keyUrl: "https://console.mistral.ai/api-keys", defaultModel: "mistral-small-latest" },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", needsKey: true, kind: "cloud", hint: "Cheap strong coders at platform.deepseek.com.", keyLabel: "sk-...", keyUrl: "https://platform.deepseek.com/api_keys", defaultModel: "deepseek-chat" },
};

export const FREE_PROVIDERS: LLMProvider[] = ["puter"];
export const LOCAL_PROVIDERS: LLMProvider[] = ["lmstudio", "ollama", "custom"];
export const CLOUD_PROVIDERS: LLMProvider[] = ["openai", "groq", "gemini", "openrouter", "mistral", "deepseek"];
/**
 * Puter is the RECOMMENDED default. It is the only tier that needs nothing at
 * all — no key, no account registration, no local install — just one sign-in,
 * and it then unlocks 1000+ models on the user's own free allowance. The other
 * groups still exist (local is genuinely private, cloud may be cheaper), but
 * they should read as alternatives the user opts into, not the starting point.
 */
export const RECOMMENDED_PROVIDER: LLMProvider = "puter";
export const PROVIDER_GROUPS: { title: string; hint: string; ids: LLMProvider[] }[] = [
  { title: "Recommended — free cloud, no API key", hint: "Puter: one free sign-in popup, or a saved auth token with no popup at all. Nothing to install, nothing to register.", ids: FREE_PROVIDERS },
  { title: "Local — private, runs on your machine", hint: "Needs LM Studio or Ollama already running.", ids: LOCAL_PROVIDERS },
  { title: "Alternatives — paste an API key", hint: "Groq + Gemini have free tiers; others are pay-as-you-go.", ids: CLOUD_PROVIDERS },
];
export function isLocalUrl(u: string) { return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(u); }

const LS_KEY = "vs-ide-llm-config";

// Optional build-time defaults (see `.env.example`). With VITE_PUTER_TOKEN set
// the app is online straight away and never needs the SDK sign-in popup.
const ENV_PUTER_TOKEN = String(import.meta.env?.VITE_PUTER_TOKEN || "").trim();
const ENV_PUTER_MODEL = String(import.meta.env?.VITE_PUTER_MODEL || "").trim();

function defaults(): LLMConfig {
  return { provider: "puter", baseUrl: PROVIDER_PRESETS.puter.baseUrl, apiKey: ENV_PUTER_TOKEN, model: ENV_PUTER_MODEL || PROVIDER_PRESETS.puter.defaultModel || "", temperature: 0.2 };
}
function loadConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      const provider: LLMProvider = PROVIDER_PRESETS[p.provider as LLMProvider] ? p.provider : "puter";
      const pre = PROVIDER_PRESETS[provider];
      return {
        provider,
        baseUrl: String(p.baseUrl || pre.baseUrl).replace(/\/$/, ""),
        apiKey: p.apiKey || (provider === "puter" ? ENV_PUTER_TOKEN : ""),
        model: p.model || (provider === "puter" ? ENV_PUTER_MODEL : "") || pre.defaultModel || localStorage.getItem("vs-ide-model") || "",
        temperature: typeof p.temperature === "number" ? p.temperature : 0.2,
      };
    }
  } catch { /* ignore */ }
  return defaults();
}
export function getLLMConfig(): LLMConfig { return loadConfig(); }
export function saveLLMConfig(c: LLMConfig) {
  const pre = PROVIDER_PRESETS[c.provider];
  const clean: LLMConfig = {
    ...c,
    baseUrl: (c.baseUrl || pre.baseUrl).trim().replace(/\/$/, "") || pre.baseUrl,
    model: c.model || pre.defaultModel || "",
  };
  localStorage.setItem(LS_KEY, JSON.stringify(clean));
  try { localStorage.setItem("vs-ide-model", clean.model); } catch { /* ignore */ }
  emitCfg(clean);
  setTimeout(() => { void checkLLM(true); }, 0); // refresh the online/offline badge right away
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
    void checkLLM(true);
    const t = setInterval(() => void checkLLM(true), 45000);
    return () => { listeners.delete(setStatus); clearInterval(t); };
  }, []);
  return status;
}

// ---------------------------------------------------------------------------
// URL / header helpers (per-provider overrides so free + cloud both work)
// ---------------------------------------------------------------------------
function modelsUrlFor(p: LLMProvider, baseUrl: string) { return PROVIDER_PRESETS[p]?.modelsUrl || baseUrl.replace(/\/$/, "") + "/models"; }
function chatUrlFor(p: LLMProvider, baseUrl: string) { return PROVIDER_PRESETS[p]?.chatUrl || baseUrl.replace(/\/$/, "") + "/chat/completions"; }
function authHeaders(c: LLMConfig): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (c.apiKey) h["Authorization"] = "Bearer " + c.apiKey;
  if (c.provider === "openrouter") { h["HTTP-Referer"] = location.origin; h["X-Title"] = "VS-IDE"; }
  return h;
}
function parseModels(data: any): string[] {
  const arr = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
  return arr
    .map((m: any) => (typeof m === "string" ? m : m?.id || m?.name))
    .filter((m: any) => typeof m === "string" && m.length > 0);
}

// ---------------------------------------------------------------------------
// Free cloud without an API key (Puter.js)
//  The SDK is loaded on demand; the user signs in once (free account) and then
//  every AI call is billed to their own free Puter allowance.
// ---------------------------------------------------------------------------
const PUTER_SDK = "https://js.puter.com/v2/";
const PUTER_API = "https://api.puter.com";
const PUTER_DRIVERS = PUTER_API + "/drivers/call";
const PUTER_MODELS_URL = PUTER_API + "/puterai/chat/models/details";
const PUTER_WHOAMI_URL = PUTER_API + "/whoami";
const PUTER_FALLBACK_MODELS = ["gpt-5-nano", "gpt-4o-mini", "claude-sonnet-4-6", "gemini-2.5-flash"];
/** A Puter auth token is a JWT: three base64url segments starting with "ey". */
export function isPuterToken(s: string): boolean {
  return /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(s || "").trim());
}
/**
 * The Puter token currently in play: the one saved for the Puter provider, else
 * the build-time default. "" means "use the browser SDK / sign-in popup".
 */
export function puterToken(c: LLMConfig = cfg()): string {
  const saved = String(c.apiKey || "").trim();
  if (c.provider === "puter" && isPuterToken(saved)) return saved;
  return isPuterToken(ENV_PUTER_TOKEN) ? ENV_PUTER_TOKEN : "";
}
/** True when the app can call Puter over HTTPS without any sign-in click. */
export function hasPuterToken(): boolean { return !!puterToken(); }
export function puterReady(): boolean { return !!(window as any).puter?.ai?.chat; }
export async function ensurePuter(): Promise<any> {
  if (puterReady()) return (window as any).puter;
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("puter-sdk") as HTMLScriptElement | null;
    if (existing) {
      if (puterReady()) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Puter SDK failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.id = "puter-sdk";
    s.src = PUTER_SDK;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Puter SDK — are you offline?"));
    document.head.appendChild(s);
  });
  const p = (window as any).puter;
  if (!p?.ai?.chat) throw new Error("Puter SDK loaded but puter.ai.chat is unavailable");
  return p;
}
function flattenPuterModel(m: any): string | null {
  if (typeof m === "string") return m;
  return m?.id || m?.name || m?.model || null;
}
/** "signed-in" when a token is configured, or when the browser SDK has a session. */
export function puterAuthState(): "unknown" | "signed-in" | "signed-out" {
  if (hasPuterToken()) return "signed-in";
  if (!puterReady()) return "unknown";
  try { return (window as any).puter.auth.isSignedIn() ? "signed-in" : "signed-out"; }
  catch { return "unknown"; }
}
/** MUST be called from a click handler — Puter opens a popup window. */
export async function puterSignIn(): Promise<boolean> {
  try {
    const p = await ensurePuter();
    await p.auth.signIn({ attempt_temp_user_creation: true });
    return true;
  } catch (e) {
    console.warn("[Puter] sign-in failed", e);
    return false;
  }
}
export async function puterSignOut(): Promise<void> {
  try { await (window as any).puter?.auth?.signOut(); } catch { /* ignore */ }
}
export async function puterUser(): Promise<{ username?: string } | null> {
  try {
    const p = await ensurePuter();
    return (await p.auth.getUser?.()) ?? null;
  } catch { return null; }
}
/** Keeps the current pick and the known-good models at the top of the list. */
function orderPuterModels(ids: string[]): string[] {
  const head = [cfg().model, ...PUTER_FALLBACK_MODELS].filter((m, i, a) => !!m && a.indexOf(m) === i);
  return head.concat(ids.filter((m) => !head.includes(m)));
}
/** Authenticated, abortable fetch (api.puter.com allows our origin via CORS). */
async function puterFetch(url: string, token: string, init: RequestInit = {}, timeoutMs = 90000): Promise<Response> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  const headers: Record<string, string> = { Authorization: "Bearer " + token, ...(init.headers as Record<string, string> || {}) };
  try {
    return await fetch(url, { ...init, headers, signal: ctrl.signal });
  } finally { clearTimeout(to); }
}
/** True while Puter still accepts the token. */
async function puterVerifyToken(token: string): Promise<boolean> {
  try { return (await puterFetch(PUTER_WHOAMI_URL, token, { method: "GET" }, 8000)).ok; }
  catch { return false; }
}
/** Pulls the assistant text out of whatever shape a Puter driver replies with. */
function puterTextFrom(value: any): string {
  if (typeof value === "string") return value;
  const c = value?.message?.content ?? value?.text ?? value?.result?.message?.content;
  if (typeof c === "string" && c.trim()) return c;
  if (Array.isArray(c)) {
    const joined = c.map((p: any) => (typeof p === "string" ? p : p?.text || "")).join("");
    if (joined.trim()) return joined;
  }
  if (value === undefined || value === null) return "No response.";
  return "```json\n" + JSON.stringify(value).slice(0, 4000) + "\n```";
}
/** Models that only accept their default temperature (the gpt-5 family). */
const puterNoTemp = new Set<string>();
/** One chat turn over HTTPS via the `puter-chat-completion` driver. */
async function callPuterHttp(token: string, messages: ChatMsg[], model: string, temperature: number): Promise<string> {
  const id = model || PROVIDER_PRESETS.puter.defaultModel || "gpt-5-nano";
  const args: Record<string, unknown> = { messages, model: id };
  if (!puterNoTemp.has(id)) args.temperature = temperature;
  let data: any;
  try {
    const res = await puterFetch(PUTER_DRIVERS, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interface: "puter-chat-completion", driver: "ai-chat", test_mode: false, method: "complete", args, auth_token: token }),
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt.slice(0, 400) || "HTTP " + res.status);
    data = JSON.parse(txt);
  } catch (e) {
    const msg = String((e as any)?.message || e);
    // Reasoning models reject a custom temperature — drop it once and remember.
    if (args.temperature !== undefined && /temperature/i.test(msg)) {
      puterNoTemp.add(id);
      return callPuterHttp(token, messages, id, temperature);
    }
    throw new Error("Puter: " + msg.slice(0, 300));
  }
  if (data?.success === false) throw new Error("Puter: " + String(data?.error?.message || data?.error || "request failed").slice(0, 300));
  return puterTextFrom(data?.result ?? data);
}
export async function puterListModels(): Promise<string[]> {
  const token = puterToken();
  if (token) {
    try {
      const res = await puterFetch(PUTER_MODELS_URL, token, { method: "GET" }, 20000);
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data?.models) ? data.models : [];
        const ids = Array.from(new Set<string>((arr as any[]).map(flattenPuterModel).filter(Boolean) as string[])).sort();
        if (ids.length) return orderPuterModels(ids);
      }
    } catch (e) { console.warn("[Puter] token model list failed — falling back to the SDK", e); }
  }
  try {
    const p = await ensurePuter();
    const list = (await p.ai.listModels?.()) ?? [];
    const names = (Array.isArray(list) ? list : []).map(flattenPuterModel).filter(Boolean) as string[];
    return names.length ? orderPuterModels(Array.from(new Set<string>(names)).sort()) : PUTER_FALLBACK_MODELS;
  } catch { return PUTER_FALLBACK_MODELS; }
}
async function callPuter(messages: ChatMsg[], model: string, temperature: number): Promise<string> {
  const token = puterToken();
  // Preferred path: a real auth token — no SDK, no popup (works in the Tauri webview too).
  if (token) return callPuterHttp(token, messages, model, temperature);
  const p = await ensurePuter();
  if (puterAuthState() !== "signed-in") {
    // works when the call still runs inside a click gesture; otherwise the popup is blocked
    const ok = await puterSignIn();
    if (!ok) throw new Error("Puter sign-in required — open Settings → LLM Connection and press 'Sign in to Puter'.");
  }
  const res = await p.ai.chat(messages as any, { model: model || PROVIDER_PRESETS.puter.defaultModel, temperature });
  return puterTextFrom(res);
}

export async function listModels(): Promise<string[]> {
  const c = cfg();
  if (c.provider === "puter") return puterListModels();
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(modelsUrlFor(c.provider, c.baseUrl), { headers: authHeaders(c), signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status + " from " + modelsUrlFor(c.provider, c.baseUrl));
    return parseModels(await res.json());
  } finally { clearTimeout(to); }
}

export async function checkLLM(silent = false): Promise<ConnState> {
  const c = cfg();
  try {
    if (c.provider === "puter") {
      const token = puterToken(c);
      if (token) {
        // Background polls trust the saved token; an explicit "Test" verifies it.
        const ok = silent ? true : await puterVerifyToken(token);
        emit(ok ? "online" : "offline");
        return ok ? "online" : "offline";
      }
      try { await ensurePuter(); } catch { emit("offline"); return "offline"; }
      if (puterAuthState() === "signed-in") { emit("online"); return "online"; }
      emit("signin");            // SDK is loaded, the user just has not signed in yet
      return "signin";
    }
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 7000);
    let res: Response;
    try {
      res = await fetch(modelsUrlFor(c.provider, c.baseUrl), { headers: authHeaders(c), signal: ctrl.signal });
    } finally { clearTimeout(to); }
    if (!res.ok) throw new Error("HTTP " + res.status);
    emit("online");
    return "online";
  } catch (err) {
    if (!silent) console.warn("[LLM] offline:", err);
    emit("offline");
    return "offline";
  }
}

const CANDIDATES: { baseUrl: string; provider: LLMProvider }[] = [
  { baseUrl: "http://localhost:1234/v1", provider: "lmstudio" },
  { baseUrl: "http://127.0.0.1:1234/v1", provider: "lmstudio" },
  { baseUrl: "http://localhost:11434/v1", provider: "ollama" },
  { baseUrl: "http://127.0.0.1:11434/v1", provider: "ollama" },
];
/**
 * Finds something usable on this machine: LM Studio first, then Ollama.
 * Returns null when no local OpenAI-compatible server answered.
 */
export async function autoDetectLLM(): Promise<ProbeResult | null> {
  for (const cand of CANDIDATES) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 2500);
    try {
      const res = await fetch(cand.baseUrl + "/models", { signal: ctrl.signal });
      clearTimeout(to);
      if (!res.ok) continue;
      const models = parseModels(await res.json().catch(() => ({})));
      if (!models.length) continue;
      const next = { ...cfg(), provider: cand.provider, baseUrl: cand.baseUrl, apiKey: "", model: models.includes(cfg().model) ? cfg().model : models[0] };
      saveLLMConfig(next);
      emit("online");
      return { baseUrl: cand.baseUrl, provider: cand.provider, models, ok: true };
    } catch { clearTimeout(to); continue; }
  }
  return null;
}

function offlineFallback(prompt: string): string {
  const c = cfg();
  const where = c.baseUrl + " [" + c.provider + (c.model ? " / " + c.model : "") + "]";
  const p = prompt.toLowerCase();
  const tail = c.provider === "puter"
    ? "\n\n_Open **Settings → LLM Connection** and press **Sign in to Puter** (free, no key), or start a local LM Studio / Ollama server._"
    : "\n\n_Open **Settings → LLM Connection** and press **Get me online**, or paste an API key (Groq and Gemini both have free tiers)._";
  if (p.includes("line:") || p.includes("diagnostic") || p.includes("bugs, types"))
    return "LINE: 1 - LLM offline (tried " + where + ")." + tail;
  if (p.includes("semantic search"))
    return "LLM offline - local keyword match only." + tail;
  if (p.includes("debugging") || p.includes("root cause"))
    return "LLM offline. Local triage:\n1. Read the first error line\n2. Verify the imports it names\n3. Narrow with a console.log\n" + tail;
  return "LLM offline (tried " + where + ")." + tail;
}

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
async function postChatOnce(url: string, headers: Record<string, string>, model: string, messages: ChatMsg[], temperature: number): Promise<string> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, temperature }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error("HTTP " + res.status + " " + txt.slice(0, 300));
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || data?.message?.content || "No response.";
  } finally { clearTimeout(to); }
}

/** Runs one provider's chat call (handles the Puter SDK vs plain HTTP endpoints). */
async function invokeProvider(p: LLMProvider, c: LLMConfig, messages: ChatMsg[]): Promise<string> {
  const isActive = p === c.provider;
  const pre = PROVIDER_PRESETS[p];
  const baseUrl = isActive ? c.baseUrl : pre.baseUrl;
  const model = (isActive ? c.model : pre.defaultModel) || pre.defaultModel || "";
  if (p === "puter") return callPuter(messages, model, c.temperature);
  if (!model) throw new Error(p + " has no model selected");
  const headers = authHeaders(c);
  if (!isActive) delete headers["Authorization"];
  return postChatOnce(chatUrlFor(p, baseUrl), headers, model, messages, c.temperature);
}

export async function callChat(messages: ChatMsg[]): Promise<string> {
  const c = cfg();
  // primary pick first; Puter only as a fallback when it already has a session
  const chain: LLMProvider[] = c.provider === "puter"
    ? ["puter"]
    : puterAuthState() === "signed-in" ? [c.provider, "puter"] : [c.provider];
  const failures: string[] = [];
  for (const p of chain) {
    try {
      const text = await invokeProvider(p, c, messages);
      emit("online");
      if (p === c.provider) return text;
      return text + "\n\n_(answered by Puter free cloud — set your own model in Settings → LLM)_";
    } catch (err) {
      failures.push(p + ": " + String((err as any)?.message || err).slice(0, 140));
      console.warn("[LLM] provider failed —", p, err);
    }
  }
  if (c.provider === "puter" && puterReady() && puterAuthState() !== "signed-in") emit("signin");
  else emit("offline");
  const ctx = messages.map((m) => m.content).join("\n").slice(0, 1500);
  return offlineFallback(ctx) + "\n\n_Detail: " + failures.join(" | ").slice(0, 300) + "_";
}

// ---------------------------------------------------------------------------
// Agent mode: "idea" (brainstorm & plan only), "think" (analyses code, no
// actions), "do" (edits files + runs commands). Fresh installs land on
// "idea" — the safest rung; a stored value always wins. Read by callLLM.
// ---------------------------------------------------------------------------
let _agentMode: AgentMode = (() => {
  try {
    const stored = localStorage.getItem("vs-ide-agent-mode") as AgentMode | null;
    return stored === "idea" || stored === "think" || stored === "do" ? stored : "idea";
  } catch { return "idea"; } // no localStorage (Node/tests) or storage blocked
})();

export function setAgentMode(m: AgentMode): void {
  _agentMode = m;
  try { localStorage.setItem("vs-ide-agent-mode", m); } catch { /* storage blocked */ }
}
export function getAgentMode(): AgentMode { return _agentMode; }

export async function callLLM(prompt: string): Promise<string> {
  const mode = getAgentMode();
  const systemPrompt = mode === "do"
    ? "You are an autonomous coding agent inside an IDE. You can propose file edits using the JSON edit protocol and run shell commands to verify your work. Every action is reviewed before execution."
    : mode === "idea"
    ? "You are a product and architecture ideation partner inside an IDE. Brainstorm, design and plan — features, structure, trade-offs, risks and next steps. No file edits, no shell commands; ship ideas and specs, not code."
    : "You are a senior engineer inside a VS Code-like IDE. Explain your reasoning, show suggested code, but do NOT make file edits or run commands on your own. Be concise, markdown, runnable code blocks when useful.";
  return callChat([
    { role: "system", content: systemPrompt },
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

export type FreeCloudResult = { ok: boolean; needsSignIn: boolean; provider: LLMProvider; model: string; detail: string };
/** Shared success result when a Puter token is already in play (no clicks needed). */
async function puterReadyResult(via: string): Promise<FreeCloudResult> {
  const pre = PROVIDER_PRESETS.puter;
  const cur = getLLMConfig();
  const ms = await puterListModels();
  const model = cur.model && ms.includes(cur.model) ? cur.model : ms[0] || cur.model || pre.defaultModel || "";
  saveLLMConfig({ ...cur, provider: "puter", model });
  emit("online");
  return { ok: true, needsSignIn: false, provider: "puter", model, detail: "Online via " + via + " — " + ms.length + " model(s) available" };
}
/**
 * One-click "get me online": use a local server if one is running, otherwise
 * switch to the keyless Puter free tier. `needsSignIn` means the caller should
 * surface a "Sign in to Puter" button (a click is required to open the popup).
 */
export async function activateFreeCloud(): Promise<FreeCloudResult> {
  const found = await autoDetectLLM();
  if (found) {
    return { ok: true, needsSignIn: false, provider: found.provider, model: getLLMConfig().model || found.models[0], detail: found.baseUrl };
  }
  const pre = PROVIDER_PRESETS.puter;
  const cur = getLLMConfig();
  saveLLMConfig({ ...cur, provider: "puter", baseUrl: pre.baseUrl, apiKey: isPuterToken(cur.apiKey) ? cur.apiKey.trim() : ENV_PUTER_TOKEN, model: cur.provider === "puter" && cur.model ? cur.model : (ENV_PUTER_MODEL || pre.defaultModel || "") });
  // A configured token is a complete authentication — no SDK, no popup.
  if (hasPuterToken()) return puterReadyResult("your Puter token");
  try { await ensurePuter(); } catch { return { ok: false, needsSignIn: false, provider: "puter", model: "", detail: "Could not load the Puter SDK — check your connection." }; }
  if (puterAuthState() === "signed-in") {
    const ms = await puterListModels();
    const model = ms[0] || pre.defaultModel || "";
    saveLLMConfig({ ...getLLMConfig(), provider: "puter", model });
    emit("online");
    return { ok: true, needsSignIn: false, provider: "puter", model, detail: "Puter free cloud ready" };
  }
  emit("signin");
  return { ok: false, needsSignIn: true, provider: "puter", model: getLLMConfig().model, detail: "SDK ready — sign in to Puter to unlock the models." };
}

/** Sign in from a click handler, then grab the model list. */
export async function connectPuterNow(): Promise<FreeCloudResult> {
  const pre = PROVIDER_PRESETS.puter;
  const cur = getLLMConfig();
  const model = cur.provider === "puter" && cur.model ? cur.model : ENV_PUTER_MODEL || pre.defaultModel || "";
  saveLLMConfig({ ...cur, provider: "puter", baseUrl: pre.baseUrl, apiKey: isPuterToken(cur.apiKey) ? cur.apiKey.trim() : ENV_PUTER_TOKEN, model });
  // With a token there is nothing to sign in to: skip the popup entirely.
  if (hasPuterToken()) return puterReadyResult("your Puter token");
  const ok = await puterSignIn();
  if (!ok) return { ok: false, needsSignIn: true, provider: "puter", model: "", detail: "Sign-in window closed or was blocked by the browser." };
  const ms = await puterListModels();
  const picked = ms[0] || pre.defaultModel || "";
  saveLLMConfig({ ...getLLMConfig(), provider: "puter", model: picked });
  emit("online");
  return { ok: true, needsSignIn: false, provider: "puter", model: picked, detail: "Signed in — " + ms.length + " model(s) available" };
}

// compat exports (old names)
export const LLM_ENDPOINT = "http://localhost:1234/v1";
export const MODEL_NAME = "";
export default callLLM;
