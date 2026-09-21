import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, FileCode2, Search } from "lucide-react";
import type { TabDef } from "../store";

/** Ctrl+P quick-open: fuzzy-filter across open files, keyboard first. */
export default function QuickOpen({ open, onClose, tabs, onOpenFile }: {
  open: boolean; onClose: () => void; tabs: TabDef[]; onOpenFile: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const scored = tabs.map((t) => {
      const label = t.label.toLowerCase();
      let score = -1;
      if (!s) score = 0;
      else if (label === s) score = 100;
      else if (label.startsWith(s)) score = 80;
      else if (label.includes(s)) score = 60;
      else {
        // fuzzy subsequence match
        let li = 0;
        for (const ch of s) { li = label.indexOf(ch, li); if (li === -1) break; li++; }
        if (li !== -1 || s === "") score = 20;
      }
      return { t, score };
    }).filter((x) => x.score >= 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 14).map((x) => x.t);
  }, [q, tabs]);

  useEffect(() => { setIdx((i) => Math.min(i, Math.max(0, results.length - 1))); }, [results.length]);

  if (!open) return null;
  const commit = (t?: TabDef) => {
    if (!t) return;
    onOpenFile(t.id);
    onClose();
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 90, background: "rgba(6,2,4,0.55)", backdropFilter: "blur(3px)" }} onMouseDown={onClose}>
      <div className="glass" style={{ width: 520, maxWidth: "92vw", padding: 10, boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(233,196,106,0.25)" }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Search size={15} color="var(--gold, #e9c46a)" />
          <input
            ref={inputRef} value={q} autoFocus
            placeholder="Go to file… (type a name, ↑↓ to choose, Enter to open)"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); commit(results[idx]); }
            }}
            style={{ flex: 1, background: "var(--panel, rgba(0,0,0,0.3))", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", color: "var(--text-0)", fontSize: 13, outline: "none" }}
          />
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {results.length === 0 && <div style={{ padding: "10px 8px", color: "var(--text-2)", fontSize: 12 }}>No matching files — open a folder or add files first.</div>}
          {results.map((t, i) => (
            <button
              key={t.id}
              onClick={() => commit(t)}
              onMouseEnter={() => setIdx(i)}
              className="btn btn-ghost"
              style={{ justifyContent: "flex-start", gap: 8, width: "100%", textAlign: "left", padding: "7px 10px", borderRadius: 8, background: i === idx ? "var(--maroon-glow, rgba(122,15,43,0.35))" : "transparent", border: "1px solid " + (i === idx ? "var(--gold, #e9c46a)" : "transparent") }}
            >
              <FileCode2 size={14} color="var(--gold, #e9c46a)" />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
              <span className="badge" style={{ fontSize: 10 }}>{t.language}</span>
              {i === idx && <CornerDownLeft size={12} color="var(--text-2)" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}