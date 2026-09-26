import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Plus, RotateCcw, X } from "lucide-react";
import { showContextMenu } from "../lib/contextMenu";

export type RailSectionId = "chat" | "search" | "refactor" | "debug" | "project" | "agent" | "health";
export type RailSection = { id: RailSectionId; label: string; icon: any; badge?: ReactNode; node: ReactNode };
export type RailState = {
  visible: boolean;
  width: number;
  closed: RailSectionId[];
  collapsed: Partial<Record<RailSectionId, boolean>>;
  order: RailSectionId[];
};

const KEY = "vs-ide-rail";
export const DEFAULT_ORDER: RailSectionId[] = ["chat", "health", "search", "refactor", "debug", "project", "agent"];
export const defaultRailState = (): RailState => ({ visible: true, width: 348, closed: [], collapsed: {}, order: DEFAULT_ORDER });

/** Load the persisted side-bar layout (width / order / closed / collapsed). */
export function loadRail(): RailState {
  const d = defaultRailState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const p = JSON.parse(raw) || {};
    return {
      visible: typeof p.visible === "boolean" ? p.visible : d.visible,
      width: Number.isFinite(Number(p.width)) ? Math.min(560, Math.max(260, Number(p.width))) : d.width,
      closed: Array.isArray(p.closed) ? p.closed.filter((x: any) => DEFAULT_ORDER.includes(x)) : [],
      collapsed: p.collapsed && typeof p.collapsed === "object" ? p.collapsed : {},
      order: Array.isArray(p.order) && p.order.length ? p.order.filter((x: any) => DEFAULT_ORDER.includes(x)) : d.order,
    };
  } catch {
    return d;
  }
}
export function saveRail(s: RailState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage may be blocked */ }
}

/**
 * The right-hand "AI side bar": one collapsible, removable, drag-reorderable
 * card per AI tool, a restore popover for hidden sections, and a width that
 * persists with the rest of the layout.
 */
