/**
 * Single source of truth for the editor's Monaco themes: royal-blue "idea",
 * royal-purple "think", and the maroon / gold / platinum "do" cockpit.
 *
 * Registered on every Monaco instance (the main editor and the AI diff viewer
 * each get their own `monaco` object), so `defineTheme` is idempotent by design.
 */
import type { AgentMode } from "../store";

export const MONACO_THEME = "mzsg-maroon";
export const MONACO_THEME_THINK = "mzsg-think";
export const MONACO_THEME_IDEA = "mzsg-idea";

/** Which registered theme name a mode should use. */
export function themeNameFor(mode: AgentMode): string {
  if (mode === "think") return MONACO_THEME_THINK;
  if (mode === "idea") return MONACO_THEME_IDEA;
  return MONACO_THEME;
}

/** Royal-blue token colours for IDEA mode. */
const IDEA_FG: Record<string, string> = {
  e9c46a: "60a5fa",
  f9e7a8: "93c5fd",
  ffd98e: "bfdbfe",
  d9a441: "3b82f6",
  f2d9a0: "a5b4fc",
};

/** Idea mode chrome — royal blue accents. */
const IDEA_COLORS: Record<string, string> = {
  "editor.lineHighlightBackground": "#0c1530",
  "editorLineNumber.activeForeground": "#60a5fa",
  "editorCursor.foreground": "#93c5fd",
  "editor.selectionBackground": "#3b82f666",
  "editor.inactiveSelectionBackground": "#3b82f633",
  "editor.selectionHighlightBackground": "#3b82f633",
  "editor.wordHighlightBackground": "#3b82f62e",
  "editor.findMatchBackground": "#3b82f677",
  "editor.findMatchHighlightBackground": "#3b82f644",
  "editorBracketMatch.background": "#3b82f64d",
  "editorBracketMatch.border": "#60a5fa",
  "editorGutter.modifiedBackground": "#60a5fa",
  "editorIndentGuide.activeBackground1": "#1e3a8a",
  "editorWidget.border": "#60a5fa55",
  "editorSuggestWidget.border": "#60a5fa55",
  "editorSuggestWidget.selectedBackground": "#60a5fa66",
  "editorHoverWidget.border": "#60a5fa55",
  "editorOverviewRuler.findMatchForeground": "#60a5fa",
  "scrollbarSlider.background": "#60a5fa55",
  "scrollbarSlider.hoverBackground": "#60a5fa77",
  "scrollbarSlider.activeBackground": "#60a5faaa",
  "input.border": "#60a5fa44",
  "list.activeSelectionBackground": "#60a5fa66",
};

/** Royal-purple token colours for THINK mode. */
const THINK_FG: Record<string, string> = {
  e9c46a: "a78bfa",
  f9e7a8: "c4b5fd",
  ffd98e: "ddd6fe",
  d9a441: "8b5cf6",
  f2d9a0: "d8b4fe",
};

/** Think mode chrome — royal purple accents. */
const THINK_COLORS: Record<string, string> = {
  "editor.lineHighlightBackground": "#170f2e",
  "editorLineNumber.activeForeground": "#a78bfa",
  "editorCursor.foreground": "#c4b5fd",
  "editor.selectionBackground": "#8b5cf666",
  "editor.inactiveSelectionBackground": "#8b5cf633",
  "editor.selectionHighlightBackground": "#8b5cf633",
  "editor.wordHighlightBackground": "#8b5cf62e",
  "editor.findMatchBackground": "#8b5cf677",
  "editor.findMatchHighlightBackground": "#8b5cf644",
  "editorBracketMatch.background": "#8b5cf64d",
  "editorBracketMatch.border": "#a78bfa",
  "editorGutter.modifiedBackground": "#a78bfa",
  "editorIndentGuide.activeBackground1": "#4c1d95",
  "editorWidget.border": "#a78bfa55",
  "editorSuggestWidget.border": "#a78bfa55",
  "editorSuggestWidget.selectedBackground": "#a78bfa66",
  "editorHoverWidget.border": "#a78bfa55",
  "editorOverviewRuler.findMatchForeground": "#a78bfa",
  "scrollbarSlider.background": "#a78bfa55",
  "scrollbarSlider.hoverBackground": "#a78bfa77",
  "scrollbarSlider.activeBackground": "#a78bfaaa",
  "input.border": "#a78bfa44",
  "list.activeSelectionBackground": "#a78bfa66",
};

/** Define all variants once, then activate the theme for `mode`. */
export function applyMonacoTheme(monaco: any, mode: AgentMode = "do"): void {
  if (!monaco?.editor?.defineTheme) return;
  try {
    defineOne(monaco, MONACO_THEME, "do");
    defineOne(monaco, MONACO_THEME_IDEA, "idea");
    defineOne(monaco, MONACO_THEME_THINK, "think");
    monaco.editor.setTheme(themeNameFor(mode));
  } catch (e) {
    console.warn("[monacoTheme]", e);
  }
}

