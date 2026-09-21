import { useMemo } from "react";
import { Box, Braces, Hash } from "lucide-react";

export type Sym = { name: string; kind: "function" | "class" | "method" | "variable"; line: number };

/** Language-agnostic regex outline — no external parser needed. */
export function extractSymbols(code: string, _lang?: string): Sym[] {
  const out: Sym[] = [];
  const lines = code.split("\n");
  const seen = new Set<string>();
  const push = (name: string, kind: Sym["kind"], line: number) => {
    if (!name || seen.has(kind + ":" + name + ":" + line)) return;
    seen.add(kind + ":" + name + ":" + line);
    out.push({ name, kind, line });
  };
  lines.forEach((raw, i) => {
    const ln = raw.trim();
    const n = i + 1;
    let m: RegExpMatchArray | null;
    // classes / structs / interfaces / traits / types
    if ((m = ln.match(/^(?:export\s+)?(?:abstract\s+)?(?:class|struct|interface|trait|enum)\s+([A-Za-z_$][\w$]*)/))) push(m[1], "class", n);
    else if ((m = ln.match(/^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*=/))) push(m[1], "class", n);
    // functions: function f(), def f(), fn f(), func f(), const f = (...) =>, f = async ()
    else if ((m = ln.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/))) push(m[1], "function", n);
    else if ((m = ln.match(/^(?:pub\s+)?(?:async\s+)?def\s+([A-Za-z_]\w*)/))) push(m[1], "function", n);
    else if ((m = ln.match(/^(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z_]\w*)/))) push(m[1], "function", n);
    else if ((m = ln.match(/^func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/))) push(m[1], "function", n);
    else if ((m = ln.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>/))) push(m[1], "function", n);
    else if ((m = ln.match(/^(?:local\s+)?function\s+([A-Za-z_][\w.:]*)/))) push(m[1], "function", n); // lua
    else if ((m = ln.match(/^sub\s+([A-Za-z_]\w*)/))) push(m[1], "function", n); // perl
    // methods: indented name(...) {  — common in TS/Java/C#/Rust impls
    else if ((m = ln.match(/^(?:public|private|protected|static|override|async|pub|\s)*\s*([A-Za-z_]\w*)\s*\([^;{]*\)\s*(?::\s*[\w<>\[\], .|]+)?\s*\{$/)) && raw.startsWith(" ") && !/\b(if|for|while|switch|catch|return|function|fn|def)\b/.test(ln)) push(m[1], "method", n);
    // top-level constants / module attrs
    else if ((m = ln.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\s*=/))) push(m[1], "variable", n);
  });
  return out.slice(0, 300);
}

const ICONS = { class: Box, function: Braces, method: Hash, variable: Hash } as const;

/** Outline panel: symbol list for the active file, click to jump. */
export default function OutlinePanel({ code, onGoto }: { code: string; onGoto: (line: number) => void }) {
  const syms = useMemo(() => extractSymbols(code), [code]);
  if (!syms.length) return <div style={{ padding: 10, color: "var(--text-2)", fontSize: 12 }}>No symbols detected in this file.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "6px 4px", overflowY: "auto", height: "100%" }}>
      {syms.map((s, i) => {
        const Icon = ICONS[s.kind];
        return (
          <button
            key={s.kind + s.name + s.line + i}
            className="btn btn-ghost"
            onClick={() => onGoto(s.line)}
            title={`${s.kind} ${s.name} — line ${s.line}`}
            style={{ justifyContent: "flex-start", gap: 8, padding: "4px 8px", fontSize: 12, borderRadius: 6, width: "100%", textAlign: "left" }}
          >
            <Icon size={12} color={s.kind === "class" ? "var(--gold, #e9c46a)" : "var(--text-2)"} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: s.kind === "method" ? 8 : 0 }}>{s.name}</span>
            <span style={{ color: "var(--text-2)", fontSize: 10 }}>{s.line}</span>
          </button>
        );
      })}
    </div>
  );
}