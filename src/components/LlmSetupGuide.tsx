import { useEffect, useState } from "react";
import { CheckCircle2, CloudLightning, Loader2, LogIn, Plug, RefreshCw, Sparkles, X } from "lucide-react";
import { PROVIDER_GROUPS, PROVIDER_PRESETS, activateFreeCloud, checkLLM, connectPuterNow, puterAuthState } from "../lib/aiClient";
import { getLLMConfig, listModels, saveLLMConfig, useLLMStatus, type LLMProvider } from "../lib/aiClient";
export default function LlmSetupGuide({ open, onClose, onDone }: {
  open: boolean; onClose: () => void; onDone: () => void;
}) {
  const status = useLLMStatus();
  const [provider, setProvider] = useState<LLMProvider>(() => getLLMConfig().provider);
  const [baseUrl, setBaseUrl] = useState(() => getLLMConfig().baseUrl);
  const [apiKey, setApiKey] = useState(() => getLLMConfig().apiKey);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState(() => getLLMConfig().model);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (open) {
      const c = getLLMConfig();
      setProvider(c.provider); setBaseUrl(c.baseUrl);
      setApiKey(c.apiKey); setModel(c.model);
      setModels([]); setMsg("");
    }
  }, [open ]);
  if (!open) return null;
  const preset = PROVIDER_PRESETS[provider];
  function persist(patch?: any) {
    const base = getLLMConfig();
    saveLLMConfig({ provider, baseUrl, apiKey, model, temperature: base.temperature, ...patch });
  }
  async function doTest() {
    setBusy(true); setMsg(""); persist();
    const s = await checkLLM(false);
    setMsg(s === "online" ? "OK - server reachable at " + baseUrl : "No server at " + baseUrl + " - is it started?");
    setBusy(false);
  }
  async function doRefresh() {
    setBusy(true); setMsg(""); persist();
    try {
      const ms = await listModels();
      setModels(ms);
      if (ms.length) {
        const pick = ms.includes(model) ? model : ms[0];
        setModel(pick); persist({ model: pick });
        setMsg("Found " + ms.length + " model(s) - " + pick + " selected.");
      } else setMsg("Server is up but no models loaded. Load one, then Refresh again.");
    } catch (e: any) { setMsg(String(e?.message || e).slice(0, 180)); }
    finally { setBusy(false); }
  }
  function finish() { persist({ model }); onDone(); }
  async function doFree() {
    setBusy(true); setMsg("");
    const r = await activateFreeCloud();
    const c = getLLMConfig();
    setProvider(c.provider); setBaseUrl(c.baseUrl); setApiKey(c.apiKey); setModel(c.model);
    setModels(await listModels().catch(() => []));
    setBusy(false);
    setMsg(r.ok ? "Online via " + r.provider + " · model " + r.model : r.detail);
  }
  async function doSignIn() {
    setBusy(true); setMsg("");
    const r = await connectPuterNow();
    const c = getLLMConfig();
    setProvider(c.provider); setBaseUrl(c.baseUrl); setModel(c.model);
    setModels(await listModels().catch(() => []));
    setBusy(false);
    setMsg(r.ok ? "Signed in to Puter — model " + r.model : r.detail);
  }
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" style={{ width: "min(620px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span><Sparkles size={12} style={{ marginRight: 6 }} />Get the LLM online</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span className={"badge " + (status === "online" ? "badge-ok" : "badge-danger")}>{status === "online" ? "online" : "offline"}</span>
            <button className="icon-btn" onClick={onClose}><X size={14} /></button>
          </div>
        </div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto" }}>
          <div className="card" style={{ fontSize: 12 }}>1) Pick provider · 2) Start its server · 3) Test + Refresh models + pick one.</div>
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={doFree} style={{ alignSelf: "flex-start" }}>
            {busy ? <Loader2 size={13} className="spin" /> : <CloudLightning size={13} />} Do it for me (auto-detect / free cloud)
          </button>
          {(provider === "puter" || status !== "online") && puterAuthState() !== "signed-in" && (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 10, borderColor: "var(--gold)" }}>
              <div style={{ flex: 1, fontSize: 12 }}><b>Recommended: Puter.</b> One sign-in, no API key, no install, 500+ models on your own free allowance. The other options below need a key or a local server first.</div>
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={doSignIn}>
                {busy ? <Loader2 size={13} className="spin" /> : <LogIn size={13} />} Sign in to Puter
              </button>
            </div>
          )}
          {PROVIDER_GROUPS.map((g) => (
            <div key={g.title} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11.5, color: "var(--text-2)", fontWeight: 700, letterSpacing: 0.03 }}>{g.title.toUpperCase()} · <span style={{ fontWeight: 500 }}>{g.hint}</span></label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {g.ids.map((p) => (
                  <button key={p} className={"btn btn-sm" + (provider === p ? " btn-primary" : "")}
                    title={PROVIDER_PRESETS[p].hint}
                    onClick={() => {
                      const dm = PROVIDER_PRESETS[p].defaultModel || model;
                      setProvider(p); setBaseUrl(PROVIDER_PRESETS[p].baseUrl); setModel(dm);
                      persist({ provider: p, baseUrl: PROVIDER_PRESETS[p].baseUrl, model: dm });
                    }}>
                    {PROVIDER_PRESETS[p].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="card" style={{ fontSize: 12 }}>{preset.hint}</div>
          <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>BASE URL</label>
          <input className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} spellCheck={false} />
          <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>{provider === "puter" ? "PUTER AUTH TOKEN (OPTIONAL)" : "API KEY (IF NEEDED)"}</label>
          <input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={provider === "puter" ? "eyJhbGciOi… (JWT) — skips the sign-in popup" : "sk-..."} autoComplete="off" />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-sm" disabled={busy} onClick={doTest}>{busy ? <Loader2 size={13} className="spin" /> : <Plug size={13} />} Test</button>
            <button className="btn btn-sm" disabled={busy} onClick={doRefresh}>{busy ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} Refresh</button>
          </div>
          <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>MODEL {models.length ? "(" + models.length + ")" : ""}</label>
          {models.length ? (
            <select className="input" value={model} onChange={(e) => { setModel(e.target.value); persist({ model: e.target.value }); }}>
              <option value="">- pick a model -</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Refresh, or type exact model id" spellCheck={false} />
          )}
          {msg && <div className="card" style={{ fontSize: 12.5 }}><CheckCircle2 size={13} style={{ marginRight: 6 }} />{msg}</div>}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="btn btn-sm btn-ghost" onClick={onClose}>Later</button>
            <button className="btn btn-primary btn-sm" disabled={!model} onClick={finish}>{model ? "Use model" : "Pick a model first"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
