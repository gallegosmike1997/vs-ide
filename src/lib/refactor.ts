// src/lib/refactor.ts
import type { TabDef } from "../store";
import { EDIT_PROTOCOL, type EditPlanItem, planEdits } from "./aiEdits";

export type ApplyPlan = { items: EditPlanItem[]; reply: string; task?: string; at: number };

/** Build a textual representation of the project context from open files. */
function buildContext(files: TabDef[]): string {
  return files.map((f) => `FILE: ${f.label}\n${f.content}`).join("\n\n");
}

/** Transform file definitions into a structure suitable for the editor AI. */
function buildFileInputs(files: TabDef[]): { file: string; code: string }[] {
  return files.map((f) => ({ file: f.label, code: f.content }));
}

/** Prompt given to the AI to plan a cross-file refactor. */
function buildProjectPrompt(context: string): string {
  return [
    "You are an IDE AI assistant tasked with planning a cross-file refactor.",
    "",
    "Project files:",
    context,
    "",
    "Return a single JSON object describing edits across files, using the same EditPlanItem schema as used for per-file edits.",
    "",
    EDIT_PROTOCOL
  ].join("\n");
}

/** Normalize various shapes of plan results into a consistent structure. */
export function normalizePlanResult(planResult: unknown): { items: EditPlanItem[]; reply: string } {
  // Default empty plan
  let items: EditPlanItem[] = [];
  let reply = "";

  if (planResult == null) {
    return { items, reply };
  }

  // If the backend returns a raw array of items
  if (Array.isArray(planResult)) {
    return { items: planResult as EditPlanItem[], reply };
  }

  // If it is an object, try to extract edits/reply
  if (typeof planResult === "object") {
    const p: any = planResult;

    if (Array.isArray(p.edits)) {
      return { items: p.edits as EditPlanItem[], reply: p.reply ?? "" };
    }

    // Support common alternative shapes, e.g. { items: EditPlanItem[], reply: string }
    if (Array.isArray(p.items)) {
      return { items: p.items as EditPlanItem[], reply: p.reply ?? "" };
    }

    // Fallback to whatever edits property may exist on the object, if any
    return { items: (p.edits ?? []) as EditPlanItem[], reply: p.reply ?? "" };
  }

  // Fallback/default
  return { items, reply };
}

/** Plan project-wide edits for a given set of files. */
export async function planProjectEdits(files: TabDef[], task?: string): Promise<ApplyPlan> {
  const context = buildContext(files);
  const prompt = buildProjectPrompt(context);
  const fileInputs = buildFileInputs(files);

  let planResult: unknown = null;
  try {
    planResult = await planEdits(prompt as any, fileInputs as any);
  } catch (err) {
    // Primary plan attempt failed; log and fall back to a simpler prompt.
    if (err instanceof Error) {
      console.error("planProjectEdits: primary planning failed", err);
    } else {
      console.error("planProjectEdits: primary planning failed with non-error", err);
    }

    try {
      const fallbackPrompt = "Please generate a project-wide refactor plan for the provided files.";
      planResult = await planEdits(fallbackPrompt as any, fileInputs as any);
    } catch (err2) {
      if (err2 instanceof Error) {
        console.error("planProjectEdits: fallback planning failed", err2);
      } else {
        console.error("planProjectEdits: fallback planning failed with non-error", err2);
      }
      // If the fallback also fails, return an empty plan
      planResult = null;
    }
  }

  const { items, reply } = normalizePlanResult(planResult);
  const at = Date.now();
  return { items, reply, task, at };
}
