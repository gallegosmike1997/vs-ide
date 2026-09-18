import { useState } from "react";
import { callLLM } from "../aiClient";

type FileInfo = { path: string; content: string };

export default function ProjectRefactorEngine({ files }: { files: FileInfo[] }) {
  const [result, setResult] = useState("");

  async function runRefactor() {
    const context = files
      .map((f) => "FILE: " + f.path + "\n" + f.content)
      .join("\n\n");

    const prompt =
      "You are a project-wide refactor engine. Analyze all files and propose improvements.\n\n" +
      context;

    const answer = await callLLM(prompt);
    setResult(answer);
  }

  return (
    <div className="glass h-full w-full p-3">
      <h2 className="text-sm font-semibold mb-2">Project-wide Refactor</h2>
      <button
        className="px-3 py-1 text-xs rounded-md bg-white/10 mb-2"
        onClick={runRefactor}
      >
        Analyze Project
      </button>
      <pre className="text-xs whitespace-pre-wrap">
        {result || "Click Analyze Project to get a refactor plan."}
      </pre>
    </div>
  );
}
