import { useEffect, useRef, useState } from "react";
import { Clock, CloudLightning, Loader2, LogIn, Plug, RefreshCw, Trash2, Wifi, WifiOff, X } from "lucide-react";
import { PROVIDER_GROUPS, PROVIDER_PRESETS, activateFreeCloud, checkLLM, connectPuterNow, getLLMConfig, isPuterToken, listModels, puterAuthState, saveLLMConfig } from "../lib/aiClient";
import { useLLMConfig, useLLMStatus, type LLMProvider } from "../lib/aiClient";
export default function SettingsModal({ open, onClose, fontSize, setFontSize, onToast, initialTab }: {
  open: boolean; onClose: () => void; fontSize: number; setFontSize: (n: number) => void;
  onToast: (t: string, b?: string) => void; initialTab?: "llm" | "editor" | "keys";
}) {
  const [llm, setLlm] = useLLMConfig();
  const status = useLLMStatus();
  const [draft, setDraft] = useState(llm);
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"llm" | "editor" | "keys">("llm");
  const first = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (open) { setDraft(llm); setTab(initialTab || "llm"); setTimeout(() => first.current?.focus(), 60); } }, [open, initialTab]);
  if (!open) return null;
  const preset = PROVIDER_PRESETS[draft.provider];
  const dirty = JSON.stringify(draft) !== JSON.stringify(llm);
  function pickProvider(p: LLMProvider) {
    setDraft((d) => ({ ...d, provider: p, baseUrl: PROVIDER_PRESETS[p].baseUrl }));
  }
  async function refreshModels() {
    setBusy(true);
    setLlm({ ...draft });
    try {
      const ms = await listModels();
      setModels(ms);
      onToast(ms.length ? ("Found " + ms.length + " model(s)") : "No models returned", ms[0] || "Load a model on the server");
      if (ms.length && !ms.includes(draft.model)) setDraft((d) => ({ ...d, model: ms[0] }));
    } catch (e: any) {
      onToast("Could not list models", String(e?.message || e).slice(0, 160));
    } finally { setBusy(false); }
  }
  async function test() {
    setBusy(true);
    setLlm({ ...draft });
    const s = await checkLLM(false);
    onToast(s === "online" ? "LLM online" : "LLM offline", s === "online" ? draft.baseUrl : "Check base URL / server / key");
    setBusy(false);
  }
  function save() {
    saveLLMConfig(draft);
    onToast("Settings saved", draft.provider + " -> " + (draft.model || "(no model)"));
    onClose();
  }
  async function goFree() {
    setBusy(true);
    onToast("Looking for a model…", "trying your local servers, then the free cloud");
    const r = await activateFreeCloud();
    setDraft(getLLMConfig());
    setModels(await listModels().catch(() => []));
    setBusy(false);
    if (r.ok) onToast("LLM is online", r.provider + " → " + r.model);
    else if (r.needsSignIn) onToast("One more step", "Press 'Sign in to Puter' below (free account, no API key)");
    else onToast("Still offline", r.detail);
  }
  async function signInPuter() {
    setBusy(true);
    const r = await connectPuterNow();
    setDraft(getLLMConfig());
    setModels(await listModels().catch(() => []));
    setBusy(false);
    onToast(r.ok ? "Signed in to Puter" : "Sign-in not completed", r.ok ? r.model + " is ready" : r.detail);
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" style={{ width: "min(640px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span>Settings</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className={"badge " + (status === "online" ? "badge-ok" : status === "offline" ? "badge-danger" : "")}>
              {status === "online" ? <Wifi size={11} /> : <WifiOff size={11} />} {status === "online" ? "LLM online" : status === "offline" ? "LLM offline" : "LLM ..."}
            </span>
            <button className="icon-btn" onClick={onClose}><X size={14} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "10px 12px 0 12px" }}>
          {(["llm", "editor", "keys"] as const).map((t) => (
            <button key={t} className={"dock-tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
              {t === "llm" ? "LLM Connection" : t === "editor" ? "Editor" : "Shortcuts"}
            </button>
          ))}
        </div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "66vh", overflowY: "auto" }}>
          {tab === "llm" && (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <button className="btn btn-sm btn-primary" disabled={busy} onClick={goFree} style={{ alignSelf: "flex-start" }}>
              {busy ? <Loader2 size={13} className="spin" /> : <CloudLightning size={13} />} Get me online (auto / free cloud)
            </button>
            {draft.provider === "puter" && status !== "online" && (
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, borderColor: "var(--border-strong)" }}>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <b>Puter needs a one-time free sign-in.</b> No credit card, no API key — your own free monthly allowance covers the AI calls.
                </div>
                <button className="btn btn-sm btn-primary" disabled={busy} onClick={signInPuter}>
                  {busy ? <Loader2 size={13} className="spin" /> : <LogIn size={13} />} Sign in to Puter
                </button>
              </div>
            )}
            {draft.provider === "puter" && status === "online" && puterAuthState() === "signed-in" && (
              <div className="card" style={{ fontSize: 12 }}>
                {isPuterToken(draft.apiKey) ? <>Using your <b>Puter auth token</b> — no sign-in popup needed.</> : <>Signed in to Puter</>} Press <b>Refresh models</b> to swap between gpt-5-nano, claude, gemini and more.
              </div>
            )}
            {PROVIDER_GROUPS.map((g) => (
              <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11.5, color: "var(--text-2)", fontWeight: 700, letterSpacing: 0.03 }}>
                  {g.title.toUpperCase()} <span style={{ fontWeight: 500 }}>· {g.hint}</span>
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {g.ids.map((p) => (
                    <button key={p} className={"btn btn-sm" + (draft.provider === p ? " btn-primary" : "")} onClick={() => pickProvider(p)} title={PROVIDER_PRESETS[p].hint}>
                      {PROVIDER_PRESETS[p].label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="card" style={{ fontSize: 12 }}><Plug size={12} style={{ marginRight: 6 }} />{preset.hint}</div>
            <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>BASE URL</label>
            <input ref={first} className="input" value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} spellCheck={false} />
            {preset.needsKey ? (
              <>
                <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>
                  API KEY (required)
                  {preset.keyUrl && <a href={preset.keyUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontWeight: 500 }}>get a key ↗</a>}
                </label>
                <input className="input" type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder={preset.keyLabel || "sk-..."} autoComplete="off" spellCheck={false} />
              </>
            ) : preset.keyOptional ? (
              <>
                <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>
                  PUTER AUTH TOKEN (optional)
                  <span style={{ marginLeft: 8, fontWeight: 500 }}>paste one and the app never asks you to sign in</span>
                </label>
                <input className="input" type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder={preset.keyLabel || "eyJhbGciOi… (JWT)"} autoComplete="off" spellCheck={false} />
                <div className="card" style={{ fontSize: 12 }}>
                  {isPuterToken(draft.apiKey)
                    ? "Token detected — calls go straight to api.puter.com over HTTPS (no SDK, no popup), billed to your own free Puter allowance."
                    : "No token? Press 'Sign in to Puter' instead — same free allowance, one popup on first run."}
                </div>
              </>
            ) : (
              <div className="card" style={{ fontSize: 12 }}>
                No API key needed for <b>{preset.label}</b>{preset.kind === "free" ? " — it is a public free tier, so you can chat right away." : "."}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="btn btn-sm" disabled={busy} onClick={test}>{busy ? <Loader2 size={13} className="spin" /> : <Plug size={13} />} Test</button>
              <button className="btn btn-sm" disabled={busy} onClick={refreshModels}>{busy ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} Refresh models</button>
              {dirty && <span className="badge badge-warn"><Clock size={11} /> unsaved</span>}
            </div>
            <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>MODEL {models.length ? "(" + models.length + " found)" : ""}</label>
            {models.length ? (
              <select className="input" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })}>
                <option value="">- pick a model -</option>
                {models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input className="input" value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="hit Refresh models" spellCheck={false} />
            )}
            <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>TEMP: {draft.temperature.toFixed(2)}</label>
            <input type="range" min={0} max={1} step={0.05} value={draft.temperature} onChange={(e) => setDraft({ ...draft, temperature: Number(e.target.value) })} />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button className="btn btn-sm btn-ghost" onClick={() => setDraft(llm)}><Trash2 size={13} /> Reset</button>
              <button className="btn btn-primary btn-sm" onClick={save}>Save + Close</button>
            </div>
          </div>)}
          {tab === "editor" && (<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>EDITOR FONT SIZE: {fontSize}px</label>
            <input type="range" min={11} max={20} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn btn-primary btn-sm" onClick={onClose}>Done</button></div>
          </div>)}
          {tab === "keys" && (<div style={{ fontSize: 12.5, color: "var(--text-1)", display: "flex", flexDirection: "column", gap: 8 }}>
            {[["Ctrl+K", "Command palette / Ask AI"], ["Ctrl+S", "Save active file"], ["Ctrl+N", "New file"], ["Ctrl+O", "Add file from disk"], ["Ctrl+G", "Go to line"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="kbd">{k}</span><span>{v}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end" }}><button className="btn btn-primary btn-sm" onClick={onClose}>Done</button></div>
          </div>)}
        </div>
      </div>
    </div>
  );
}
