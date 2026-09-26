import { useCallback, useEffect, useRef, useState } from "react";
export type Toast = { id: number; title: string; body?: string; kind?: "info" | "ok" | "warn" | "error" };
export type TabDef = { id: string; label: string; language: string; content: string; dirty?: boolean; path?: string; absPath?: string };
export type AgentMode = "idea" | "think" | "do";
export type ApprovalMode = "each" | "auto" | "never";
export type Activity = "explorer" | "search" | "source-control" | "outline" | "tasks" | "build" | "fusion";
export type DockTab = "terminal" | "search" | "actions" | "problems" | "output" | "debug";
/** One visible editor pane with its own tab strip + active tab (split editor). */
export type EditorGroup = { id: string; tabIds: string[]; activeId: string | null };
export type MenuAction =
  // ---- File -------------------------------------------------------------
  | "splash" | "new-file" | "new-folder" | "open-file" | "open-folder" | "open-repo"
  | "save" | "save-all" | "close-tab" | "close-others" | "close-all" | "reopen-tab"
  | "copy-path" | "reveal-file" | "close-workspace" | "fusion"
  // ---- Edit -------------------------------------------------------------
  | "undo" | "redo" | "cut" | "copy" | "paste" | "find" | "find-replace" | "find-next"
  | "find-previous" | "goto-line" | "format" | "comment" | "comment-block" | "duplicate-line"
  | "delete-line" | "move-line-up" | "move-line-down" | "indent" | "outdent" | "join-lines"
  | "trim-whitespace" | "sort-lines-up" | "sort-lines-down" | "transform-upper" | "transform-lower"
  // ---- Selection --------------------------------------------------------
  | "select-all" | "select-line" | "expand-selection" | "shrink-selection"
  | "add-cursor-next" | "add-cursor-below" | "add-cursor-above"
  // ---- View -------------------------------------------------------------
  | "palette" | "quick-open" | "goto-symbol" | "toggle-theme" | "wordwrap" | "fold" | "unfold"
  | "toggle-minimap" | "toggle-line-numbers" | "split-right" | "close-group"
  | "toggle-sidebar" | "toggle-rightbar" | "toggle-dock" | "zen"
  | "zoom-in" | "zoom-out" | "zoom-reset"
  | "toggle-terminal" | "toggle-problems" | "toggle-output" | "toggle-actions" | "toggle-debug"
  // ---- Go (activity bar) ------------------------------------------------
  | "activity-explorer" | "activity-search" | "activity-source-control" | "activity-outline"
  | "activity-tasks" | "activity-build" | "activity-fusion"
  // ---- AI, run and app --------------------------------------------------
  | "explain" | "fix" | "tests" | "run-file" | "settings" | "shortcuts" | "about"
  | "accounts" | "check-updates" | "auto-update" | "run-cleanup" | "clean-preview";
