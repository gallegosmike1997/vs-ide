// ---------------------------------------------------------------------------
// Commands + keybindings.
//
// One registry is the single source of truth for every menu entry, its default
// keybinding and its label. Users can rebind anything (Keyboard Shortcuts…),
// overrides live in localStorage, and the MenuBar reads the live chords so the
// hints always match reality.
//
// Chord format: "mod+shift+p" where `mod` = Ctrl (Windows/Linux) or Cmd (macOS),
// then optional `alt` / `shift`, then the key ("s", "f5", "arrowdown", "`", "\\").
// ---------------------------------------------------------------------------
import { useSyncExternalStore } from "react";
import type { MenuAction } from "../store";

export type CommandGroup = "File" | "Edit" | "Selection" | "View" | "Go" | "Run" | "AI" | "Help";
export type CommandDef = {
  id: MenuAction;
  label: string;
  group: CommandGroup;
  /** Default chords; the first one is the primary hint. Empty = menu only. */
  keys?: string[];
  /** Editor commands are dispatched to Monaco (App routes them via editSignal). */
  editor?: boolean;
  /** AI actions the command palette can run. */
  ai?: boolean;
};

/** VS Code-flavoured defaults for everything the app can do. */
export const COMMANDS: CommandDef[] = [
  // ---- File ---------------------------------------------------------------
  { id: "splash", label: "Open Project Launcher…", group: "File", keys: ["f1"] },
  { id: "new-file", label: "New File", group: "File", keys: ["mod+n"] },
  { id: "new-folder", label: "New Folder…", group: "File", keys: ["mod+shift+n"] },
  { id: "open-file", label: "Add File from Disk…", group: "File", keys: ["mod+o"] },
  { id: "open-folder", label: "Add Folder to Workspace…", group: "File", keys: ["mod+alt+o"] },
  { id: "open-repo", label: "Add Repo from GitHub…", group: "File" },
  { id: "fusion", label: "Combine Projects…", group: "File" },
  { id: "close-workspace", label: "Close Workspace", group: "File" },
  { id: "save", label: "Save", group: "File", keys: ["mod+s"] },
  { id: "save-all", label: "Save All", group: "File", keys: ["mod+alt+s"] },
  { id: "close-tab", label: "Close Tab", group: "File", keys: ["mod+w"] },
  { id: "close-others", label: "Close Other Tabs", group: "File" },
  { id: "close-all", label: "Close All Tabs", group: "File" },
  { id: "reopen-tab", label: "Reopen Closed Tab", group: "File", keys: ["mod+shift+t"] },
  { id: "copy-path", label: "Copy Full Path", group: "File", keys: ["mod+shift+c"] },
  { id: "reveal-file", label: "Reveal in File Explorer", group: "File" },

  // ---- Edit ---------------------------------------------------------------
  { id: "undo", label: "Undo", group: "Edit", keys: ["mod+z"], editor: true },
  { id: "redo", label: "Redo", group: "Edit", keys: ["mod+y"], editor: true },
  { id: "cut", label: "Cut", group: "Edit", keys: ["mod+x"], editor: true },
  { id: "copy", label: "Copy", group: "Edit", keys: ["mod+c"], editor: true },
  { id: "paste", label: "Paste", group: "Edit", keys: ["mod+v"], editor: true },
  { id: "find", label: "Find in File", group: "Edit", keys: ["mod+f"], editor: true },
  { id: "find-replace", label: "Replace in File", group: "Edit", keys: ["mod+h"], editor: true },
  { id: "find-next", label: "Find Next", group: "Edit", keys: ["f3"], editor: true },
  { id: "find-previous", label: "Find Previous", group: "Edit", keys: ["shift+f3"], editor: true },
  { id: "goto-line", label: "Go to Line…", group: "Edit", keys: ["mod+g"] },
  { id: "format", label: "Format Document", group: "Edit", keys: ["shift+alt+f"], editor: true },
  { id: "comment", label: "Toggle Line Comment", group: "Edit", keys: ["mod+/"], editor: true },
  { id: "comment-block", label: "Toggle Block Comment", group: "Edit", keys: ["shift+alt+a"], editor: true },
  { id: "duplicate-line", label: "Duplicate Line", group: "Edit", keys: ["shift+alt+arrowdown"], editor: true },
  { id: "delete-line", label: "Delete Line", group: "Edit", keys: ["mod+shift+k"], editor: true },
  { id: "move-line-up", label: "Move Line Up", group: "Edit", keys: ["alt+arrowup"], editor: true },
  { id: "move-line-down", label: "Move Line Down", group: "Edit", keys: ["alt+arrowdown"], editor: true },
  { id: "indent", label: "Indent Line", group: "Edit", keys: ["mod+]"], editor: true },
  { id: "outdent", label: "Outdent Line", group: "Edit", keys: ["mod+["], editor: true },
  { id: "join-lines", label: "Join Lines", group: "Edit", editor: true },
  { id: "trim-whitespace", label: "Trim Trailing Whitespace", group: "Edit", editor: true },
  { id: "sort-lines-up", label: "Sort Lines Ascending", group: "Edit", editor: true },
  { id: "sort-lines-down", label: "Sort Lines Descending", group: "Edit", editor: true },
  { id: "transform-upper", label: "Transform to UPPERCASE", group: "Edit", keys: ["mod+shift+u"], editor: true },
  { id: "transform-lower", label: "Transform to lowercase", group: "Edit", keys: ["mod+shift+l"], editor: true },

  // ---- Selection ----------------------------------------------------------
  { id: "select-all", label: "Select All", group: "Selection", keys: ["mod+a"], editor: true },
  { id: "select-line", label: "Expand Line Selection", group: "Selection", keys: ["mod+l"], editor: true },
  { id: "expand-selection", label: "Expand Selection", group: "Selection", keys: ["shift+alt+arrowright"], editor: true },
  { id: "shrink-selection", label: "Shrink Selection", group: "Selection", keys: ["shift+alt+arrowleft"], editor: true },
  { id: "add-cursor-next", label: "Add Cursor at Next Match", group: "Selection", keys: ["mod+d"], editor: true },
  { id: "add-cursor-below", label: "Add Cursor Below", group: "Selection", keys: ["mod+alt+arrowdown"], editor: true },
  { id: "add-cursor-above", label: "Add Cursor Above", group: "Selection", keys: ["mod+alt+arrowup"], editor: true },

  // ---- View ---------------------------------------------------------------
  { id: "palette", label: "Command Palette / Ask AI", group: "View", keys: ["mod+k"] },
  { id: "quick-open", label: "Quick Open File", group: "View", keys: ["mod+p"] },
  { id: "goto-symbol", label: "Go to Symbol in File…", group: "View", keys: ["mod+shift+o"] },
  { id: "toggle-sidebar", label: "Toggle Side Bar", group: "View", keys: ["mod+b"] },
  { id: "toggle-rightbar", label: "Toggle AI Side Bar", group: "View", keys: ["mod+alt+b"] },
  { id: "toggle-dock", label: "Toggle Bottom Panel", group: "View", keys: ["mod+j"] },
  { id: "zen", label: "Zen Mode", group: "View", keys: ["f11"] },
  { id: "toggle-theme", label: "Toggle Light / Dark Theme", group: "View" },
  { id: "wordwrap", label: "Toggle Word Wrap", group: "View", keys: ["alt+z"] },
  { id: "toggle-minimap", label: "Toggle Minimap", group: "View" },
  { id: "toggle-line-numbers", label: "Toggle Line Numbers", group: "View" },
  { id: "split-right", label: "Split Editor Right", group: "View", keys: ["mod+\\"] },
  { id: "close-group", label: "Close Editor Group", group: "View" },
  { id: "zoom-in", label: "Zoom In", group: "View", keys: ["mod+="] },
  { id: "zoom-out", label: "Zoom Out", group: "View", keys: ["mod+-"] },
  { id: "zoom-reset", label: "Reset Zoom", group: "View", keys: ["mod+0"] },
  { id: "toggle-terminal", label: "Terminal Panel", group: "View", keys: ["mod+`"] },
  { id: "toggle-problems", label: "Problems Panel", group: "View", keys: ["mod+shift+m"] },
  { id: "toggle-output", label: "Output Panel", group: "View" },
  { id: "toggle-actions", label: "AI Actions Panel", group: "View" },
  { id: "toggle-debug", label: "Debug Panel", group: "View" },

  // ---- Go (activity bar) --------------------------------------------------
  { id: "activity-explorer", label: "Show Explorer", group: "Go", keys: ["mod+shift+e"] },
  { id: "activity-search", label: "Search in Files", group: "Go", keys: ["mod+shift+f"] },
  { id: "activity-source-control", label: "Show Source Control", group: "Go", keys: ["mod+shift+g"] },
  { id: "activity-outline", label: "Show Outline", group: "Go" },
  { id: "activity-tasks", label: "Show Tasks", group: "Go" },
  { id: "activity-build", label: "Show Build (Idea → Plan → Build)", group: "Go", keys: ["mod+shift+b"] },
  { id: "activity-fusion", label: "Show Project Fusion", group: "Go" },

  // ---- Run / AI -----------------------------------------------------------
  { id: "run-file", label: "Run Active File", group: "Run", keys: ["f5"] },
  { id: "explain", label: "Explain Active File (AI)", group: "AI", ai: true },
  { id: "fix", label: "Fix Active File (AI · writes changes)", group: "AI", ai: true },
  { id: "tests", label: "Generate Tests (AI · new file)", group: "AI", ai: true },

  // ---- Help / app ---------------------------------------------------------
  { id: "settings", label: "Settings", group: "Help", keys: ["mod+,"] },
  { id: "accounts", label: "Accounts (sign in)…", group: "Help" },
  { id: "check-updates", label: "Check for Updates…", group: "Help" },
  { id: "auto-update", label: "Automatic Updates on Launch", group: "Help" },
  { id: "shortcuts", label: "Keyboard Shortcuts…", group: "Help" },
  { id: "run-cleanup", label: "Run Housekeeping Now", group: "Help" },
  { id: "clean-preview", label: "Housekeeping Preview (dry run)", group: "Help" },
  { id: "about", label: "About VS-IDE", group: "Help" },
];

