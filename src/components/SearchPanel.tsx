import { useCallback, useEffect, useRef, useState } from "react";
import { CaseSensitive, Regex, Search } from "lucide-react";
import { isDesktop } from "../lib/workspace";

type Hit = { file: string; absPath?: string; line: number; text: string };

/** Ctrl+Shift+F global search across the workspace tree (or open fallback). */
export default function SearchPanel({ onOpenHit, currentFiles }: {
  onOpenHit: (label: string, absPath?: string) => void;
  currentFiles: { label: string; content: string }[];
}) {
  const [q, setQ] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchIn = useCallback((content: string, query: string): number[] => {
    const lines: number[] = [];
    let re: RegExp;
    try {
      re = useRegex ? new RegExp(query, caseSensitive ? "g" : "gi") : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), caseSensitive ? "g" : "gi");
    } catch { return lines; }
    const arr = content.split("\n");
    for (let i = 0; i < arr.length && lines.length < 30; i++) if (re.test(arr[i])) lines.push(i + 1);
    return lines;
  }, [caseSensitive, useRegex]);

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setHits(null); return; }
    setBusy(true);
    const out: Hit[] = [];
    // Workspace tree on desktop (all files), open tabs in the browser.
    let files: { label: string; absPath?: string; content: string }[] = currentFiles;
    if (isDesktop()) {
      try {
        const ws = await import("../lib/workspace");
        const tree = (ws as any).readWorkspaceTree?.();
        const resolved = tree instanceof Promise ? await tree : tree;
        if (Array.isArray(resolved) && resolved.length) {
          files = resolved.map((f: any) => ({ label: f.label ?? f.path ?? f.name ?? "file", absPath: f.absPath ?? f.path, content: f.content ?? "" }));
        }
      } catch { /* fall back to open tabs */ }
    }
    for (const f of files) {
      if (out.length >= 200) break;
      for (const line of searchIn(f.content ?? "", query)) {
        out.push({ file: f.label, absPath: f.absPath, line, text: (f.content ?? "").split("\n")[line - 1]?.trim().slice(0, 160) ?? "" });
      }
    }
    setHits(out);
    setBusy(false);
  }, [currentFiles, searchIn]);

  // Debounced live search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setHits(null); return; }
    timer.current = setTimeout(() => void runSearch(q), 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [q, runSearch]);

  const grouped = hits ? hits.reduce<Record<string, Hit[]>>((acc, h) => { (acc[h.file] ??= []).push(h); return acc; }, {}) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Search size={14} color="var(--gold, #e9c46a)" />
        <input
          className="input" autoFocus value={q}
          placeholder="Search across files…"
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className={"icon-btn" + (caseSensitive ? " active" : "")} title="Match case" onClick={() => setCaseSensitive((v) => !v)} style={caseSensitive ? { borderColor: "var(--gold)", color: "var(--gold)" } : undefined}><CaseSensitive size={13} /></button>
        <button className={"icon-btn" + (useRegex ? " active" : "")} title="Use regular expression" onClick={() => setUseRegex((v) => !v)} style={useRegex ? { borderColor: "var(--gold)", color: "var(--gold)" } : undefined}><Regex size={13} /></button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {busy && <div style={{ color: "var(--text-2)", fontSize: 12 }}>Searching…</div>}
        {!busy && hits && Object.keys(grouped!).length === 0 && <div style={{ color: "var(--text-2)", fontSize: 12 }}>No results{isDesktop() ? "" : " (desktop app searches the whole workspace; browser searches open files)" }.</div>}
        {grouped && Object.entries(grouped).map(([file, list]) => (
          <div key={file}>
            <div style={{ fontSize: 11, color: "var(--gold, #e9c46a)", marginBottom: 2, fontWeight: 600 }}>{file} <span style={{ color: "var(--text-2)", fontWeight: 400 }}>({list.length})</span></div>
            {list.map((h, i) => (
              <button
                key={i} className="btn btn-ghost"
                onClick={() => onOpenHit(h.file, h.absPath)}
                style={{ justifyContent: "flex-start", gap: 8, width: "100%", textAlign: "left", padding: "3px 8px", borderRadius: 6, fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}
              >
                <span style={{ color: "var(--text-2)", minWidth: 26 }}>{h.line}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.text}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}