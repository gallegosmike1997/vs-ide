/**
 * Harness for the workspace-context layer (aiContext.ts) — the module that
 * gives the chat agent whole-folder visibility.
 *
 * Run with:
 *   npx tsx test/aiContext.harness.ts
 *
 * tsx (not ts-node) is required for the same reasons as the other harness:
 * extensionless imports + `import.meta.env` in the src/lib chain.
 */
import {
  ACTIVE_BUDGET,
  READ_MAX_FILES,
  buildChatContext,
  buildFileTree,
  loadRequestedFiles,
  parseReadRequests,
  stripReadBlocks,
} from "../src/lib/aiContext";
import type { TabDef } from "../src/store";

let failures = 0;
function check(ok: boolean, label: string, detail = "") {
  console.log(`${label}: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) {
    failures++;
    if (detail) console.log("  " + detail);
  }
}
function assertEqual(a: any, b: any, label: string) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  check(ok, label, `expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`);
}

const tab = (id: string, label: string, content: string): TabDef =>
  ({ id, label, language: "typescript", content });

// --- buildFileTree ----------------------------------------------------------
{
  const tree = buildFileTree(["src/b.ts", "src/a.ts", "src/a.ts", "README.md"]);
  const lines = tree.split("\n");
  assertEqual(lines, ["  README.md", "  src/a.ts", "  src/b.ts"], "tree is sorted + deduped");

  const many = Array.from({ length: 900 }, (_, i) => `src/file-${String(i).padStart(4, "0")}.ts`);
  const big = buildFileTree(many);
  check(big.includes("more file(s) not listed"), "tree truncates past budget/max-lines");
  check(big.split("\n").length <= 601, "truncated tree stays within line cap");
}

// --- parseReadRequests ------------------------------------------------------
{
  assertEqual(parseReadRequests("plain answer, no requests"), [], "no read block → empty");

  const one = "Analysis…\n```read\nsrc/lib/workspace.ts\npackage.json\n```\n";
  assertEqual(parseReadRequests(one), ["src/lib/workspace.ts", "package.json"], "reads paths in order");

  const messy = [
    "```read",
    "- src/a.ts",
    "path: src/b.ts",
    '"src\\lib\\c.ts",',
    "",
    "(a parenthetical note)",
    "```",
  ].join("\n");
  assertEqual(parseReadRequests(messy), ["src/a.ts", "src/b.ts", "src\\lib\\c.ts"], "cleans list markers / prefixes / quotes");

  const dup = "```read\nSRC/A.TS\nsrc/a.ts\n```\n```read\nsrc/a.ts\n```";
  assertEqual(parseReadRequests(dup), ["SRC/A.TS"], "case-insensitive dedupe");

  const many = Array.from({ length: 20 }, (_, i) => `f${i}.ts`).join("\n");
  const capped = parseReadRequests("```read\n" + many + "\n```");
  check(capped.length === READ_MAX_FILES, "caps reads per round at READ_MAX_FILES");
}

// --- stripReadBlocks --------------------------------------------------------
{
  const raw = "Intro.\n```read\nsrc/x.ts\n```\nMiddle.\n\n\n\nOutro.";
  assertEqual(stripReadBlocks(raw), "Intro.\n\nMiddle.\n\nOutro.", "removes read blocks + collapses blank runs");
  check(!stripReadBlocks(raw).includes("src/x.ts"), "requested paths never leak into the shown answer");
}

// --- buildChatContext -------------------------------------------------------
{
  const tabs = [
    tab("1", "src/App.tsx", "// active content"),
    tab("2", "src/util.ts", "// util content"),
    tab("3", "README.md", "# readme"),
  ];
  const ctx = buildChatContext({ tabs, file: "src/App.tsx", code: "// active content" });

  check(ctx.includes("WORKSPACE — every file"), "context includes workspace tree header");
  check(ctx.includes("  src/util.ts") && ctx.includes("  README.md"), "tree lists every file");
  check(ctx.includes("ACTIVE FILE (src/App.tsx)"), "active file header present");
  check(ctx.includes("// active content"), "active content present");
  check(ctx.includes("FILE: src/util.ts"), "peer file preview included");
  check(!ctx.includes("FILE: src/App.tsx"), "active file not duplicated as a peer");
  check(ctx.includes("```read"), "read protocol included");
  check(ctx.length < 40_000, "context stays bounded", "length=" + ctx.length);

  // Active content is budgeted even for huge buffers (contiguous run check —
  // the protocol text itself contains isolated "x" characters).
  const run = (n: number) => "x".repeat(n);
  const huge = buildChatContext({ tabs: [tab("1", "big.ts", run(ACTIVE_BUDGET * 3))], file: "big.ts", code: run(ACTIVE_BUDGET * 3) });
  check(huge.includes(run(ACTIVE_BUDGET)) && !huge.includes(run(ACTIVE_BUDGET + 1)), "active file content capped at ACTIVE_BUDGET");

  const empty = buildChatContext({ tabs: [], file: "untitled", code: "hi" });
  check(empty.includes("no workspace folder open"), "empty workspace falls back gracefully");
}

// --- loadRequestedFiles (in-memory; no desktop scope in Node) ---------------
{
  const tabs = [
    tab("1", "src/deep/file.ts", "deep content"),
    tab("2", "other.ts", "other content"),
  ];
  const r1 = await loadRequestedFiles(tabs, ["src/deep/file.ts"]);
  check(r1.loaded.length === 1 && r1.block.includes("deep content"), "exact label match loads");

  const r2 = await loadRequestedFiles(tabs, ["deep/file.ts"]);
  check(r2.loaded.length === 1, "suffix match resolves relative requests");

  const r3 = await loadRequestedFiles(tabs, ["file.ts"]);
  check(r3.loaded.length === 1, "basename match resolves bare requests");

  const r4 = await loadRequestedFiles(tabs, ["nope/missing.ts"]);
  assertEqual(r4.loaded, [], "unknown path not loaded");
  assertEqual(r4.missing, ["nope/missing.ts"], "unknown path reported missing");
  check(r4.block === "", "missing files produce no block");
}

console.log(failures ? `\n${failures} test(s) FAILED.` : "\nAll aiContext tests passed.");
if (failures) throw new Error(`${failures} aiContext test(s) failed.`);
