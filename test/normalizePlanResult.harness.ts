/**
  * Simple harness to test normalizePlanResult with various shapes.
 *
  * Run with:
 *   npm test
 *   npx tsx test/normalizePlanResult.harness.ts
 *
 * NOTE: run with tsx (not ts-node). The src/lib chain uses extensionless
 * imports (resolved automatically by tsx/esbuild) and `import.meta.env`
 * (which tsx polyfills to {}), so loading refactor.ts -> aiEdits.ts ->
 * aiClient.ts stays safe in Node. Under ts-node --esm, Node's ESM
 * resolver rejects the extensionless specifiers; under CommonJS the
 * `import.meta.env` in aiClient.ts throws. tsx avoids both.
 */
import { normalizePlanResult } from "../src/lib/refactor";

function assertEqual(a: any, b: any, label: string) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${label}: ${ok ? "PASS" : "FAIL"}`);
  if (!ok) {
    console.log("  expected:", JSON.stringify(b));
    console.log("  got   :", JSON.stringify(a));
  }
}

// Derive the expected shape from the input to reduce duplication
function expectedFromInput(input: any): { items: any[]; reply: string } {
  if (input == null) return { items: [], reply: "" };
  if (Array.isArray(input)) return { items: input, reply: "" };
  if (typeof input === "object") {
    const raw = input as any;
    let items: any[] = raw.edits ?? raw.items ?? [];
    if (!Array.isArray(items)) items = [];
    const reply = raw.reply ?? "";
    return { items, reply };
  }
  // Fallback for unexpected shapes
  return { items: [], reply: "" };
}

type Case = { input: any };

const cases: Case[] = [
  { input: null },
  { input: undefined },
  { input: [{ path: "src/a.ts" }] },
  { input: { edits: [{ path: "src/a.ts", newContent: "console.log('hi')" }], reply: "ok" } },
  { input: { items: [{ path: "src/b.ts", newText: "x" }], reply: "done" } },
  { input: { unknown: true } },
];

cases.forEach((t, idx) => {
  const got = normalizePlanResult(t.input);
  const expected = expectedFromInput(t.input);
  assertEqual(got, expected, `test ${idx} input=${JSON.stringify(t.input)}`);
});

console.log("All tests attempted.");
