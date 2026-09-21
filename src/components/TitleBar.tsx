import { Command, FilePlus, FolderPlus, GitFork, Moon, Settings, Sun } from "lucide-react";
import MenuBar from "./MenuBar";
import { useLLMConfig, useLLMStatus } from "../lib/aiClient";
import type { DockTab, MenuAction } from "../store";
type Props = {
  onPalette: () => void; onSettings: () => void; theme: string; onTheme: () => void;
  dirty: boolean; onMenu: (a: MenuAction) => void; dock: DockTab; wordWrap: boolean;
};
export default function TitleBar({ onPalette, onSettings, theme, onTheme, dirty, onMenu, dock, wordWrap }: Props) {
  const llm = useLLMStatus();
  const [cfg] = useLLMConfig();
  const label = cfg.model || cfg.provider;
  return (
    <div className="titlebar" style={{ flexWrap: "wrap" }}>
      <div className="traffic"><i style={{ background: "#ff5f57" }} /><i style={{ background: "#febc2e" }} /><i style={{ background: "#28c840" }} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, letterSpacing: 0.02 }}>
        <span style={{ width: 60, height: 60, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, background: "#0b0709", border: "1px solid rgba(233,196,106,0.35)", boxShadow: "0 0 18px var(--maroon-glow)" }}>
          <img src="/mzsg-logo.jpg" alt="MZSG" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </span>
        <span>VS-IDE</span>
        {dirty && <span className="badge badge-warn">unsaved</span>}
      </div>
      <MenuBar onAction={onMenu} dock={dock} wordWrap={wordWrap} />
      <div className="titlebar-cta">
        <button className="btn btn-sm btn-primary" onClick={() => onMenu("open-file")} title="Add File… (Ctrl+O)"><FilePlus size={13} /> Add File</button>
        <button className="btn btn-sm" onClick={() => onMenu("open-folder")} title="Add Folder… (import a folder of source files)"><FolderPlus size={13} /> Add Folder</button>
        <button className="btn btn-sm" onClick={() => onMenu("open-repo")} title="Add Repo from GitHub… (public repos, no token)"><GitFork size={13} /> Add Repo</button>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onPalette} style={{ marginLeft: 4 }}>
        <Command size={13} /> Search / AI command <span className="kbd">Ctrl K</span>
      </button>
      <div style={{ flex: 1 }} />
      <button
        className={"badge " + (llm === "online" ? "badge-ok" : llm === "offline" ? "badge-danger" : llm === "signin" ? "badge-warn" : "")}
        title={cfg.provider === "puter" ? "Sign in to Puter (free, no key) to unlock 500+ models — click to open settings" : cfg.baseUrl + " — click to open LLM settings"}
        onClick={() => onMenu("settings")}
        style={{ cursor: "pointer" }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 99, background: llm === "online" ? "#34d399" : llm === "offline" ? "#ff5d5d" : llm === "signin" ? "#febc2e" : "#8b93a9" }} />
        {llm === "online" ? ("LLM: " + label) : llm === "signin" ? "LLM: sign in (free)" : llm === "offline" ? "LLM offline — click to fix" : "LLM …"}
      </button>
      <button className="icon-btn" onClick={onTheme} title="Toggle theme">{theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
      <button className="icon-btn" onClick={onSettings} title="Settings (Ctrl+,)"><Settings size={15} /></button>
    </div>
  );
}
