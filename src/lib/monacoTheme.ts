/**
 * Single source of truth for the editor's Monaco theme: maroon / gold / platinum.
 *
 * Registered on every Monaco instance (the main editor and the AI diff viewer
 * each get their own `monaco` object), so `defineTheme` is idempotent by design.
 */
export const MONACO_THEME = "mzsg-maroon";

/** Dark maroon cockpit: gold keywords, platinum text, deep-maroon chrome. */
export function applyMonacoTheme(monaco: any): void {
  if (!monaco?.editor?.defineTheme) return;
  try {
    monaco.editor.defineTheme(MONACO_THEME, {
      base: "vs-dark",
      inherit: true,
      rules: [
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
      ],
      colors: {
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
      },
    });
    monaco.editor.setTheme(MONACO_THEME);
  } catch (e) {
    console.warn("[monacoTheme]", e);
  }
}