const BY_ID = new Map(COMMANDS.map((c) => [c.id, c]));
export const commandLabel = (id: MenuAction): string => BY_ID.get(id)?.label ?? String(id);
export const commandDef = (id: MenuAction): CommandDef | undefined => BY_ID.get(id);

// ---------------------------------------------------------------------------
// Chord helpers
// ---------------------------------------------------------------------------
export const isMac = (): boolean =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent || "");

/** "ArrowDown" -> "arrowdown", "P" -> "p", " " -> "space". */
function normKey(key: string): string {
  const k = key.toLowerCase();
  if (k === " " || k === "spacebar") return "space";
  return k;
}

/** KeyboardEvent -> "mod+shift+p"; returns "" when the event is not a chord. */
export function chordFromEvent(e: KeyboardEvent): string {
  const key = normKey(e.key);
  if (!key || ["control", "shift", "alt", "meta"].includes(key)) return "";
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("mod");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  parts.push(key);
  return parts.join("+");
}

const KEY_LABELS: Record<string, string> = {
  alt: "Alt", shift: "Shift", space: "Space", escape: "Esc",
  arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→",
  enter: "Enter", tab: "Tab", backspace: "Backspace", delete: "Del",
  pageup: "PgUp", pagedown: "PgDn", backquote: "`", comma: ",", period: ".",
  slash: "/", backslash: "\\", bracketleft: "[", bracketright: "]", semicolon: ";",
  equal: "=", minus: "-", quote: "'",
};

