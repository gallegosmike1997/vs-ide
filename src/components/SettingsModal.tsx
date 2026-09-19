import { useEffect, useRef, useState } from "react";
import { Clock, Loader2, Plug, RefreshCw, Trash2, Wifi, WifiOff, X } from "lucide-react";
import { PROVIDER_PRESETS, checkLLM, listModels, saveLLMConfig } from "../aiClient";
import { useLLMConfig, useLLMStatus, type LLMProvider } from "../aiClient";
export default function SettingsModal({ open, onClose, fontSize, setFontSize, onToast }: {
  open: boolean; onClose: () => void; fontSize: number; setFontSize: (n: number) => void;
  onToast: (t: string, b?: string) => void;
}) {
  const [llm, setLlm] = useLLMConfig();
  const status = useLLMStatus();
  const [draft, setDraft] = useState(llm);
  const [models, setModels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"llm" | "editor" | "keys">("llm");
  const first = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (open) { setDraft(llm); setTab("llm"); setTimeout(() => first.current?.focus(), 60); } }, [open]);
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
            <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>PROVIDER</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(Object.keys(PROVIDER_PRESETS) as LLMProvider[]).map((p) => (
                <button key={p} className={"btn btn-sm" + (draft.provider === p ? " btn-primary" : "")} onClick={() => pickProvider(p)}>{PROVIDER_PRESETS[p].label}</button>
              ))}
            </div>
            <div className="card" style={{ fontSize: 12 }}><Plug size={12} style={{ marginRight: 6 }} />{preset.hint}</div>
            <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>BASE URL (.../v1)</label>
            <input ref={first} className="input" value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} spellCheck={false} />
            <label style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 700 }}>API KEY {(draft.provider === "openai") ? "(required)" : "(if needed)"}</label>
            <input className="input" type="password" value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="sk-..." autoComplete="off" />
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
