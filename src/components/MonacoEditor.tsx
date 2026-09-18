import { useRef } from "react";
import Editor from "@monaco-editor/react";
import { callLLM } from "../aiClient";

export default function MonacoEditor({ value, language, onChange }) {
  const editorRef = useRef(null);
  let diagTimeout = null;

  async function runDiagnostics(code) {
    if (!editorRef.current || !code) return;

    const prompt =
      "Return diagnostics in format: LINE: <number> - <hint>.\n\n" + code;

    const result = await callLLM(prompt);
    const lines = result.split("\n").filter((l) => l.includes("LINE:"));

    const hints = lines.map((line) => {
      const parts = line.split("-");
      if (parts.length < 2) return null;
      const lineNum = parseInt(parts[0].replace("LINE:", "").trim(), 10);
      const text = parts[1].trim();
      if (isNaN(lineNum)) return null;
      return { line: lineNum, text };
    }).filter(Boolean);

    const monaco = editorRef.current._monaco;

    const decorations = hints.map((hint) => ({
      range: new monaco.Range(hint.line, 1, hint.line, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: "ai-hint-glyph",
        glyphMarginHoverMessage: { value: hint.text },
        inlineClassName: "ai-inline-annotation"
      }
    }));

    editorRef.current.deltaDecorations([], decorations);
  }

  return (
    <div className="h-full w-full flex flex-col glass p-2">
      <Editor
        height="100%"
        theme="vs-dark"
        language={language}
        value={value}
        onMount={(editor) => {
          editorRef.current = editor;
          runDiagnostics(value);
        }}
        onChange={(v) => {
          onChange(v);
          clearTimeout(diagTimeout);
          diagTimeout = setTimeout(() => runDiagnostics(v || ""), 600);
        }}
        options={{
          fontSize: 14,
          minimap: { enabled: true },
          automaticLayout: true,
          glyphMargin: true
        }}
      />
    </div>
  );
}
