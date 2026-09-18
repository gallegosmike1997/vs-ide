import { useRef } from "react";
import Editor from "@monaco-editor/react";
import { callLLM } from "../aiClient";

type MonacoEditorProps = {
  value: string;
  language: string;
  onChange: (v: string | undefined) => void;
};

export default function MonacoEditor({ value, language, onChange }: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  let diagTimeout: any = null;

  async function runDiagnostics(code: string) {
    if (!editorRef.current || !code) return;

    const prompt =
      "Return diagnostics in format: LINE: <number> - <hint>. Include smells, potential bugs, missing checks, and refactor suggestions.\n\n" +
      code;

    const result = await callLLM(prompt);
    const lines = result.split("\n").filter((l) => l.includes("LINE:"));

    const hints = lines
      .map((line) => {
        const parts = line.split("-");
        if (parts.length < 2) return null;
        const lineNum = parseInt(parts[0].replace("LINE:", "").trim(), 10);
        const text = parts[1].trim();
        if (isNaN(lineNum)) return null;
        return { line: lineNum, text };
      })
      .filter(Boolean) as { line: number; text: string }[];

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

  async function autoFix(code: string) {
    const prompt = "Fix this code. Return ONLY corrected code, no explanation:\n\n" + code;
    const fixed = await callLLM(prompt);
    if (fixed && editorRef.current) editorRef.current.setValue(fixed);
  }

  async function showDiff(code: string) {
    const prompt = "Refactor this code and return a unified diff (patch format). Do not explain, only diff:\n\n" + code;
    const diff = await callLLM(prompt);
    console.log("AI Diff Preview:\n", diff);
  }

  async function autocomplete(prefix: string) {
    const prompt = "Continue this code:\n\n" + prefix;
    const completion = await callLLM(prompt);
    if (completion && editorRef.current) {
      editorRef.current.setValue(editorRef.current.getValue() + completion);
    }
  }

  async function inlineGen(desc: string) {
    const prompt = "Generate code that satisfies this description:\n\n" + desc;
    const code = await callLLM(prompt);
    if (code && editorRef.current) {
      editorRef.current.setValue(editorRef.current.getValue() + "\n\n" + code);
    }
  }

  return (
    <div className="h-full w-full flex flex-col glass p-2">
      <div className="flex gap-2 mb-2">
        <button
          className="px-3 py-1 text-xs bg-white/10"
          onClick={() => autocomplete(editorRef.current?.getValue() || "")}
        >
          AI Autocomplete
        </button>
        <button
          className="px-3 py-1 text-xs bg-white/10"
          onClick={() => {
            const d = window.prompt("Describe code to generate:");
            if (d) inlineGen(d);
          }}
        >
          Inline Code Gen
        </button>
        <button
          className="px-3 py-1 text-xs bg-white/10"
          onClick={() => runDiagnostics(editorRef.current?.getValue() || "")}
        >
          Run Diagnostics
        </button>
        <button
          className="px-3 py-1 text-xs bg-white/10"
          onClick={() => showDiff(editorRef.current?.getValue() || "")}
        >
          Diff Preview
        </button>
        <button
          className="px-3 py-1 text-xs bg-white/10"
          onClick={() => autoFix(editorRef.current?.getValue() || "")}
        >
          Auto-Fix
        </button>
      </div>

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
