import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, Target, X } from "lucide-react";
import { breadcrumbSymbols, extractSymbols, pathParts, SYMBOL_ICON, type Symbol } from "../lib/symbols";
import { fuzzyFilterTop } from "../lib/fuzzy";
import { showContextMenu } from "../lib/contextMenu";

// ---------------------------------------------------------------------------
// Breadcrumbs: file path + the symbol chain around the cursor.
//
// `symbols.ts` already had the helpers (breadcrumbSymbols / pathParts) for a
// bar that was never built; this is that bar. Clicking the path reveals the
// file, clicking a symbol jumps to it.
// ---------------------------------------------------------------------------
export function Breadcrumbs({ root, label, code, language, line, dirty, onGoto, onReveal, onGotoSymbol }: {
  root?: string | null; label: string; code: string; language: string; line: number; dirty?: boolean;
  onGoto: (line: number) => void; onReveal: () => void; onGotoSymbol: () => void;
}) {
  const symbols = useMemo(() => extractSymbols(code, language), [code, language]);
  const chain = useMemo(() => breadcrumbSymbols(symbols, line), [symbols, line]);
  const parts = useMemo(() => pathParts(label), [label]);

  return (
    <div className="crumbs" onContextMenu={(e) => showContextMenu(e, [
      { label: "Copy Full Path", command: "copy-path" },
      { label: "Reveal in File Explorer", command: "reveal-file" },
      { sep: true },
      { label: "Go to Symbol…", command: "goto-symbol" },
    ], label)}>
      {root && (
        <span className="crumb">
          <button className="crumb-btn" title={root} onClick={onReveal}>
            {root.replace(/[\\/]+$/, "").split(/[\\/]/).pop()}
          </button>
          <ChevronRight size={11} className="crumb-sep" />
        </span>
      )}
      {parts.map((p, i) => (
        <span key={p + i} className="crumb">
          {i > 0 && <ChevronRight size={11} className="crumb-sep" />}
          <button
            className={"crumb-btn" + (i === parts.length - 1 ? " last" : "")}
            title={i === parts.length - 1 ? "Reveal in File Explorer" : "Go to " + p}
            onClick={onReveal}
          >{p}</button>
        </span>
      ))}
      {chain.length > 0 && <ChevronRight size={11} className="crumb-sep" />}
      {chain.map((s) => (
        <span key={s.name + s.line} className="crumb">
          <button className="crumb-btn sym" title={s.kind + " · line " + s.line} onClick={() => onGoto(s.line)}>
            <span className="crumb-kind">{SYMBOL_ICON[s.kind] ?? "·"}</span>{s.name}
          </button>
        </span>
      ))}
      <span style={{ flex: 1 }} />
      <span className="badge">{language}</span>
      {dirty && <span className="badge badge-warn">unsaved</span>}
      <button className="crumb-btn" title="Go to symbol (Ctrl+Shift+O)" onClick={onGotoSymbol}>
        <span className="crumb-kind">#</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Go to Symbol (Ctrl+Shift+O) — fuzzy jump list for the active file.
// ---------------------------------------------------------------------------
export function GoToSymbol({ open, code, language, onClose, onGoto }: {
  open: boolean; code: string; language: string;
  onClose: () => void; onGoto: (line: number) => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const symbols: Symbol[] = useMemo(() => extractSymbols(code, language), [code, language]);

  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open, code]);
  useEffect(() => { setSel(0); }, [q]);

  const rows = useMemo(() => {
    if (!q.trim()) return symbols.slice(0, 200);
    return fuzzyFilterTop(symbols, q, (s) => s.name, 60).map((h) => h.item);
  }, [symbols, q]);

  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass palette" style={{ width: "min(520px, 92vw)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, borderBottom: "1px solid var(--border)" }}>
          <Target size={15} />
          <input ref={inputRef} className="input" style={{ border: "none", background: "transparent", fontSize: 14 }}
            value={q} placeholder="Go to symbol in this file…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(rows.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter") { e.preventDefault(); if (rows[sel]) { onGoto(rows[sel].line); onClose(); } }
            }} />
          <span className="badge">{symbols.length} symbols</span>
          <button className="icon-btn" onClick={onClose}><X size={13} /></button>
        </div>
        <div className="palette-list" style={{ maxHeight: 300 }}>
          {rows.map((s, i) => (
            <div key={s.name + s.line + i} className={"palette-item" + (i === sel ? " selected" : "")}
              onMouseEnter={() => setSel(i)} onClick={() => { onGoto(s.line); onClose(); }}>
              <span className="crumb-kind">{SYMBOL_ICON[s.kind] ?? "·"}</span>
              <span className="truncate" style={{ flex: 1 }}>
                {s.container && <span style={{ color: "var(--text-3)" }}>{s.container} › </span>}{s.name}
              </span>
              <span className="badge">{s.kind}</span>
              <span className="kbd">L{s.line}</span>
            </div>
          ))}
          {!rows.length && <div style={{ padding: 12, fontSize: 12, color: "var(--text-3)" }}>No symbols in this file.</div>}
        </div>
        <div className="palette-foot">
          <span><Search size={11} /> fuzzy match on names</span>
          <div style={{ flex: 1 }} />
          {rows[sel] && <span className="badge badge-ok">line {rows[sel].line}</span>}
        </div>
      </div>
    </div>
  );
}
