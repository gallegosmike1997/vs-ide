import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { DockTab, MenuAction } from "../store";

type Item = { id: MenuAction | "sep"; label?: string; hint?: string; checked?: boolean };
type Menu = { id: string; label: string; items: Item[] };

export default function MenuBar({ onAction, dock, wordWrap }: {
  onAction: (a: MenuAction) => void; dock: DockTab; wordWrap: boolean;
}) {
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
        { id: "undo", label: "Undo", hint: "Ctrl+Z" },
        { id: "redo", label: "Redo", hint: "Ctrl+Y" },
        { id: "sep" },
        { id: "cut", label: "Cut", hint: "Ctrl+X" },
        { id: "copy", label: "Copy", hint: "Ctrl+C" },
        { id: "paste", label: "Paste", hint: "Ctrl+V" },
        { id: "sep" },
        { id: "find", label: "Find in file", hint: "Ctrl+F" },
        { id: "goto-line", label: "Go to Line…", hint: "Ctrl+G" },
        { id: "sep" },
        { id: "format", label: "Format Document", hint: "Shift+Alt+F" },
        { id: "comment", label: "Toggle Line Comment", hint: "Ctrl+/" },
        { id: "sep" },
        { id: "palette", label: "Command Palette…", hint: "Ctrl+K" },
      ],
    },
    {
      id: "selection", label: "Selection", items: [
        { id: "select-all", label: "Select All", hint: "Ctrl+A" },
        { id: "find", label: "Find / Select Next", hint: "Ctrl+F" },
        { id: "goto-line", label: "Go to Line…", hint: "Ctrl+G" },
        { id: "sep" },
        { id: "comment", label: "Toggle Line Comment", hint: "Ctrl+/" },
        { id: "palette", label: "More via Command Palette", hint: "Ctrl+K" },
      ],
    },
    {
      id: "view", label: "View", items: [
        { id: "toggle-theme", label: "Toggle Theme", hint: "" },
        { id: "sep" },
        { id: "toggle-terminal", label: "Terminal Panel", hint: "", checked: dock === "terminal" },
        { id: "toggle-problems", label: "Problems Panel", hint: "", checked: dock === "problems" },
        { id: "toggle-output", label: "Output Panel", hint: "", checked: dock === "output" },
        { id: "toggle-actions", label: "AI Actions Panel", hint: "", checked: dock === "actions" },
        { id: "toggle-debug", label: "Debug Panel", hint: "", checked: dock === "debug" },
        { id: "sep" },
        { id: "fold", label: "Fold All", hint: "" },
        { id: "unfold", label: "Unfold All", hint: "" },
        { id: "wordwrap", label: "Word Wrap", hint: "", checked: wordWrap },
      ],
    },
    {
      id: "settings", label: "Settings", items: [
        { id: "settings", label: "LLM + Editor Settings…", hint: "Ctrl+," },
        { id: "shortcuts", label: "Keyboard Shortcuts…", hint: "" },
        { id: "sep" },
        { id: "about", label: "About VS-IDE", hint: "" },
      ],
    },
    {
      id: "help", label: "Help", items: [
        { id: "explain", label: "Explain active file (AI)", hint: "" },
        { id: "fix", label: "Fix active file (AI · writes changes)", hint: "" },
        { id: "tests", label: "Generate tests (AI · new file)", hint: "" },
        { id: "sep" },
        { id: "shortcuts", label: "Keyboard Shortcuts…", hint: "" },
        { id: "about", label: "About VS-IDE", hint: "" },
      ],
    },
  ];

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
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {typeof it.checked === "boolean" && (
                        <span style={{ width: 14, display: "inline-flex" }}>{it.checked ? <Check size={13} /> : null}</span>
                      )}
                      {it.label}
                    </span>
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
