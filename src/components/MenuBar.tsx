import { useEffect, useRef, useState } from "react";
import type { MenuAction } from "../store";

type Menu = { id: string; label: string; items: { id: MenuAction | "sep"; label?: string; hint?: string }[] };

const MENUS: Menu[] = [
  {
    id: "file", label: "File", items: [
      { id: "new-file", label: "New File", hint: "Ctrl+N" },
      { id: "open-file", label: "Add File…", hint: "Ctrl+O" },
      { id: "open-folder", label: "Add Folder…", hint: "Ctrl+K O" },
      { id: "open-repo", label: "Add Repo from GitHub…", hint: "" },
      { id: "sep" },
      { id: "save", label: "Save", hint: "Ctrl+S" },
      { id: "save-all", label: "Save All", hint: "Ctrl+K S" },
      { id: "sep" },
      { id: "close-tab", label: "Close Tab", hint: "Ctrl+W" },
      { id: "close-all", label: "Close Others", hint: "" },
    ],
  },
  {
    id: "edit", label: "Edit", items: [
      { id: "palette", label: "Command Palette…", hint: "Ctrl+K" },
      { id: "sep" },
      { id: "find", label: "Find in file", hint: "Ctrl+F" },
      { id: "goto-line", label: "Go to Line…", hint: "Ctrl+G" },
    ],
  },
  {
    id: "selection", label: "Selection", items: [
      { id: "find", label: "Find / Select next", hint: "Ctrl+F" },
      { id: "goto-line", label: "Go to Line…", hint: "Ctrl+G" },
      { id: "palette", label: "Select via Command Palette", hint: "Ctrl+K" },
    ],
  },
  {
    id: "view", label: "View", items: [
      { id: "toggle-theme", label: "Toggle Theme", hint: "" },
      { id: "toggle-terminal", label: "Terminal Panel", hint: "" },
      { id: "toggle-debug", label: "Debug Panel", hint: "" },
      { id: "sep" },
      { id: "palette", label: "Command Palette…", hint: "Ctrl+K" },
    ],
  },
  {
    id: "settings", label: "Settings", items: [
      { id: "settings", label: "LLM + Editor Settings…", hint: "Ctrl+," },
      { id: "shortcuts", label: "Keyboard Shortcuts", hint: "" },
      { id: "about", label: "About VS-IDE", hint: "" },
    ],
  },
  {
    id: "help", label: "Help", items: [
      { id: "explain", label: "Explain active file (AI)", hint: "" },
      { id: "fix", label: "Fix / debug active file (AI)", hint: "" },
      { id: "tests", label: "Generate tests (AI)", hint: "" },
      { id: "sep" },
      { id: "shortcuts", label: "Keyboard Shortcuts", hint: "" },
      { id: "about", label: "About VS-IDE", hint: "" },
    ],
  },
];

export default function MenuBar({ onAction }: { onAction: (a: MenuAction) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, []);

  return (
    <div ref={ref} className="menubar" onMouseLeave={() => { if (open) setOpen(null); }}>
      {MENUS.map((m) => (
        <div key={m.id} className="menu-wrap">
          <button
            className={"menu-btn" + (open === m.id ? " open" : "")}
            onClick={() => setOpen(open === m.id ? null : m.id)}
            onMouseEnter={() => { if (open) setOpen(m.id); }}
          >
            {m.label}
          </button>
          {open === m.id && (
            <div className="glass menu-drop">
              {m.items.map((it, i) =>
                it.id === "sep" ? (
                  <div key={"sep" + i} className="menu-sep" />
                ) : (
                  <button
                    key={it.id + i}
                    className="menu-item"
                    onClick={() => { setOpen(null); onAction(it.id as MenuAction); }}
                  >
                    <span>{it.label}</span>
                    {it.hint && <span className="kbd">{it.hint}</span>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
