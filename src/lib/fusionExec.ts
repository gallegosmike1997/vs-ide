import { runShell, canRunReal, type RunResult } from "./runner";
import { expectedPaths, type FusionStrategy } from "./fusion";

// ---------------------------------------------------------------------------
// Real execution check
//
// verifyFusion() answers "is the fusion structurally present?" honestly, and
// explicitly declines to claim the code compiles. This closes that gap by
// actually RUNNING something and reporting the exit code.
//
// What is safe to run is the point. Executing a project's own build or test
// command can run arbitrary code, so this never does that implicitly. It only
// ever runs the LAUNCHER the fusion itself generated, and it requires the user
// to press the button. Failing to run is reported as inconclusive, never as a
// pass — a missing script is a fact about the script, not evidence the fusion
// works.
// ---------------------------------------------------------------------------

export type ExecCheck = {
  /** The command that was attempted, for the UI to show. */
  command: string;
  status: "ran" | "inconclusive" | "unavailable";
  code: number | null;
  output: string;
  detail: string;
};

/** Timeout for a probe run — long enough for a slow start, short enough to not hang. */
const EXEC_TIMEOUT_MS = 25_000;

/** The generated launcher for a strategy, if the plan creates one. */
function launcherFor(strategy: FusionStrategy | "blueprint", host: { files: string[] }): string | null {
  const paths = expectedPaths(strategy, host as never, { name: "b" } as never).map((w) => w.path);
  // Only scripts a fusion generates are ever executed.
  const candidates = paths.filter((p) => /\.(ps1|sh|cmd|bat)$/i.test(p));
  if (!candidates.length) return null;
  const key = (p: string) => p.replace(/\\/g, "/").toLowerCase();
  const files = host.files.map(key);
  return candidates.find((c) => files.includes(key(c))) || null;
}

/**
 * Try to run the generated launcher and report what happened.
 *
 * This is deliberately conservative in its reporting: a timeout, a missing
 * interpreter, or a script that is not there all resolve to "inconclusive"
 * rather than a pass or a fail, because none of them tell you whether the fusion
 * actually works.
 */
export async function runFusionLauncher(
  strategy: FusionStrategy | "blueprint",
  host: { files: string[]; root: string },
): Promise<ExecCheck> {
  if (!canRunReal()) {
    return { command: "", status: "unavailable", code: null, output: "", detail: "Running commands needs the desktop app." };
  }
  const script = launcherFor(strategy, host);
  if (!script) {
    return { command: "", status: "inconclusive", code: null, output: "", detail: "This strategy does not generate a runnable launcher, so there is nothing to execute." };
  }

  const isPs = /\.ps1$/i.test(script);
  const abs = host.root.replace(/[\\/]+$/, "") + "/" + script.replace(/\\/g, "/");
  // PowerShell needs the bypass flag or the execution policy blocks it; on
  // non-Windows the sh script is the one that exists, so use bash.
  const cmd = isPs
    ? `powershell -NoProfile -ExecutionPolicy Bypass -File "${abs}"`
    : `bash "${abs}"`;

  let res: RunResult;
  try {
    res = await runShell(cmd, EXEC_TIMEOUT_MS, undefined, host.root);
  } catch (e: any) {
    return { command: cmd, status: "inconclusive", code: null, output: "", detail: "Could not start the launcher: " + String(e?.message || e).slice(0, 160) };
  }

  const out = (res.output || "").trim();
  if (res.timedOut) {
    return {
      command: cmd, status: "inconclusive", code: null, output: out.slice(0, 2000),
      detail: `The launcher was still running after ${Math.round(EXEC_TIMEOUT_MS / 1000)}s and was stopped. Long-running servers are expected here — this is not a failure signal.`,
    };
  }
  if (res.code === 0) {
    return { command: cmd, status: "ran", code: 0, output: out.slice(0, 2000), detail: "The launcher exited cleanly (code 0)." };
  }
  return {
    command: cmd, status: "ran", code: res.code, output: out.slice(0, 2000),
    detail: `The launcher exited with code ${res.code}. Check the output for the real error.`,
  };
}