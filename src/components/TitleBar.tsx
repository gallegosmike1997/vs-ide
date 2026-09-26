import { useState } from "react";
import { createPortal } from "react-dom";
import { Brain, Command, FilePlus, FolderPlus, GitFork, Lightbulb, Moon, Settings, Sun, UserRound, Wrench } from "lucide-react";
import MenuBar from "./MenuBar";
import { useLLMConfig, useLLMStatus } from "../lib/aiClient";
import type { AgentMode, DockTab, MenuAction } from "../store";
type Props = {
  onPalette: () => void; onSettings: () => void; theme: string; onTheme: () => void;
  dirty: boolean; onMenu: (a: MenuAction) => void; dock: DockTab; wordWrap: boolean;
  mode: AgentMode; onMode: (m: AgentMode) => void;
  leftVisible: boolean; rightVisible: boolean; dockVisible: boolean; zen: boolean; minimap: boolean;
  /** Signed-in account (if any) for the title-bar chip. */
  account?: { name: string; email: string; avatar: string; label: string } | null;
  onAccounts?: () => void;
};
const MODES = [
  { id: "idea" as const, label: "Idea", icon: Lightbulb, color: "#4169e1", hint: "Idea mode — brainstorm, design and plan; ships no code" },
  { id: "think" as const, label: "Think", icon: Brain, color: "#7851a9", hint: "Think mode — the AI analyses code and suggests only; no edits or commands" },
  { id: "do" as const, label: "Do", icon: Wrench, color: "#c2244a", hint: "Do mode — the AI can write file edits and run commands (per your approval setting)" },
];
export default function TitleBar({ onPalette, onSettings, theme, onTheme, dirty, onMenu, dock, wordWrap, mode, onMode, leftVisible, rightVisible, dockVisible, zen, minimap, account, onAccounts }: Props) {
  const llm = useLLMStatus();
  const [cfg] = useLLMConfig();
  const label = cfg.model || cfg.provider;
  // Increments on every switch so the flash animation + overlay restart each time.
  const [flash, setFlash] = useState(0);
  function switchMode(m: AgentMode) { if (m === mode) return; onMode(m); setFlash((f) => f + 1); }
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
      <MenuBar onAction={onMenu} dock={dock} wordWrap={wordWrap} minimap={minimap} leftVisible={leftVisible} rightVisible={rightVisible} dockVisible={dockVisible} zen={zen} />
      <div className="titlebar-cta">
        <button className="btn btn-sm btn-primary" onClick={() => onMenu("open-file")} title="Add File… (Ctrl+O)"><FilePlus size={13} /> Add File</button>
        <button className="btn btn-sm" onClick={() => onMenu("open-folder")} title="Add Folder… (import a folder of source files)"><FolderPlus size={13} /> Add Folder</button>
        <button className="btn btn-sm" onClick={() => onMenu("open-repo")} title="Add Repo from GitHub… (public repos, no token)"><GitFork size={13} /> Add Repo</button>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onPalette} style={{ marginLeft: 4 }}>
        <Command size={13} /> Search / AI command <span className="kbd">Ctrl K</span>
      </button>
      <div style={{ flex: 1 }} />
      {/* Account chip: avatar + name when signed in, a plain button when not. */}
      {onAccounts && (
        <button
          className="acc-chip"
          onClick={onAccounts}
          title={account ? `${account.name}${account.email ? " · " + account.email : ""}\nClick to manage accounts` : "Sign in with Google, GitHub, Microsoft or Facebook"}
        >
          {account?.avatar
            ? <img src={account.avatar} alt="" style={{ width: 18, height: 18, borderRadius: "50%" }} />
            : <UserRound size={14} />}
          <span>{account ? account.name.split(" ")[0] : "Sign in"}</span>
          {account && <span className="badge" style={{ fontSize: 9 }}>{account.label}</span>}
        </button>
      )}
      {/* Idea / Think / Do agent-mode switch — deliberately large + flashing on change. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 6, padding: 3, background: "rgba(0,0,0,0.34)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "0 0 18px rgba(0,0,0,0.35)" }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", paddingLeft: 6 }}>Mode</span>
        <div key={flash} style={{ display: "flex", gap: 4 }}>
          {MODES.map((m) => {
            const on = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                title={m.hint}
                aria-pressed={on}
                style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700,
                  color: on ? "#ffffff" : "var(--text-2)",
                  background: on ? m.color : "transparent",
                  border: "1px solid " + (on ? m.color : "var(--border)"),
                  boxShadow: on ? "0 0 16px var(--flash-color)" : "none",
                  borderRadius: 11, padding: "7px 16px", cursor: "pointer",
                  transition: "background 0.25s, color 0.25s, border-color 0.25s",
                  animation: flash > 0 && on ? "modeFlash 0.6s cubic-bezier(0.2,0.9,0.3,1.15)" : undefined,
                  ["--flash-color" as any]: m.color + "cc",
                }}
              >
                <m.icon size={15} strokeWidth={2.4} /> {m.label}
              </button>
            );
          })}
        </div>
      </div>
      {flash > 0 && createPortal(
        <div key={"ov" + flash} className="mode-flash-overlay"
          style={{ ["--flash-color" as any]: mode === "idea" ? "rgba(65,105,225,0.55)" : mode === "think" ? "rgba(120,81,169,0.55)" : "rgba(194,36,71,0.55)" }} />,
        document.body,
      )}
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
