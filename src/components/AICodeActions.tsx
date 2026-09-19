import { useState } from "react";
import { ClipboardCopy, Loader2, Play, Sparkles, Wand2 } from "lucide-react";
import { useLLMCall } from "../lib/aiClient";
import { Markdown, extractCodeBlocks } from "./Markdown";
import { runJsPreview } from "../lib/fs";
import { buildEditPrompt, parseAiEdits, type AiEdit } from "../lib/aiEdits";
const ACTIONS = [
  { id: "Find and fix the bugs in this file. Keep the public behaviour intact.", label: "Fix bugs" },
  { id: "Refactor for readability and remove duplication.", label: "Refactor" },
  { id: "Add JSDoc and inline comments without changing the code.", label: "Comment" },
  { id: "Optimize performance without changing behaviour.", label: "Optimize" },
  { id: "Write a complete unit test file for this code.", label: "Tests" },
  { id: "Fix the types and null-safety, removing every any.", label: "Fix types" },
  { id: "Explain this code in plain English.", label: "Explain" },
];
export default function AICodeActions({ code, file, onApply, onPlan, onToast }: {
  code: string; file?: string;
  onApply: (code: string) => void;
  onPlan?: (reply: string, edits: AiEdit[], task?: string) => void;
  onToast?: (t: string, b?: string) => void;
}) {
  const [out, setOut] = useState("");
  const [edits, setEdits] = useState<AiEdit[]>([]);
  const [runOut, setRunOut] = useState("");
  const [running, setRunning] = useState(false);
  const { loading, run } = useLLMCall();
  async function act(kind: string) {
    setRunOut(""); setEdits([]);
    // With a file name we can ask for structured edits; otherwise keep the old prompt.
    const prompt = file
      ? buildEditPrompt(kind + " Apply this change to the file now.", { file, code })
      : `Action: ${kind}\n\nCode:\n${code.slice(0, 6000)}\n\nReturn markdown with a 2-4 line explanation then ONE fenced code block with the complete result.`;
    const ans = await run(prompt);
    setOut(ans);
    const parsed = parseAiEdits(ans, file);
    setEdits(parsed);
    if (parsed.length && onPlan) onPlan(ans, parsed, kind.split(" ").slice(0, 4).join(" "));
    else if (!parsed.length) onToast?.("No file changes", file ? "The model replied with text only — see the answer." : "Pick a file in the explorer so edits can be applied.");
  }
  function apply() {
    const blocks = extractCodeBlocks(out);
    if (blocks[0]) { onApply(blocks[0]); onToast?.("Applied AI result", "First code block written to editor."); }
    else onToast?.("Nothing to apply", "No code block found in the AI answer.");
  }
  async function quickRun() {
    setRunning(true);
    try {
      const r = await runJsPreview(code);
      setRunOut((r.ok ? "✓ Ran OK\n\n" : "✖ Error\n\n") + r.output);
      onToast?.(r.ok ? "Run finished" : "Run failed", r.output.slice(0, 140));
    } finally { setRunning(false); }
  }
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {ACTIONS.map((a) => (
          <button key={a.id} className="btn btn-sm" disabled={loading} onClick={() => act(a.id)}>
            {loading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} {a.label}
          </button>
        ))}
        <button className="btn btn-sm btn-primary" disabled={running} onClick={quickRun}>
          {running ? <Loader2 size={12} className="spin" /> : <Play size={12} />} Run JS
        </button>
        {edits.length > 0 && onPlan && <button className="btn btn-sm btn-primary" onClick={() => onPlan(out, edits)}><ClipboardCopy size={12} /> Review &amp; apply ({edits.length})</button>}
        {out && <button className="btn btn-sm" onClick={apply}><ClipboardCopy size={12} /> Apply first block</button>}
      </div>
      {runOut && <pre className="code-output" style={{ marginBottom: 8 }}>{runOut}</pre>}
      {loading && !out ? <div className="shimmer" style={{ height: 60 }} /> : out ? <div className="card"><Markdown text={out} /></div> : <div style={{ fontSize: 12, color: "var(--text-2)" }}>Run an action — the AI returns real file edits you can review. <Wand2 size={11} /> Tip: Review &amp; apply shows a diff first, then writes the tabs.</div>}
    </div>
  );
}