/** "mod+shift+p" -> "Ctrl+Shift+P" (⌘/⇧ symbols on macOS). */
export function chordLabel(chord: string): string {
  if (!chord) return "";
  const mac = isMac();
  const sym = (p: string) =>
    p === "mod" ? (mac ? "⌘" : "Ctrl") : p === "alt" ? (mac ? "⌥" : "Alt") : mac ? "⇧" : "Shift";
  return chord
    .split("+")
    .map((part) => {
      const p = part.trim();
      if (p === "mod" || p === "alt" || p === "shift") return sym(p);
      const known = KEY_LABELS[p];
      if (known) return known;
      if (/^f\d+$/.test(p) || p.length === 1) return p.toUpperCase();
      return p;
    })
    .join(mac ? "" : "+");
}

// ---------------------------------------------------------------------------
// User overrides (localStorage)
// ---------------------------------------------------------------------------
const STORE_KEY = "vs-ide-keybindings";
export type Overrides = Record<string, string[]>;

function load(): Overrides {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {};
    const out: Overrides = {};
    for (const [id, keys] of Object.entries(parsed)) {
      if (BY_ID.has(id as MenuAction) && Array.isArray(keys)) {
        out[id] = keys.filter((k: unknown): k is string => typeof k === "string" && !!k.trim());
      }
    }
    return out;
  } catch {
    return {};
  }
}