export default function RightRail({ state, sections, onChange, onHide }: {
  state: RailState;
  sections: RailSection[];
  onChange: (patch: Partial<RailState>) => void;
  onHide: () => void;
}) {
  const [showHidden, setShowHidden] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  const dragId = useRef<RailSectionId | null>(null);

  // Close the "sections" popover when clicking outside it (or on Escape).
  useEffect(() => {
    if (!showHidden) return;
    const h = (e: MouseEvent) => { if (popRef.current && !popRef.current.contains(e.target as Node)) setShowHidden(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setShowHidden(false); };
    window.addEventListener("mousedown", h);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", h); window.removeEventListener("keydown", esc); };
  }, [showHidden]);

  const byId = new Map(sections.map((s) => [s.id, s]));
  const ordered = [
    ...state.order.filter((id) => byId.has(id)),
    ...sections.filter((s) => !state.order.includes(s.id)).map((s) => s.id),
  ].map((id) => byId.get(id)!).filter((s) => !state.closed.includes(s.id));
  const hiddenCount = sections.filter((s) => state.closed.includes(s.id)).length;

  function reorder(from: RailSectionId, to: RailSectionId) {
    const ids = ordered.map((s) => s.id);
    const fi = ids.indexOf(from), ti = ids.indexOf(to);
    if (fi < 0 || ti < 0 || fi === ti) return;
    ids.splice(fi, 1);
    ids.splice(ti, 0, from);
    onChange({ order: [...ids, ...DEFAULT_ORDER.filter((id) => !ids.includes(id))] });
  }

  return (
    <div className="ide-right" style={{ width: state.width }}>
      <div className="rail-top">
        <span className="rail-title">AI side bar</span>
        <div style={{ position: "relative" }} ref={popRef}>
          <button className="icon-btn" title={hiddenCount ? "Show / restore hidden sections (" + hiddenCount + " hidden)" : "All sections are visible"}
            onClick={() => setShowHidden((v) => !v)}>
            <Plus size={14} />
          </button>
          {showHidden && (
            <div className="glass rail-pop">
              <div className="rail-pop-title">Sections — click to toggle</div>
              {sections.map((s) => {
                const isClosed = state.closed.includes(s.id);
                const Icon = s.icon;
                return (
                  <button key={s.id} className="rail-pop-row"
                    title={isClosed ? "Bring back " + s.label : s.label + " is visible — click to remove it"}
                    onClick={() => onChange({ closed: isClosed ? state.closed.filter((x) => x !== s.id) : [...state.closed, s.id] })}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <Icon size={13} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    {isClosed ? <Plus size={13} /> : <span className="badge">on</span>}
                  </button>
                );
              })}
              {!!hiddenCount && (
                <button className="rail-pop-row" style={{ justifyContent: "center", gap: 6, color: "var(--gold)" }}
                  onClick={() => { onChange({ closed: [] }); setShowHidden(false); }}>
                  <RotateCcw size={12} /> Restore all
                </button>
              )}
            </div>
          )}
        </div>
        <button className="icon-btn" title="Hide the AI side bar (Ctrl+Alt+B)" onClick={onHide}><X size={14} /></button>
      </div>

      {!ordered.length && (
        <div className="glass rail-empty">
          <div style={{ fontSize: 12 }}>Every section is hidden.</div>
          <button className="btn btn-sm btn-primary" onClick={() => onChange({ closed: [] })}><RotateCcw size={13} /> Restore sections</button>
        </div>
      )}

      {ordered.map((s) => {
        const open = !state.collapsed[s.id];
        const Icon = s.icon;
        return (
          <div key={s.id} className={"glass rail-section" + (open ? " open" : "")}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragId.current && dragId.current !== s.id) reorder(dragId.current, s.id); dragId.current = null; }}
          >
            <div className="rail-head" draggable
              onDragStart={() => { dragId.current = s.id; }}
              onDragEnd={() => { dragId.current = null; }}
              onClick={() => onChange({ collapsed: { ...state.collapsed, [s.id]: open } })}
              onContextMenu={(e) => showContextMenu(e, [
                { label: open ? "Collapse Section" : "Expand Section", run: () => onChange({ collapsed: { ...state.collapsed, [s.id]: !open } }) },
                { label: "Collapse All Sections", run: () => onChange({ collapsed: Object.fromEntries(sections.map((x) => [x.id, true])) }) },
                { label: "Expand All Sections", run: () => onChange({ collapsed: {} }) },
                { sep: true },
                { label: "Move Up", disabled: state.order.indexOf(s.id) <= 0, run: () => { reorder(s.id, state.order[state.order.indexOf(s.id) - 1]); } },
                { label: "Move Down", disabled: state.order.indexOf(s.id) < 0 || state.order.indexOf(s.id) >= state.order.length - 1, run: () => { reorder(s.id, state.order[state.order.indexOf(s.id) + 1]); } },
                { sep: true },
                { label: "Hide This Section", danger: true, run: () => onChange({ closed: [...state.closed, s.id] }) },
                { label: "Hide the Whole AI Side Bar", danger: true, command: "toggle-rightbar" },
              ], s.label)}
              title={open ? "Collapse this section" : "Expand this section"}
            >
              {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <Icon size={13} className="rail-icon" />
              <span className="rail-label">{s.label}</span>
              {s.badge}
              <button className="icon-btn rail-x" draggable={false}
                title={"Remove " + s.label + " from the side bar"}
                onClick={(e) => { e.stopPropagation(); onChange({ closed: [...state.closed, s.id] }); }}>
                <X size={12} />
              </button>
            </div>
            {open && <div className="rail-body">{s.node}</div>}
          </div>
        );
      })}
      <div style={{ flexShrink: 0, fontSize: 10.5, color: "var(--text-3)", textAlign: "center", padding: "2px 0 6px" }}>
        drag a header to reorder · ✕ removes · + restores
      </div>
    </div>
  );
}

