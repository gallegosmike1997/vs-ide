import { Bot, Command, Moon, Settings, Sun } from "lucide-react";
import MenuBar from "./MenuBar";
import { useLLMConfig, useLLMStatus } from "../aiClient";
import type { MenuAction } from "../store";
type Props = { onPalette: () => void; onSettings: () => void; theme: string; onTheme: () => void; dirty: boolean; onMenu: (a: MenuAction) => void };
export default function TitleBar({ onPalette, onSettings, theme, onTheme, dirty, onMenu }: Props) {
  const llm = useLLMStatus();
  const [cfg] = useLLMConfig();
  const label = cfg.model || cfg.provider;
  return (
    <div className="titlebar" style={{ flexWrap: "wrap" }}>
      <div className="traffic"><i style={{ background: "#ff5f57" }} /><i style={{ background: "#febc2e" }} /><i style={{ background: "#28c840" }} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, letterSpacing: 0.02 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#4f8cff,#7c5cff)", color: "#fff" }}><Bot size={15} /></span>
        <span>VS-IDE</span>
        {dirty && <span className="badge badge-warn">unsaved</span>}
      </div>
      <MenuBar onAction={onMenu} />
      <button className="btn btn-sm btn-ghost" onClick={onPalette} style={{ marginLeft: 4 }}>
        <Command size={13} /> Search / AI command <span className="kbd">Ctrl K</span>
      </button>
      <div style={{ flex: 1 }} />
      <span className={"badge " + (llm === "online" ? "badge-ok" : llm === "offline" ? "badge-danger" : "")} title={cfg.baseUrl}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: llm === "online" ? "#34d399" : llm === "offline" ? "#ff5d5d" : "#8b93a9" }} />
        {llm === "online" ? ("LLM: " + label) : llm === "offline" ? "LLM offline" : "LLM …"}
      </span>
      <button className="icon-btn" onClick={onTheme} title="Toggle theme">{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
      <button className="icon-btn" onClick={onSettings} title="Settings"><Settings size={15} /></button>
    </div>
  );
}
