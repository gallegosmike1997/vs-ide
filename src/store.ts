import { useCallback, useEffect, useState } from "react";
export type Toast = { id: number; title: string; body?: string; kind?: "info" | "ok" | "warn" | "error" };
export type TabDef = { id: string; label: string; language: string; content: string; dirty?: boolean; path?: string };
export type Activity = "explorer" | "search" | "chat" | "refactor" | "debug" | "project";
export type DockTab = "terminal" | "actions" | "problems" | "output" | "debug";
export type MenuAction =
  | "new-file" | "open-file" | "open-folder" | "open-repo" | "save" | "save-all" | "close-tab" | "close-all"
  | "palette" | "goto-line" | "find" | "toggle-theme" | "toggle-terminal" | "toggle-debug"
  | "explain" | "fix" | "tests" | "settings" | "shortcuts" | "about";
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
const STARTER_FILES: TabDef[] = [
  { id: "app", label: "App.tsx", language: "typescript", content: "// Welcome to VS-IDE\n// Press Ctrl+K or Cmd+K for AI commands\n\nexport function hello(name: string) {\n  return `Hello, ${name}!`;\n}\n" },
  { id: "main", label: "main.tsx", language: "typescript", content: "import App from './App';\n// entry point (mocked)\nconsole.log('boot');\n" },
  { id: "api", label: "api.ts", language: "typescript", content: "export async function fetchUser(id: string) {\n  const res = await fetch(`/api/users/${id}`);\n  if (!res.ok) throw new Error('fetch failed');\n  return res.json();\n}\n" },
];
export function useTabs() {
  const [tabs, setTabs] = useState<TabDef[]>(STARTER_FILES);
  const [activeId, setActiveId] = useState("app");
  const active = tabs.find((t) => t.id === activeId) || tabs[0];
  const updateContent = useCallback((id: string, content: string) => {
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, content, dirty: true } : t)));
  }, []);
  const openFiles = useCallback((files: TabDef[]) => {
    if (!files.length) return;
    setTabs((ts) => {
      const next = [...ts];
      for (const f of files) {
        const dup = next.findIndex((t) => t.label === f.label && t.content === f.content);
        if (dup === -1) next.push(f);
      }
      return next;
    });
    setActiveId(files[files.length - 1].id);
  }, []);
  const addFile = useCallback((name?: string, content = "") => {
    const label = name || ("untitled-" + (tabs.length + 1) + ".ts");
    const id = "file-" + Date.now() + "-" + Math.floor(Math.random() * 1e5);
    setTabs((ts) => [...ts, { id, label, language: langFromName(label), content: content || ("// " + label + "\n"), dirty: true }]);
    setActiveId(id);
    return id;
  }, [tabs.length]);
  const close = useCallback((id: string) => {
    setTabs((ts) => {
      if (ts.length === 1) return ts;
      const idx = ts.findIndex((t) => t.id === id);
      const next = ts.filter((t) => t.id !== id);
      if (id === activeId) setActiveId(next[Math.max(0, idx - 1)].id);
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
  return { tabs, active, activeId, setActiveId, updateContent, close, save, setTabs, openFiles, addFile, saveAll, closeAll };
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
