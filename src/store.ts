import { useCallback, useEffect, useState } from "react";
export type Toast = { id: number; title: string; body?: string; kind?: "info" | "ok" | "warn" | "error" };
export type TabDef = { id: string; label: string; language: string; content: string; dirty?: boolean };
export type Activity = "explorer" | "search" | "chat" | "refactor" | "debug" | "project";
export type DockTab = "terminal" | "actions" | "problems" | "output";
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
  return { tabs, active, activeId, setActiveId, updateContent, close, save, setTabs };
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
