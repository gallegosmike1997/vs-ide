// ---------------------------------------------------------------------------
// The right-click menu.
//
// One themed menu component for the whole app; every surface decides what it
// offers. Items run a local callback, dispatch an app command (so the shortcut,
// the menu and this menu never disagree) or act as a separator.
//
//   showContextMenu(e, [{ label: "Paste", command: "paste" }, { sep: true }], "Terminal");
// ---------------------------------------------------------------------------
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Check } from "lucide-react";
import { hintFor } from "./commands";
import { fireCmd } from "./cmdBus";
import type { MenuAction } from "../store";

export type CtxItem = {
  /** No label + sep = separator. */
  label?: string;
  hint?: string;
  /** App command: shows its live keybinding, runs through the cmd bus. */
  command?: MenuAction;
  icon?: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
  sep?: boolean;
  run?: () => void;
};

type State = { x: number; y: number; items: CtxItem[]; title?: string } | null;

let state: State = null;
const listeners = new Set<() => void>();
const set = (s: State) => { state = s; listeners.forEach((l) => l()); };
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = () => state;

export function closeContextMenu(): void { set(null); }

/** Open the menu at the pointer. Swallows the browser menu like VS Code does. */
export function showContextMenu(
  ev: { clientX: number; clientY: number; preventDefault?: () => void },
  items: (CtxItem | null | undefined)[],
  title?: string,
): void {
  ev.preventDefault?.();
  const list = items.filter((i): i is CtxItem => !!i);
  if (!list.length) return;
  set({ x: ev.clientX, y: ev.clientY, items: list, title });
}

/** Sugar for an onContextMenu prop that computes its items at click time. */
export function ctxHandler(build: () => (CtxItem | null | undefined)[], title?: string) {
  return (e: ReactMouseEvent) => showContextMenu(e, build(), title);
}

/** Render once, near the app root. */
export default function ContextMenuHost() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshot);
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [focus, setFocus] = useState(-1);

  useEffect(() => setFocus(-1), [s]);

  // Keep the menu fully on screen (long menus near the right/bottom edge).
  useLayoutEffect(() => {
    if (!s || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      x: Math.max(6, Math.min(s.x, window.innerWidth - r.width - 8)),
      y: Math.max(6, Math.min(s.y, window.innerHeight - r.height - 8)),
    });
  }, [s]);

  // Dismiss on outside click, Escape, scroll, resize or a fresh right-click.
  useEffect(() => {
    if (!s) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) set(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); set(null); } };
    const dismiss = () => set(null);
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("wheel", dismiss, { passive: true });
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("contextmenu", dismiss, true);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("contextmenu", dismiss, true);
    };
  }, [s]);

  if (!s) return null;
  const pickable = s.items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => !it.sep && !!it.label && !it.disabled);

  const activate = (it: CtxItem) => {
    if (it.disabled || it.sep || !it.label) return;
    set(null);
    try { it.run?.(); } catch (e) { console.warn("[context-menu]", it.label, e); }
    if (it.command) fireCmd(it.command);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!pickable.length) return;
    const at = Math.max(0, pickable.findIndex((p) => p.i === focus));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = pickable[(at + dir + pickable.length) % pickable.length];
      setFocus(next.i);
      const nodes = ref.current?.querySelectorAll<HTMLButtonElement>(".ctx-item");
      nodes?.[pickable.indexOf(next)]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate((pickable[at] ?? pickable[0]).it);
    }
  };

  return (
    <div
      ref={ref}
      className="glass ctx-menu"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {s.title && <div className="ctx-title" title={s.title}>{s.title}</div>}
      {s.items.map((it, i) => {
        if (it.sep || !it.label) return <div key={"s" + i} className="menu-sep" />;
        const hint = it.hint ?? (it.command ? hintFor(it.command) : "");
        return (
          <button
            key={it.label + i}
            role="menuitem"
            className={"ctx-item" + (it.danger ? " danger" : "") + (it.disabled ? " disabled" : "")}
            disabled={it.disabled}
            title={it.title}
            onClick={() => activate(it)}
            onMouseEnter={() => setFocus(i)}
            ref={i === focus ? (el) => el?.focus() : undefined}
          >
            <span className="ctx-check">
              {typeof it.checked === "boolean" ? (it.checked ? <Check size={13} /> : null) : it.icon}
            </span>
            <span className="ctx-label">{it.label}</span>
            {hint && <span className="kbd">{hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