let overrides: Overrides = load();
const listeners = new Set<() => void>();
const emit = () => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(overrides)); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => overrides;

/** Re-renders whenever a binding changes (snapshot identity changes on write). */
export function useKeybindings(): Overrides {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** The current override map (plain read, for non-React callers and tests). */
export function getOverrides(): Overrides {
  return overrides;
}

/** Chords bound to a command right now (override, else default, else none). */
export function keysFor(id: MenuAction, ov: Overrides = overrides): string[] {
  return ov[id] ?? BY_ID.get(id)?.keys ?? [];
}
/** Menu hint for a command, e.g. "Ctrl+Shift+P" ("" when unbound). A chord that
 *  another command has taken over is not shown - it is not really bound here. */
export function hintFor(id: MenuAction, ov?: Overrides): string {
  const source = ov ?? overrides;
  const owner = ownerMap(source);
  const keys = keysFor(id, source).filter((k) => owner.get(k) === id);
  return keys.length ? chordLabel(keys[0]) : "";
}
export const isCustom = (id: MenuAction): boolean => id in overrides;

/** chord -> command, from defaults then overrides (overrides win). */
export function chordMap(ov: Overrides = overrides): Map<string, MenuAction> {
  const map = new Map<string, MenuAction>();
  for (const def of COMMANDS) for (const chord of def.keys ?? []) map.set(chord, def.id);
  for (const [id, chords] of Object.entries(ov)) {
    const cmd = id as MenuAction;
    for (const chord of chords) map.set(chord, cmd);
  }
  return map;
}

/** Cached owner map: the keyboard handler asks for one on every keypress and the
 *  menu bar for one per item, so only rebuild when the overrides change. */
let cache: { ov: Overrides; map: Map<string, MenuAction> } | null = null;
export function ownerMap(ov: Overrides = overrides): Map<string, MenuAction> {
  if (!cache || cache.ov !== ov) cache = { ov, map: chordMap(ov) };
  return cache.map;
}

/** Which command (if any) this keystroke means. */
export function commandForEvent(e: KeyboardEvent): MenuAction | null {
  const chord = chordFromEvent(e);
  return chord ? ownerMap().get(chord) ?? null : null;
}

/** Chords claimed by more than one command - flagged in the shortcuts editor. */
export function conflicts(ov: Overrides = overrides): Record<string, string[]> {
  const seen: Record<string, string[]> = {};
  for (const [chord, id] of chordMap(ov)) (seen[chord] ||= []).push(id);
  return Object.fromEntries(Object.entries(seen).filter(([, ids]) => ids.length > 1));
}

export function setKeys(id: MenuAction, keys: string[]): void {
  overrides = { ...overrides, [id]: keys.filter(Boolean) };
  emit();
}
/** Give a chord to one command and take it away from every other command. */
export function rebind(_from: MenuAction, to: MenuAction, chord: string): void {
  const next: Overrides = { ...overrides };
  for (const [id, chords] of Object.entries(next)) {
    if (chords.includes(chord)) next[id] = chords.filter((c) => c !== chord);
  }
  next[to] = Array.from(new Set([...(next[to] ?? []), chord]));
  overrides = next;
  emit();
}
export function resetCommand(id: MenuAction): void {
  if (!(id in overrides)) return;
  const next = { ...overrides };
  delete next[id];
  overrides = next;
  emit();
}
export function resetAllKeys(): void {
  overrides = {};
  emit();
}