export function langFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".tsx") || n.endsWith(".ts") || n.endsWith(".mts")) return "typescript";
  if (n.endsWith(".jsx") || n.endsWith(".js") || n.endsWith(".mjs") || n.endsWith(".cjs")) return "javascript";
  if (n.endsWith(".json")) return "json";
  if (n.endsWith(".py")) return "python";
  if (n.endsWith(".rs")) return "rust";
  if (n.endsWith(".go")) return "go";
  if (n.endsWith(".html") || n.endsWith(".htm")) return "html";
  if (n.endsWith(".css")) return "css";
  if (n.endsWith(".md")) return "markdown";
  if (n.endsWith(".yaml") || n.endsWith(".yml")) return "yaml";
  if (n.endsWith(".toml")) return "toml";
  if (n.endsWith(".sh")) return "shell";
  return "plaintext";
}
let toastId = 1;
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = toastId++;
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismiss = useCallback((id: number) => setToasts((p) => p.filter((x) => x.id !== id)), []);
  return { toasts, push, dismiss };
}
export function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("vs-ide-theme") as any) || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("vs-ide-theme", theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}
export const STARTER_FILES: TabDef[] = [
  { id: "app", label: "App.tsx", language: "typescript", content: "// Welcome to VS-IDE\n// Press Ctrl+K or Cmd+K for AI commands\n\nexport function hello(name: string) {\n  return `Hello, ${name}!`;\n}\n" },
  { id: "main", label: "main.tsx", language: "typescript", content: "import App from './App';\n// entry point (mocked)\nconsole.log('boot');\n" },
  { id: "api", label: "api.ts", language: "typescript", content: "export async function fetchUser(id: string) {\n  const res = await fetch(`/api/users/${id}`);\n  if (!res.ok) throw new Error('fetch failed');\n  return res.json();\n}\n" },
];
// Session persistence: restore tabs/panes across reloads (quota-safe).
const SESSION_KEY = "vs-ide-session";
function loadSession(): { tabs: TabDef[]; activeId: string | null; groups: EditorGroup[] } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!Array.isArray(s?.tabs) || !s.tabs.length) return null;
    const tabs: TabDef[] = s.tabs
      .filter((t: any) => t && typeof t.id === "string" && typeof t.label === "string" && typeof t.content === "string")
      .map((t: any) => ({ ...t, language: typeof t.language === "string" ? t.language : langFromName(t.label) }));
    if (!tabs.length) return null;
    const ids = new Set(tabs.map((t) => t.id));
    const activeId = typeof s.activeId === "string" && ids.has(s.activeId) ? s.activeId : tabs[0].id;
    let groups: EditorGroup[] = Array.isArray(s.groups)
      ? s.groups
          .filter((g: any) => g && typeof g.id === "string" && Array.isArray(g.tabIds))
          .map((g: any): EditorGroup => {
            const tabIds = g.tabIds.filter((x: any) => ids.has(x));
            return { id: g.id, tabIds, activeId: ids.has(g.activeId) ? g.activeId : tabIds[0] ?? null };
          })
          .filter((g: EditorGroup) => g.tabIds.length > 0)
      : [];
    if (!groups.length) groups = [{ id: "group-0", tabIds: tabs.map((t) => t.id), activeId }];
    return { tabs, activeId, groups };
  } catch { return null; }
}
export function useTabs() {
  const [session] = useState(loadSession); // lazy → parsed once per mount
  const [tabs, setTabs] = useState<TabDef[]>(() => session?.tabs ?? STARTER_FILES);
  const [activeId, setActiveId] = useState<string | null>(() => session?.activeId ?? "app");
  // Split-editor panes: each group has its own tab strip + active tab.
  // Groups only hold tab ids — `tabs` stays the single source of content truth.
  const [groups, setGroups] = useState<EditorGroup[]>(() => session?.groups ?? [{ id: "group-0", tabIds: ["app"], activeId: "app" }]);
  // Persist the session (debounced) so reloads come back exactly as left.
  useEffect(() => {
    const h = setTimeout(() => {
      try { localStorage.setItem(SESSION_KEY, JSON.stringify({ tabs, activeId, groups })); }
      catch { /* quota exceeded or storage blocked — session restore is best-effort */ }
    }, 600);
    return () => clearTimeout(h);
  }, [tabs, activeId, groups]);
  const [focusedGroupId, setFocusedGroupId] = useState<string>("group-0");
  const focusedRef = useRef(focusedGroupId);
  focusedRef.current = focusedGroupId;
  const active = tabs.find((t) => t.id === activeId) || tabs[0];
  const updateContent = useCallback((id: string, content: string) => {
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, content, dirty: true } : t)));
  }, []);
  const openFiles = useCallback((files: TabDef[]) => {
    if (!files.length) return;
    const target = focusedRef.current;
    // Resolve which ids will be present after the merge so the last opened
    // file can be placed into the focused pane without stale-state reads.
    const known = new Map(tabs.map((t) => [t.label + "\u0000" + t.content, t.id]));
    const placed: string[] = [];
    for (const f of files) {
      const key = f.label + "\u0000" + f.content;
      if (!known.has(key)) known.set(key, f.id);
      placed.push(known.get(key)!);
    }
    setTabs((ts) => {
      const next = [...ts];
      for (const f of files) {
        const dup = next.findIndex((t) => t.label === f.label && t.content === f.content);
        if (dup === -1) next.push(f);
      }
      return next;
    });
    const lastId = placed[placed.length - 1];
    setGroups((gs) =>
      gs.some((g) => g.id === target)
        ? gs.map((g) =>
            g.id === target
              ? { ...g, tabIds: g.tabIds.includes(lastId) ? g.tabIds : [...g.tabIds, lastId], activeId: lastId }
              : g
          )
        : gs
    );
    setActiveId(lastId);
  }, [tabs]);
  const addFile = useCallback((name?: string, content = "") => {
    const label = name || ("untitled-" + (tabs.length + 1) + ".ts");
    const id = "file-" + Date.now() + "-" + Math.floor(Math.random() * 1e5);
    setTabs((ts) => [...ts, { id, label, language: langFromName(label), content: content || ("// " + label + "\n"), dirty: true }]);
    const target = focusedRef.current;
    setGroups((gs) =>
      gs.some((g) => g.id === target)
        ? gs.map((g) => (g.id === target ? { ...g, tabIds: [...g.tabIds, id], activeId: id } : g))
        : gs
    );
    setActiveId(id);
    return id;
  }, [tabs.length]);
  const close = useCallback((id: string, gid?: string) => {
    setGroups((gs) =>
      gs.map((g) => {
        if (gid && g.id !== gid) return g;
        if (!g.tabIds.includes(id)) return g;
        const idx = g.tabIds.indexOf(id);
        const tabIds = g.tabIds.filter((t) => t !== id);
        const activeId = g.activeId === id ? (tabIds[Math.max(0, idx - 1)] ?? null) : g.activeId;
        return { ...g, tabIds, activeId };
      })
    );
    setTabs((ts) => {
      if (ts.length === 1 && ts[0].id === id) return ts; // never strand the UI empty
      const idx = ts.findIndex((t) => t.id === id);
      const next = ts.filter((t) => t.id !== id);
      if (id === activeId) setActiveId(next[Math.max(0, idx - 1)]?.id ?? null);
      return next;
    });
  }, [activeId]);
  const save = useCallback((id: string) => {
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, dirty: false } : t)));
  }, []);
  const saveAll = useCallback(() => {
    setTabs((ts) => ts.map((t) => ({ ...t, dirty: false })));
  }, []);
  const closeAll = useCallback(() => {
    setTabs((ts) => (ts.length ? [ts.find((t) => t.id === activeId) || ts[0]] : ts));
  }, [activeId]);
  // ---- split-editor pane controls ------------------------------------------
  /** Focus a pane: the global active tab follows the pane's active tab. */
  const focusGroup = useCallback((gid: string) => {
    setFocusedGroupId(gid);
    setGroups((gs) => {
      const g = gs.find((x) => x.id === gid);
      if (g?.activeId) setActiveId(g.activeId);
      return gs;
    });
  }, []);
  /** Activate a tab, optionally inside a specific pane (otherwise the focused one). */
  const activateTab = useCallback((id: string, gid?: string) => {
    const target = gid ?? focusedRef.current;
    setFocusedGroupId(target);
    setGroups((gs) =>
      gs.some((g) => g.id === target)
        ? gs.map((g) =>
            g.id === target
              ? { ...g, tabIds: g.tabIds.includes(id) ? g.tabIds : [...g.tabIds, id], activeId: id }
              : g
          )
        : gs
    );
    setActiveId(id);
  }, []);
  /** Split the focused pane to the right, carrying its active tab along. */
  const splitRight = useCallback(() => {
    const g = groups.find((x) => x.id === focusedRef.current) ?? groups[0];
    const carry = g?.activeId ?? (g ? g.tabIds[g.tabIds.length - 1] : undefined) ?? activeId;
    const id = "group-" + Date.now() + "-" + Math.floor(Math.random() * 1e5);
    setGroups((gs) => [...gs, { id, tabIds: carry ? [carry] : [], activeId: carry ?? null }]);
    setFocusedGroupId(id);
    if (carry) setActiveId(carry);
  }, [groups, activeId]);
  /** Close a pane; its tabs stay open in the remaining panes. */
  const closeGroup = useCallback((gid: string) => {
    if (groups.length <= 1 || !groups.some((g) => g.id === gid)) return;
    const next = groups.filter((g) => g.id !== gid);
    setGroups(next);
    if (focusedRef.current === gid) {
      const into = next[next.length - 1];
      setFocusedGroupId(into.id);
      if (into.activeId) setActiveId(into.activeId);
    }
  }, [groups]);
  return {
    tabs, active, activeId,
    setActiveId: activateTab, updateContent, close, save, setTabs, openFiles, addFile, saveAll, closeAll,
    groups, focusedGroupId, focusGroup, splitRight, closeGroup,
  };
}
export function useKeyboard(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = (mod ? "mod+" : "") + e.key.toLowerCase();
      const fn = shortcuts[key] || shortcuts[e.key];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [shortcuts]);
}
