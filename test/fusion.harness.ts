/**
 * Harness for the fusion dry-run preview and the post-fusion verifier.
 *
 * Run with:
 *   npx tsx test/fusion.harness.ts
 *
 * NOTE: run with tsx (see normalizePlanResult.harness.ts for why). These are pure
 * functions over a RootScan pair, so no filesystem or Tauri access is needed —
 * which is the point: the preview must be answerable offline and for free.
 */
import { previewFusion, verifyFusion, findCollisions, type RootScan } from "../src/lib/fusion";

let pass = 0;
let fail = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++;
  else {
    fail++;
    console.log(`FAIL ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  }
}

const scan = (name: string, files: string[], over: Partial<RootScan> = {}): RootScan => ({
  root: "C:/code/" + name, name, files, total: files.length,
  manifests: ["package.json"], images: [], deps: [], entry: "src/main.ts",
  languages: { ts: files.length }, manifestText: "", ...over,
});

// ---- collisions ------------------------------------------------------------
const a = scan("host", ["src/main.ts", "src/util.ts", "README.md"]);
const b = scan("source", ["src/main.ts", "src/other.ts"]);
check("same path in both is a collision", findCollisions(a, b), ["src/main.ts"]);
check("no overlap yields none", findCollisions(a, scan("x", ["other.ts"])), []);
// Windows/macOS are case-insensitive, so this must count as a collision.
check("case-only difference still collides", findCollisions(a, scan("y", ["SRC/MAIN.TS"])), ["SRC/MAIN.TS"]);

// ---- preview: safe path ----------------------------------------------------
const safe = previewFusion("bridge", [a, b]);
check("bridge writes four files", safe.writes.length, 4);
check("nothing to overwrite in a clean host", safe.overwriteCount, 0);
check("verdict is safe", safe.verdict, "safe");

// ---- preview: overwrite detection ------------------------------------------
const withDoc = scan("host2", ["FUSION.md", "src/main.ts"]);
const clash = previewFusion("bridge", [withDoc, b]);
check("existing FUSION.md is flagged", clash.destructive, ["FUSION.md"]);
// FUSION.md is a generated report, so it must NOT escalate the verdict.
check("FUSION.md alone is only caution", clash.verdict, "caution");

// ---- preview: a real overwrite escalates to blocked ------------------------
const risky = scan("host3", ["FUSION.md", "src/fusion/bridge.ts", "src/fusion/index.ts"]);
const blocked = previewFusion("bridge", [risky, b]);
check("two real overwrites block", blocked.verdict, "blocked");
check("all three paths listed", blocked.destructive.length, 3);

// ---- preview: needs two projects -------------------------------------------
const none = previewFusion("bridge", [a]);
check("one project blocks", none.verdict, "blocked");
check("one project writes nothing", none.writes.length, 0);

// ---- preview: every strategy produces a plan ------------------------------
for (const s of ["bridge", "vendor", "monorepo", "blueprint"] as const) {
  const p = previewFusion(s, [a, b]);
  check(`strategy ${s} yields writes`, p.writes.length > 0, true);
  check(`strategy ${s} always includes FUSION.md`, p.writes.some((w) => w.path === "FUSION.md"), true);
}
// The blueprint is deterministic and must never be predicted to overwrite
// anything but the report itself.
const bp = previewFusion("blueprint", [withDoc, b]);
check("blueprint overwrites at most FUSION.md", bp.destructive.every((p) => p === "FUSION.md"), true);

// ---- verify: a fusion that did not land ------------------------------------
const empty = verifyFusion([a, b], ["FUSION.md", "src/fusion/bridge.ts"]);
// A missing FUSION.md is only a warning: an undocumented merge can still work.
check("missing FUSION.md warns, not fails", empty.checks.find((c) => c.label === "FUSION.md present")?.status, "warn");
check("no planned files landed fails", empty.checks.find((c) => c.label === "Planned files written")?.status, "fail");
check("no wiring means failure", empty.checks.find((c) => c.label === "Fusion wired into host")?.status, "fail");
check("overall fail", empty.verdict, "fail");

// ---- verify: a fusion that landed ------------------------------------------
const fused = scan("fused", [
  "FUSION.md", "src/main.ts", "src/fusion/bridge.ts", "src/fusion/index.ts", "scripts/run-fusion.ps1",
]);
const good = verifyFusion([fused, b], ["FUSION.md", "src/fusion/bridge.ts"]);
check("FUSION.md present passes", good.checks.find((c) => c.label === "FUSION.md present")?.status, "pass");
check("planned files landed", good.checks.find((c) => c.label === "Planned files written")?.status, "pass");
check("wiring detected", good.checks.find((c) => c.label === "Fusion wired into host")?.status, "pass");
check("host entry intact", good.checks.find((c) => c.label === "Host entry point intact")?.status, "pass");
// It must be honest that no compile check actually ran.
check("compile check is skipped, never claimed", good.checks.find((c) => c.label === "Fusion code compiles")?.status, "skip");
check("no failures", good.fail, 0);

// ---- verify: broken host entry point is a hard failure ---------------------
const broken = verifyFusion([scan("broken", ["FUSION.md", "src/fusion/bridge.ts"], { entry: null }), b]);
check("missing entry point fails", broken.checks.find((c) => c.label === "Host entry point intact")?.status, "fail");

// ---- verify: a missing project must not crash ------------------------------
const noHost = verifyFusion([]);
check("no host fails cleanly", noHost.verdict, "fail");
check("no host still returns a report", Array.isArray(noHost.checks), true);

console.log(`\nfusion: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);