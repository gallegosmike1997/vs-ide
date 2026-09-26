import { useState } from "react";
import { ArrowLeft, Hammer, Lightbulb, Loader2, MessageSquare, Rocket, SendHorizonal, ShieldAlert } from "lucide-react";
import { useLLMCall } from "../lib/aiClient";
import { EDIT_PROTOCOL, parseAiEdits, type AiEdit } from "../lib/aiEdits";
import { Markdown } from "./Markdown";
import type { AgentMode, TabDef } from "../store";

type Phase = "idea" | "plan" | "build";
type Msg = { role: "user" | "ai"; text: string };

const MAX_ROUNDS = 8;
const BATCH = 3;
const MAX_FILES = 24;

/**
 * Build mode — Idea → Plan → Build. The user describes a product, the AI
 * brainstorms and plans it thoroughly (risks & mitigations included), then —
 * in Do mode — generates the real folder tree + files in batches. Files are
 * NEVER written here: everything goes through showPlan → AIApplyModal where
 * the pre-save verification gate runs before anything touches disk.
 */
export default function BuildPanel({ tabs, agentMode, onToast, onPlan, ensureOnline }: {
  tabs: TabDef[];
  agentMode: AgentMode;
  onToast: (t: string, b?: string) => void;
  onPlan: (reply: string, edits: AiEdit[], task: string) => void;
  ensureOnline: () => Promise<boolean>;
}) {
  const [phase, setPhase] = useState<Phase>("idea");
  const [idea, setIdea] = useState("");
  const [constraints, setConstraints] = useState("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [planMd, setPlanMd] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [genFiles, setGenFiles] = useState<string[]>([]);
  const { loading, run } = useLLMCall();
  const locked = agentMode !== "do";

  /** Multi-turn idea refinement — pure conversation, no writes. */
  async function refine() {
    const q = draft.trim();
    if (!q || loading) return;
    setDraft("");
    const next = [...thread, { role: "user" as const, text: q }];
    setThread(next);
    if (!(await ensureOnline())) return;
    const history = next.map((m) => m.role + ": " + m.text).join("\n").slice(-3000);
    const reply = await run(
      "You are ideating inside a build session of an IDE. The user wants to build: \"" + idea.slice(0, 800) + "\"\n" +
      "Constraints: \"" + constraints.slice(0, 500) + "\"\nDiscussion so far:\n" + history + "\n\n" +
      "Respond with concrete design suggestions, pitfalls to avoid, and — only if critical — one clarifying question. Max 200 words, markdown, no code."
    );
    setThread((t) => [...t, { role: "ai", text: reply }]);
  }

  /** Thorough architecture plan — risks & mitigations explicitly required. */
  async function makePlan() {
    if (!idea.trim() || loading) return;
    if (!(await ensureOnline())) return;
    const discussion = thread.map((m) => m.role + ": " + m.text).join("\n").slice(-3000);
    const openFiles = tabs.map((t) => t.label).slice(0, 40).join(", ") || "(none)";
    const p = await run(
      "You are the software architect for a build session. The user wants to build: \"" + idea.trim().slice(0, 1200) + "\"\n" +
      "Constraints: \"" + constraints.slice(0, 600) + "\"\n" +
      "Existing open files (integrate or ignore): " + openFiles + "\n" +
      "Ideation discussion:\n" + (discussion || "(none)") + "\n\n" +
      "Produce a COMPLETE, unambiguous implementation plan in markdown:\n" +
      "1. **Goal & scope** — v1 features AND explicit non-goals\n" +
      "2. **Tech stack** — choice + one-line justification each\n" +
      "3. **Architecture & folder tree** — every file with its exact path and a one-line purpose\n" +
      "4. **Data model & key interfaces**\n" +
      "5. **Build order** — numbered milestones\n" +
      "6. **Risks & how this plan avoids them** — edge cases, failure modes, security pitfalls, and the exact mitigation for each\n" +
      "7. **Run instructions**\n" +
      "An AI builder will execute this plan verbatim — file paths in the tree must be exact. No placeholders, no TODOs."
    );
    setPlanMd(p);
    setPhase("plan");
  }

  /** Phase 3: generate files in batches, then hand everything to the verified review dialog. */
  async function startBuild() {
    if (locked) { onToast("Building needs Do mode", "Idea and Think can plan it — flip Mode → Do in the top toolbar to generate files."); return; }
    if (!planMd.trim() || loading) return;
    if (!(await ensureOnline())) return;
    setPhase("build");
    setLog(["> Build started — generating files in batches of " + BATCH + "…"]);
    setGenFiles([]);
    const all: AiEdit[] = [];
    const seen = new Set<string>();
    let finalMsg = planMd;
    for (let round = 1; round <= MAX_ROUNDS && seen.size < MAX_FILES; round++) {
      setLog((l) => [...l, "> round " + round + ": requesting next batch (" + seen.size + " done)…"]);
      const doneList = seen.size ? [...seen].join(", ") : "(none yet)";
      const ans = await run(
        "APPROVED PLAN (execute verbatim):\n" + planMd.slice(0, 14000) + "\n\n" +
        "FILES ALREADY GENERATED: " + doneList + "\n\n" +
        "Return the NEXT batch (max " + BATCH + ") of files as JSON edits per this protocol:\n" + EDIT_PROTOCOL + "\n" +
        "Give each file's full, runnable content. When every file in the plan's tree exists, reply with exactly: BUILD_COMPLETE"
      );
      finalMsg = ans;
      if (/BUILD_COMPLETE/i.test(ans)) { setLog((l) => [...l, "> builder reported BUILD_COMPLETE"]); break; }
      const edits = parseAiEdits(ans);
      let added = 0;
      for (const e of edits) if (!seen.has(e.file)) { seen.add(e.file); all.push(e); added++; }
      if (!added) { setLog((l) => [...l, "> no new files this round — stopping"]); break; }
      setGenFiles([...seen]);
      setLog((l) => [...l, "✓ " + edits.map((e) => e.file).join(", ")]);
    }
    if (seen.size >= MAX_FILES) setLog((l) => [...l, "! batch cap (" + MAX_FILES + " files) reached — approve again for the next milestone"]);
    if (!all.length) {
      setLog((l) => [...l, "! nothing generated — regenerate the plan with more specific file paths"]);
      onToast("No files generated", "Try Regenerate on the plan, then build again.");
      return;
    }
    setLog((l) => [...l, "> handing " + all.length + " file(s) to review + pre-save verification…"]);
    onPlan(finalMsg, all, "Build · " + idea.trim().slice(0, 60));
  }

  function reset() {
    setPhase("idea");
    setPlanMd("");
    setThread([]);
    setLog([]);
    setGenFiles([]);
  }

  // ---- UI -------------------------------------------------------------------
  const steps = [
    { id: "idea" as const, label: "Idea", icon: Lightbulb },
    { id: "plan" as const, label: "Plan", icon: MessageSquare },
    { id: "build" as const, label: "Build", icon: Rocket },
  ];
  const phaseIdx = steps.findIndex((s) => s.id === phase);
  return (
    <div className="glass" style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}>
      <div className="panel-header">
        <span><Hammer size={12} style={{ marginRight: 6 }} />Build — idea → product</span>
        <span className={"badge " + (locked ? (agentMode === "idea" ? "badge-accent" : "badge-warn") : "badge-ok")}>{agentMode === "idea" ? "Idea mode" : agentMode === "think" ? "Think mode" : "Do mode"}</span>
      </div>
      {/* Stepper */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderBottom: "1px solid var(--border)", alignItems: "center", flexWrap: "wrap" }}>
        {steps.map((s, i) => {
          const Icon = s.icon;
          const state = i < phaseIdx ? "done" : i === phaseIdx ? "on" : "off";
          const disabled = loading || !idea.trim() || (s.id === "build" && !planMd);
          return (
            <button key={s.id} className={"btn btn-sm " + (state === "on" ? "btn-primary" : "btn-ghost")} disabled={disabled}
              onClick={() => setPhase(s.id)} title={"Go to " + s.label}
              style={{ border: "1px solid var(--border)", opacity: state === "off" ? 0.55 : 1 }}>
              <Icon size={12} /> {i + 1}. {s.label}{state === "done" ? " ✓" : ""}
            </button>
          );
        })}
        <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto", border: "1px solid var(--border)" }} onClick={reset} title="Start a new build">Start over</button>
      </div>

      <div className="panel-body" style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, padding: 10 }}>
        {phase === "idea" && (
          <>
            <label style={{ fontSize: 12, fontWeight: 600 }}>What do you want to build?</label>
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={3} placeholder="e.g. a habit-tracking PWA with streaks, charts and offline support"
              style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13, background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)", borderRadius: 8, color: "inherit", padding: 8 }} />
            <label style={{ fontSize: 12, fontWeight: 600 }}>Constraints / must-haves <span style={{ color: "var(--text-2)", fontWeight: 400 }}>(optional)</span></label>
            <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={2} placeholder="e.g. React + Tailwind only, no backend, mobile-first"
              style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13, background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)", borderRadius: 8, color: "inherit", padding: 8 }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn btn-primary btn-sm" disabled={!idea.trim() || loading} onClick={() => void makePlan()}>
                {loading ? <Loader2 size={13} className="spin" /> : <MessageSquare size={13} />} Plan the build →
              </button>
              <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>or refine the idea with the AI first</span>
            </div>
            {thread.length > 0 && (
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                {thread.map((m, i) => (
                  <div key={i} style={{ fontSize: 12 }}><b>{m.role === "user" ? "You" : "AI"} — </b><Markdown text={m.text} /></div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
              <input style={{ flex: 1, fontSize: 12.5, background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)", borderRadius: 8, color: "inherit", padding: "7px 9px" }}
                value={draft} placeholder="Ask a question or add a thought… (Enter to send)"
                onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void refine(); }} />
              <button className="btn btn-sm" disabled={!draft.trim() || loading} onClick={() => void refine()}>
                {loading ? <Loader2 size={13} className="spin" /> : <SendHorizonal size={13} />} Refine
              </button>
            </div>
          </>
        )}
        {phase === "plan" && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="badge badge-accent">architecture plan</span>
              <button className="btn btn-sm" disabled={loading} onClick={() => void makePlan()}>{loading ? <Loader2 size={13} className="spin" /> : null} Regenerate</button>
              <button className="btn btn-sm btn-ghost" onClick={() => setPhase("idea")}><ArrowLeft size={13} /> Idea</button>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} disabled={loading || locked || !planMd.trim()}
                title={locked ? "Switch to Do mode (top toolbar) to generate files" : "Generate the file tree, then review + verify before writing"}
                onClick={() => void startBuild()}>
                <Rocket size={13} /> Approve &amp; build →
              </button>
            </div>
            <div className="card" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
              <Markdown text={planMd || "*No plan yet.*"} />
            </div>
          </>
        )}

        {phase === "build" && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className={"badge " + (genFiles.length ? "badge-ok" : "badge-accent")}>{genFiles.length} file(s) generated</span>
              <button className="btn btn-primary btn-sm" disabled={loading || locked || !planMd}
                title={locked ? "Switch to Do mode (top toolbar) first" : "Run the batched file generation"}
                onClick={() => void startBuild()}>
                {loading ? <Loader2 size={13} className="spin" /> : <Rocket size={13} />} {genFiles.length ? "Rebuild" : "Start build"}
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => setPhase("plan")}><ArrowLeft size={13} /> Plan</button>
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11.5, background: "rgba(0,0,0,0.35)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, maxHeight: 200, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {log.length ? log.join("\n") : "Build log will appear here."}
            </div>
            {locked && (
              <div className="card" style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                <ShieldAlert size={15} color="#febc2e" /> Building writes files — flip <b>Mode → Do</b> in the top toolbar first.
              </div>
            )}
            {genFiles.length > 0 && (
              <div className="card" style={{ fontSize: 12 }}>
                <b>Generated:</b> <span style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{genFiles.join(", ")}</span>
                <div style={{ color: "var(--text-2)", marginTop: 5, fontSize: 11.5 }}>
                  Nothing is on disk yet — the review dialog opens with pre-save verification; files are written only when you press Apply.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
