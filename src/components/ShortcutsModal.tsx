import { useEffect, useMemo, useState } from "react";
import { Keyboard, RotateCcw, Search, X } from "lucide-react";
import {
  COMMANDS, chordFromEvent, chordLabel, chordMap, conflicts, isCustom, keysFor,
  rebind, resetAllKeys, resetCommand, setKeys, useKeybindings, type CommandGroup,
} from "../lib/commands";
import type { MenuAction } from "../store";

const GROUPS: CommandGroup[] = ["File", "Edit", "Selection", "View", "Go", "Run", "AI", "Help"];

/**
 * Keyboard shortcut editor: every command in the registry, grouped like the
 * menus. Click a key (or focus it and press Enter) and hit the combination you
 * want - it is stored immediately and the menus, tooltips and global key
 * handler all follow, because they read the same registry.
 */
export default function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ov = useKeybindings();
  const [group, setGroup] = useState<CommandGroup>("File");
  const [q, setQ] = useState("");
  const [listen, setListen] = useState<MenuAction | null>(null);
  const [saved, setSaved] = useState("");

  // Recording mode swallows the keystroke before the app's own handler sees it.
  useEffect(() => {
    if (!listen) return;
    const h = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") { setListen(null); return; }
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;  // still assembling
      if (e.key === "Delete" || e.key === "Backspace") { setKeys(listen, []); setListen(null); return; }
      const chord = chordFromEvent(e);
      if (!chord) return;
      rebind(listen, listen, chord);
      setListen(null);
      setSaved("Shortcut updated.");
      window.setTimeout(() => setSaved(""), 1800);
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [listen]);

  const clash = useMemo(() => conflicts(ov), [ov]);
  const clashCount = Object.keys(clash).length;
  // Defaults that another command has claimed are no longer really bound, so
  // the editor must not show them as if they were.
  const owner = useMemo(() => chordMap(ov), [ov]);
  const term = q.trim().toLowerCase();
  const rows = COMMANDS.filter((c) =>
    (term ? true : c.group === group) &&
    (!term || c.label.toLowerCase().includes(term) || c.group.toLowerCase().includes(term))
  );

  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" style={{ width: "min(720px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span><Keyboard size={13} style={{ marginRight: 6 }} />Keyboard Shortcuts</span>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: 9, color: "var(--text-3)" }} />
            <input className="input kb-search" style={{ paddingLeft: 28 }} placeholder="Search commands…"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="kb-editor">
            <div className="kb-groups">
              {GROUPS.map((g) => (
                <button key={g} className={"kb-group" + (g === group && !term ? " active" : "")}
                  onClick={() => { setGroup(g); setQ(""); }}>
                  {g}
                  <span className="badge" style={{ marginLeft: 6 }}>{COMMANDS.filter((c) => c.group === g).length}</span>
                </button>
              ))}
            </div>
            <div className="kb-list">
              {rows.map((c) => {
                const keys = keysFor(c.id, ov).filter((k) => owner.get(k) === c.id);
                return (
                  <div key={c.id} className={"kb-row" + (isCustom(c.id) ? " custom" : "")}>
                    <span className="kb-label">{c.label}</span>
                    <button
                      className={"kb-key" + (listen === c.id ? " listening" : "") + (keys.length ? "" : " kb-unbound")}
                      title={listen === c.id ? "Press the new combination (Esc cancels, Del clears)" : "Click, then press the new combination"}
                      onClick={() => setListen(c.id === listen ? null : c.id)}
                    >
                      {listen === c.id ? "press keys…" : keys.length ? chordLabel(keys[0]) : "unbound"}
                    </button>
                    {isCustom(c.id) && (
                      <button className="icon-btn kb-reset" title="Back to the default shortcut"
                        onClick={() => resetCommand(c.id)}><RotateCcw size={12} /></button>
                    )}
                  </div>
                );
              })}
              {!rows.length && <div style={{ fontSize: 12, color: "var(--text-3)", padding: 10 }}>No command matches.</div>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11.5, color: "var(--text-3)" }}>
            {clashCount > 0 ? (
              <span className="kb-warn">{clashCount} shortcut(s) claimed by two commands - the later one wins.</span>
            ) : (
              <span>Click a shortcut to change it. Changes are saved straight away.</span>
            )}
            <div style={{ flex: 1 }} />
            {saved && <span style={{ color: "var(--gold-hi)" }}>{saved}</span>}
            <button className="btn btn-sm btn-ghost" onClick={resetAllKeys} title="Restore every default shortcut">
              <RotateCcw size={12} /> Reset all
            </button>
            <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
