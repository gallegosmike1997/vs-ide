import { useEffect, useRef } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import { callLLM } from "../aiClient";
import type { Problem } from "./ProblemsPanel";
type Props = {
  value: string; language: string; fontSize: number;
  onChange: (v: string) => void;
  onCursor: (line: number, col: number) => void;
  onProblems: (p: Problem[]) => void;
  gotoLine: number | null; onGotoDone: () => void;
};
function localChecks(code: string): Problem[] {
  const out: Problem[] = [];
  const lines = code.split("\n");
  lines.forEach((ln, i) => {
    const n = i + 1;
    if (ln.length > 140) out.push({ line: n, message: `Line exceeds 140 chars (${ln.length}). Consider wrapping.`, severity: "info", source: "local" });
    if (/console\.log/.test(ln)) out.push({ line: n, message: "console.log left in code — remove before commit.", severity: "warn", source: "local" });
    if (/\bany\b/.test(ln)) out.push({ line: n, message: "Avoid `any` — prefer explicit types.", severity: "warn", source: "local" });
    if (/TODO|FIXME/.test(ln)) out.push({ line: n, message: ln.trim(), severity: "info", source: "local" });
  });
  // naive bracket balance
  const opens = (code.match(/{/g) || []).length, closes = (code.match(/}/g) || []).length;
  if (opens !== closes) out.push({ line: lines.length, message: `Bracket imbalance: ${opens} '{' vs ${closes} '}'.`, severity: "error", source: "local" });
  return out.slice(0, 30);
}
export default function MonacoEditor({ value, language, fontSize, onChange, onCursor, onProblems, gotoLine, onGotoDone }: Props) {
  const ref = useRef<any>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDeco = useRef<string[]>([]);
  async function runAI(code: string) {
    const ed = ref.current;
    onProblems(localChecks(code));
    if (!ed || !code.trim()) return;
    try {
      const prompt = "Return ONLY lines like: LINE: <n> - <short hint>. Check bugs, types, perf.\n\n" + code.slice(0, 6000);
      const res = await callLLM(prompt);
      const hints: { line: number; text: string }[] = [];
      for (const ln of res.split("\n")) {
        if (!ln.includes("LINE:")) continue;
        const [a, ...rest] = ln.split("-");
        const num = parseInt(a.replace("LINE:", "").trim(), 10);
        const text = rest.join("-").trim();
        if (!isNaN(num) && text) hints.push({ line: num, text });
      }
      const monaco = (ed as any)._monaco ?? (window as any).monaco;
      if (!monaco) return;
      lastDeco.current = ed.deltaDecorations(lastDeco.current, hints.map((h) => ({
        range: new monaco.Range(h.line, 1, h.line, 1),
        options: { isWholeLine: true, glyphMarginClassName: "ai-hint-glyph", glyphMarginHoverMessage: { value: h.text }, inlineClassName: "ai-inline-annotation" },
      })));
    } catch (e) { console.warn(e); }
  }
  const mount: OnMount = (ed, monaco) => {
    (ref.current as any) = ed; (ed as any)._monaco = monaco;
    ed.onDidChangeCursorPosition((e: any) => onCursor(e.position.lineNumber, e.position.column));
    runAI(value);
  };
  const change: OnChange = (v) => {
    const s = v ?? "";
    onChange(s);
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => runAI(s), 900);
  };
  useEffect(() => {
    if (gotoLine && ref.current) {
      ref.current.revealLineInCenter(gotoLine);
      ref.current.setPosition({ lineNumber: gotoLine, column: 1 });
      ref.current.focus();
      onGotoDone();
    }
  }, [gotoLine, onGotoDone]);
  return (
    <div className="glass" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", padding: 8 }}>
      <Editor
        height="100%" theme="vs-dark" language={language} value={value}
        onMount={mount} onChange={change}
        options={{ fontSize, minimap: { enabled: true, scale: 1 }, automaticLayout: true, glyphMargin: true, padding: { top: 12 }, scrollBeyondLastLine: false, smoothScrolling: true, cursorSmoothCaretAnimation: "on", renderLineHighlight: "all", bracketPairColorization: { enabled: true } as any, fontLigatures: true, fontFamily: "JetBrains Mono, Cascadia Code, Menlo, monospace" }}
      />
    </div>
  );
}
