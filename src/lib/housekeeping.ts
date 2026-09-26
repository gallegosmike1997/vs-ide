// ---------------------------------------------------------------------------
// Housekeeping bridge: runs tools/vs_ide_clean.py through the Rust backend.
// The script is embedded in the app binary, so this works in a packaged build
// too; it needs Python 3 on the machine and degrades to a clear message if not.
// ---------------------------------------------------------------------------
import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./workspace";

export type CleanupStep = { name: string; freed: number; detail: string; skipped: boolean };
/** Field names match the Rust struct (serde keeps snake_case here). */
export type CleanupReport = {
  ok: boolean;
  target: string;
  freed_bytes: number;
  freed_human: string;
  steps: CleanupStep[];
  notes: string[];
  errors: string[];
  output: string;
  script: string;
  python: string;
};

export type CleanupOptions = { target?: string; quick?: boolean; dryRun?: boolean };

/** Returns null outside the desktop app (nothing to run there). */
export async function runCleanup(opts: CleanupOptions = {}): Promise<CleanupReport | null> {
  if (!isDesktop()) return null;
  try {
    return await invoke<CleanupReport>("run_housekeeping", {
      target: opts.target ?? null,
      quick: opts.quick ?? true,
      dryRun: opts.dryRun ?? false,
    });
  } catch (e: any) {
    // Not a hard failure: housekeeping is a background nicety, never a blocker.
    const message = String(e?.message || e);
    return {
      ok: false, target: opts.target ?? "", freed_bytes: 0, freed_human: "0 B",
      steps: [], notes: [message], errors: [message], output: "", script: "", python: "",
    };
  }
}

/** One-line summary for a toast: "freed 1.2 GB (build output, git objects)". */
export function cleanupSummary(r: CleanupReport | null): string {
  if (!r) return "Housekeeping is only available in the desktop app.";
  if (!r.ok && r.errors.length) return r.errors[0];
  if (!r.freed_bytes) return "Housekeeping ran - nothing to clean up.";
  const what = r.steps
    .filter((s) => !s.skipped && s.freed > 0)
    .slice(0, 2)
    .map((s) => s.name.toLowerCase())
    .join(" + ");
  return "Freed " + r.freed_human + (what ? " (" + what + ")" : "");
}
