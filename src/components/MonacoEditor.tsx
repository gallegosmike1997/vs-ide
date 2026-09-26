import { useEffect, useRef } from "react";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import { callLLM } from "../lib/aiClient";
import { applyMonacoTheme, themeNameFor } from "../lib/monacoTheme";
import type { Problem } from "./ProblemsPanel";
import type { AgentMode } from "../store";
type Props = {
  value: string; language: string; fontSize: number; wordWrap: boolean; mode: AgentMode;
  onChange: (v: string) => void;
  onCursor: (line: number, col: number) => void;
  onProblems: (p: Problem[]) => void;
  gotoLine: number | null; onGotoDone: () => void;
  findSignal?: number;
  editSignal?: { n: number; cmd: string } | null;
  /** Show the minimap in the gutter (View → Minimap). */
  minimap?: boolean;
  /** App owns the right-click menu so it matches the rest of the IDE. */
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Current selection (empty when the cursor is collapsed) — powers the
   *  "Explain selection" style actions. */
  onSelection?: (text: string) => void;
};
function localChecks(code: string): Problem[] {
  const out: Problem[] = [];
  const lines = code.split("\n");
  lines.forEach((ln, i) => {
    const n = i + 1;
    if (ln.length > 140) out.push({ line: n, message: "Line exceeds 140 chars (" + ln.length + "). Consider wrapping.", severity: "info", source: "local" });
    if (/console\.log/.test(ln)) out.push({ line: n, message: "console.log left in code - remove before commit.", severity: "warn", source: "local" });
    if (/\bany\b/.test(ln)) out.push({ line: n, message: "Avoid `any` - prefer explicit types.", severity: "warn", source: "local" });
    if (/TODO|FIXME/.test(ln)) out.push({ line: n, message: ln.trim(), severity: "info", source: "local" });
    if (/==(?!=)/.test(ln)) out.push({ line: n, message: "Use === instead of == to avoid coercion bugs.", severity: "warn", source: "local" });
    if (/eval\s*\(/.test(ln)) out.push({ line: n, message: "eval() is dangerous - avoid.", severity: "error", source: "local" });
  });
  const opens = (code.match(/{/g) || []).length, closes = (code.match(/}/g) || []).length;
  if (opens !== closes) out.push({ line: lines.length, message: "Bracket imbalance: " + opens + " vs " + closes + ".", severity: "error", source: "local" });
  const oP = (code.match(/\(/g) || []).length, cP = (code.match(/\)/g) || []).length;
  if (oP !== cP) out.push({ line: lines.length, message: "Paren imbalance: " + oP + " vs " + cP + ".", severity: "error", source: "local" });
  return out.slice(0, 40);
}
export default function MonacoEditor({ value, language, fontSize, wordWrap, mode, onChange, onCursor, onProblems, gotoLine, onGotoDone, findSignal, editSignal, minimap = true, onContextMenu, onSelection }: Props) {
  const ref = useRef<any>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDeco = useRef<string[]>([]);
  // Kept in a ref so the mount handler can report the selection without
  // re-registering listeners on every keystroke.
  const selCb = useRef(onSelection);
  selCb.current = onSelection;
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
        const parts = ln.split("-");
        const num = parseInt(parts[0].replace("LINE:", "").trim(), 10);
        const text = parts.slice(1).join("-").trim();
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
    applyMonacoTheme(monaco, mode);
    ed.onDidChangeCursorPosition((e: any) => onCursor(e.position.lineNumber, e.position.column));
    // Report the selection (empty when collapsed) so the context menu can
    // offer "Explain selection" only when it makes sense.
    ed.onDidChangeCursorSelection(() => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      const text = sel && !sel.isEmpty() && model ? model.getValueInRange(sel) : "";
      selCb.current?.(text);
    });
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => { window.dispatchEvent(new CustomEvent("vs-ide:save")); });
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
  useEffect(() => {
    if (findSignal && ref.current) { ref.current.getAction("actions.find")?.run(); }
  }, [findSignal]);
  useEffect(() => {
    const ed = ref.current;
    if (!editSignal || !ed) return;
    const c = editSignal.cmd;
    try {
      ed.focus();
      const run = (id: string) => { const a = ed.getAction(id); if (a) { void a.run(); return true; } return false; };
      const first = (...ids: string[]) => ids.some(run);
      // "monaco:<actionId>" lets the context menu run any Monaco action.
      if (c.startsWith("monaco:")) run(c.slice(7));
      else if (c === "undo") ed.getModel()?.undo();
      else if (c === "redo") ed.getModel()?.redo();
      else if (c === "cut") run("editor.action.clipboardCutAction");
      else if (c === "copy") run("editor.action.clipboardCopyAction");
      else if (c === "paste") run("editor.action.clipboardPasteAction");
      else if (c === "select-all") run("editor.action.selectAll");
      else if (c === "format") first("editor.action.formatDocument", "editor.action.formatSelection");
      else if (c === "comment") first("editor.action.commentLine", "editor.action.blockComment");
      else if (c === "comment-block") first("editor.action.blockComment", "editor.action.commentLine");
      else if (c === "fold") run("editor.foldAll");
      else if (c === "unfold") run("editor.unfoldAll");
      else if (c === "find-replace") first("editor.action.startFindReplaceAction", "actions.find");
      else if (c === "find-next") first("actions.findNextMatchWithSelection", "editor.action.findNext");
      else if (c === "find-previous") first("actions.findPreviousMatchWithSelection", "editor.action.findPrevious");
      else if (c === "duplicate-line") first("editor.action.copyLinesDownAction", "editor.action.duplicateSelection");
      else if (c === "delete-line") first("editor.action.deleteLinesAction", "editor.action.removeLinesDownAction", "editor.action.deleteLines");
      else if (c === "move-line-up") first("editor.action.moveLinesUpAction", "editor.action.moveLinesUp");
      else if (c === "move-line-down") first("editor.action.moveLinesDownAction", "editor.action.moveLinesDown");
      else if (c === "indent") first("editor.action.indentLines", "editor.action.indent");
      else if (c === "outdent") first("editor.action.outdentLines", "editor.action.outdent");
      else if (c === "join-lines") first("editor.action.joinLines", "editor.action.joinLinesAction");
      else if (c === "trim-whitespace") first("editor.action.trimTrailingWhitespace", "editor.action.trimTrailingWhitespaceAction");
      else if (c === "sort-lines-up") first("editor.action.sortLinesAscending", "editor.action.sortLinesAscendingAction");
      else if (c === "sort-lines-down") first("editor.action.sortLinesDescending", "editor.action.sortLinesDescendingAction");
      else if (c === "transform-upper") first("editor.action.transformToUppercase", "editor.action.transformToUppercaseAction");
      else if (c === "transform-lower") first("editor.action.transformToLowercase", "editor.action.transformToLowercaseAction");
      else if (c === "expand-selection") first("editor.action.smartSelect.expand", "editor.action.expandSelection");
      else if (c === "shrink-selection") first("editor.action.smartSelect.shrink", "editor.action.shrinkSelection");
      else if (c === "add-cursor-next") first("editor.action.insertCursorAtEndOfEachLineSelected", "editor.action.addSelectionToNextFindMatch", "editor.action.insertCursorAtEndOfEachLineSelected");
      else if (c === "add-cursor-below") first("editor.action.insertCursorBelow", "editor.action.insertCursorAtEndOfEachLineSelected");
      else if (c === "add-cursor-above") first("editor.action.insertCursorAbove", "editor.action.insertCursorAtStartOfEachLineSelected");
      else if (c === "select-line") {
        // No built-in: select the whole line the cursor sits on.
        const pos = ed.getPosition();
        const model = ed.getModel();
        if (pos && model) {
          const last = model.getLineMaxColumn(Math.min(model.getLineCount(), pos.lineNumber));
          ed.setSelection({ startLineNumber: pos.lineNumber, startColumn: 1, endLineNumber: pos.lineNumber, endColumn: last });
          ed.revealLineInCenter(pos.lineNumber);
        }
      }
    } catch (e) { console.warn("[edit]", e); }
  }, [editSignal]);
  // Re-apply the Monaco theme whenever the Think/Do agent mode changes.
  useEffect(() => {
    const monaco = (ref.current as any)?._monaco;
    if (monaco) applyMonacoTheme(monaco, mode);
  }, [mode]);
  return (
    <div className="glass" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", padding: 8 }}
      onContextMenu={onContextMenu}>
      <Editor
        height="100%" theme={themeNameFor(mode)} language={language} value={value}
        beforeMount={(m: any) => applyMonacoTheme(m, mode)}
        onMount={mount} onChange={change}
        options={{ fontSize, wordWrap: wordWrap ? "on" : "off", minimap: { enabled: minimap, scale: 1 }, contextmenu: false, automaticLayout: true, glyphMargin: true, padding: { top: 12 }, scrollBeyondLastLine: false, smoothScrolling: true, cursorSmoothCaretAnimation: "on", renderLineHighlight: "all", bracketPairColorization: { enabled: true } as any, fontLigatures: true, fontFamily: "JetBrains Mono, Cascadia Code, Menlo, monospace" }}
      />
    </div>
  );
}
