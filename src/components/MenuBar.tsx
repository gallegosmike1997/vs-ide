import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import type { DockTab, MenuAction } from "../store";
import { hasWorkspace } from "../lib/workspace";
import { hintFor, useKeybindings } from "../lib/commands";

type Item = { id: MenuAction | "sep"; label?: string; checked?: boolean };
type Menu = { id: string; label: string; items: Item[] };

const SEP: Item = { id: "sep" };

/**
 * The menu bar. Items only carry an id: labels and shortcut hints come from the
 * command registry, so a rebound key shows up here (and in every right-click
 * menu) without touching this file.
 */
export default function MenuBar({ onAction, dock, wordWrap, minimap, leftVisible, rightVisible, dockVisible, zen }: {
  onAction: (a: MenuAction) => void; dock: DockTab; wordWrap: boolean; minimap: boolean;
  leftVisible: boolean; rightVisible: boolean; dockVisible: boolean; zen: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const ov = useKeybindings();
  const cancelLeave = () => {
    if (leaveTimer.current !== null) { window.clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  };

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { cancelLeave(); setOpen(null); }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { cancelLeave(); setOpen(null); } };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); cancelLeave(); };
  }, []);

  /** "toggle-terminal" -> checks against the active dock tab. */
  const panel = (id: MenuAction, label: string): Item => ({ id, label, checked: dock === id.slice(7) });

  const MENUS: Menu[] = [
    {
      id: "file", label: "File", items: [
        { id: "splash", label: "Project Launcher…" },
        SEP,
        { id: "new-file", label: "New File" },
        { id: "new-folder", label: "New Folder…" },
        { id: "open-file", label: "Add File from Disk…" },
        { id: "open-folder", label: "Add Folder to Workspace…" },
        { id: "open-repo", label: "Add Repo from GitHub…" },
        { id: "fusion", label: "Combine Projects…" },
        ...(hasWorkspace() ? [SEP, { id: "close-workspace" as const, label: "Close Workspace" }] : []),
        SEP,
        { id: "save", label: "Save" },
        { id: "save-all", label: "Save All" },
        SEP,
        { id: "close-tab", label: "Close Tab" },
        { id: "close-others", label: "Close Other Tabs" },
        { id: "close-all", label: "Close All Tabs" },
        { id: "reopen-tab", label: "Reopen Closed Tab" },
        SEP,
        { id: "copy-path", label: "Copy Full Path" },
        { id: "reveal-file", label: "Reveal in File Explorer" },
      ],
    },
    {
      id: "edit", label: "Edit", items: [
        { id: "undo", label: "Undo" },
        { id: "redo", label: "Redo" },
        SEP,
        { id: "cut", label: "Cut" },
        { id: "copy", label: "Copy" },
        { id: "paste", label: "Paste" },
        SEP,
        { id: "find", label: "Find in File" },
        { id: "find-replace", label: "Replace in File" },
        { id: "find-next", label: "Find Next" },
        { id: "find-previous", label: "Find Previous" },
        { id: "goto-line", label: "Go to Line…" },
        SEP,
        { id: "format", label: "Format Document" },
        { id: "comment", label: "Toggle Line Comment" },
        { id: "comment-block", label: "Toggle Block Comment" },
        SEP,
        { id: "duplicate-line", label: "Duplicate Line" },
        { id: "delete-line", label: "Delete Line" },
        { id: "move-line-up", label: "Move Line Up" },
        { id: "move-line-down", label: "Move Line Down" },
        { id: "indent", label: "Indent Line" },
        { id: "outdent", label: "Outdent Line" },
        { id: "join-lines", label: "Join Lines" },
        { id: "trim-whitespace", label: "Trim Trailing Whitespace" },
        SEP,
        { id: "sort-lines-up", label: "Sort Lines Ascending" },
        { id: "sort-lines-down", label: "Sort Lines Descending" },
        { id: "transform-upper", label: "Transform to UPPERCASE" },
        { id: "transform-lower", label: "Transform to lowercase" },
        SEP,
        { id: "palette", label: "Command Palette…" },
      ],
    },
    {
      id: "selection", label: "Selection", items: [
        { id: "select-all", label: "Select All" },
        { id: "select-line", label: "Expand Line Selection" },
        SEP,
        { id: "expand-selection", label: "Expand Selection" },
        { id: "shrink-selection", label: "Shrink Selection" },
        SEP,
        { id: "add-cursor-next", label: "Add Cursor at Next Match" },
        { id: "add-cursor-below", label: "Add Cursor Below" },
        { id: "add-cursor-above", label: "Add Cursor Above" },
        SEP,
        { id: "copy", label: "Copy" },
        { id: "copy-path", label: "Copy Full Path" },
        { id: "comment", label: "Toggle Line Comment" },
        { id: "comment-block", label: "Toggle Block Comment" },
        SEP,
        { id: "transform-upper", label: "Transform to UPPERCASE" },
        { id: "transform-lower", label: "Transform to lowercase" },
        { id: "sort-lines-up", label: "Sort Lines Ascending" },
        { id: "duplicate-line", label: "Duplicate Line" },
      ],
    },
    {
      id: "view", label: "View", items: [
        { id: "palette", label: "Command Palette…" },
        { id: "quick-open", label: "Quick Open File" },
        SEP,
        { id: "toggle-theme", label: "Light / Dark Theme" },
        { id: "wordwrap", label: "Word Wrap", checked: wordWrap },
        { id: "toggle-minimap", label: "Minimap", checked: minimap },
        SEP,
        { id: "zoom-in", label: "Zoom In" },
        { id: "zoom-out", label: "Zoom Out" },
        { id: "zoom-reset", label: "Reset Zoom" },
        SEP,
        { id: "toggle-sidebar", label: "Side Bar", checked: leftVisible },
        { id: "toggle-rightbar", label: "AI Side Bar", checked: rightVisible },
        { id: "toggle-dock", label: "Bottom Panel", checked: dockVisible },
        { id: "zen", label: "Zen Mode", checked: zen },
        SEP,
        { id: "split-right", label: "Split Editor Right" },
        { id: "close-group", label: "Close Editor Group" },
        { id: "fold", label: "Fold All" },
        { id: "unfold", label: "Unfold All" },
        SEP,
        panel("toggle-terminal", "Terminal"),
        panel("toggle-problems", "Problems"),
        panel("toggle-output", "Output"),
        panel("toggle-actions", "AI Actions"),
        panel("toggle-debug", "Debug"),
      ],
    },
    {
      id: "go", label: "Go", items: [
        { id: "activity-explorer", label: "Explorer" },
        { id: "activity-search", label: "Search in Files" },
        { id: "activity-source-control", label: "Source Control" },
        { id: "activity-outline", label: "Outline" },
        { id: "activity-tasks", label: "Tasks" },
        { id: "activity-build", label: "Build (Idea → Plan → Build)" },
        { id: "activity-fusion", label: "Project Fusion" },
      ],
    },
    {
      id: "settings", label: "Settings", items: [
        { id: "settings", label: "LLM + Editor Settings…" },
        { id: "shortcuts", label: "Keyboard Shortcuts…" },
        SEP,
        { id: "run-cleanup", label: "Housekeeping: Run Now" },
        { id: "clean-preview", label: "Housekeeping: Preview (dry run)" },
        SEP,
        { id: "about", label: "About VS-IDE" },
      ],
    },
    {
      id: "help", label: "Help", items: [
        { id: "explain", label: "Explain active file (AI)" },
        { id: "fix", label: "Fix active file (AI · writes changes)" },
        { id: "tests", label: "Generate tests (AI · new file)" },
        { id: "run-file", label: "Run the active file" },
        SEP,
        { id: "shortcuts", label: "Keyboard Shortcuts…" },
        { id: "about", label: "About VS-IDE" },
      ],
    },
  ];

  return (
    <div
      ref={ref}
      className="menubar"
      onMouseEnter={cancelLeave}
      onMouseLeave={() => {
        // Grace period: the dropdown hangs below the button across a small gap,
        // so closing instantly cut the menu out while the pointer was still
        // travelling into it. Only close once the pointer has stayed outside the
        // whole menu area for a moment (re-entering cancels the timer).
        if (!open) return;
        cancelLeave();
        leaveTimer.current = window.setTimeout(() => { leaveTimer.current = null; setOpen(null); }, 280);
      }}
    >
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
              {m.items.map((it, i) => {
                if (it.id === "sep") return <div key={"sep" + i} className="menu-sep" />;
                const hint = hintFor(it.id, ov);
                return (
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
                    {hint && <span className="kbd">{hint}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