function defineOne(monaco: any, name: string, mode: "do" | "idea" | "think"): void {
  const tint = mode === "idea" ? IDEA_COLORS : mode === "think" ? THINK_COLORS : null;
  const fgMap = mode === "idea" ? IDEA_FG : mode === "think" ? THINK_FG : null;
  const rules: any[] = [
        { token: "", foreground: "f4e9d8", background: "150a0f" },
        { token: "comment", foreground: "8a6f75", fontStyle: "italic" },
        { token: "keyword", foreground: "e9c46a", fontStyle: "bold" },
        { token: "keyword.control", foreground: "f9e7a8", fontStyle: "bold" },
        { token: "string", foreground: "e8b98a" },
        { token: "string.escape", foreground: "f9e7a8" },
        { token: "number", foreground: "d9a441" },
        { token: "regexp", foreground: "c2244a" },
        { token: "type", foreground: "f2d9a0" },
        { token: "type.identifier", foreground: "f2d9a0" },
        { token: "identifier", foreground: "f4e9d8" },
        { token: "function", foreground: "ffd98e" },
        { token: "variable", foreground: "f4e9d8" },
        { token: "variable.parameter", foreground: "e8dcc4" },
        { token: "constant", foreground: "e9c46a" },
        { token: "operator", foreground: "cbb6a4" },
        { token: "delimiter", foreground: "b9a08f" },
        { token: "delimiter.bracket", foreground: "e9c46a" },
        { token: "tag", foreground: "e9c46a" },
        { token: "attribute.name", foreground: "ffd98e" },
        { token: "attribute.value", foreground: "e8b98a" },
        // Markdown / plain
        { token: "keyword.md", foreground: "e9c46a", fontStyle: "bold" },
        { token: "string.link", foreground: "ffd98e" },
  ].map((r: any) => (fgMap && r.foreground && fgMap[r.foreground] ? { ...r, foreground: fgMap[r.foreground] } : r));
  const colors: Record<string, string> = {
        "editor.background": "#150a0f",
        "editor.foreground": "#f4e9d8",
        "editor.lineHighlightBackground": "#1f0d16",
        "editor.lineHighlightBorder": "#00000000",
        "editorLineNumber.foreground": "#6b4a52",
        "editorLineNumber.activeForeground": "#e9c46a",
        "editorCursor.foreground": "#f9e7a8",
        "editor.selectionBackground": "#7a0f2b66",
        "editor.inactiveSelectionBackground": "#7a0f2b33",
        "editor.selectionHighlightBackground": "#c2244a33",
        "editor.wordHighlightBackground": "#c2244a2e",
        "editor.findMatchBackground": "#c2244a77",
        "editor.findMatchHighlightBackground": "#e9c46a44",
        "editorBracketMatch.background": "#7a0f2b4d",
        "editorBracketMatch.border": "#e9c46a",
        "editorGutter.background": "#12080c",
        "editorGutter.modifiedBackground": "#e9c46a",
        "editorGutter.addedBackground": "#57c98a",
        "editorGutter.deletedBackground": "#c2244a",
        "editorIndentGuide.background1": "#33161f",
        "editorIndentGuide.activeBackground1": "#7a0f2b",
        "editorWhitespace.foreground": "#3d2029",
        "editorWidget.background": "#1b0c13",
        "editorWidget.border": "#e9c46a55",
        "editorSuggestWidget.background": "#1b0c13",
        "editorSuggestWidget.border": "#e9c46a55",
        "editorSuggestWidget.selectedBackground": "#7a0f2b66",
        "editorHoverWidget.background": "#1b0c13",
        "editorHoverWidget.border": "#e9c46a55",
        "editorOverviewRuler.border": "#00000000",
        "editorOverviewRuler.findMatchForeground": "#e9c46a",
        "minimap.background": "#12080c",
        "scrollbarSlider.background": "#7a0f2b55",
        "scrollbarSlider.hoverBackground": "#c2244a77",
        "scrollbarSlider.activeBackground": "#e9c46a88",
        "input.background": "#12080c",
        "input.border": "#e9c46a44",
        "dropdown.background": "#1b0c13",
        "list.hoverBackground": "#2a1620",
        "list.activeSelectionBackground": "#7a0f2b66",
    "diffEditor.insertedTextBackground": "#57c98a33",
    "diffEditor.removedTextBackground": "#c2244a44",
  };
  monaco.editor.defineTheme(name, { base: "vs-dark", inherit: true, rules, colors: tint ? { ...colors, ...tint } : colors });
}
