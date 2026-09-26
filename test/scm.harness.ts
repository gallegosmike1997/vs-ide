/**
 * Harness for the SCM panel's rules: how a change set splits into the three
 * sections, how git errors are classified, and the status colours.
 *
 * Run with:
 *   npx tsx test/scm.harness.ts
 *
 * NOTE: run with tsx (see normalizePlanResult.harness.ts for why). The module
 * only touches localStorage defensively, so importing it in Node is safe.
 */
import { gitErrorKind, groupChanges, statusColor, type GitChange } from "../src/lib/scm";

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

const f = (path: string, over: Partial<GitChange> = {}): GitChange => ({
  path, status: " M", staged: false, untracked: false, conflicted: false, orig_path: null, ...over,
});

// ---- grouping -------------------------------------------------------------
const set = [
  f("a.ts", { status: "M ", staged: true }),          // staged
  f("b.ts", { status: " M" }),                        // unstaged
  f("c.ts", { status: "??", untracked: true }),        // untracked -> Changes
  f("d.ts", { status: "UU", staged: true, conflicted: true }), // conflict wins
  f("e.ts", { status: "A ", staged: true }),
];
const g = groupChanges(set);
check("staged count", g.staged.length, 2);
check("staged paths", g.staged.map((x) => x.path), ["a.ts", "e.ts"]);
check("changes count", g.changes.length, 2);
check("changes paths", g.changes.map((x) => x.path), ["b.ts", "c.ts"]);
check("conflicts count", g.conflicts.length, 1);
check("a conflicted file is never double counted",
  g.staged.length + g.changes.length + g.conflicts.length, set.length);
const empty = groupChanges([]);
check("empty input is empty", [empty.staged, empty.changes, empty.conflicts], [[], [], []]);
check("untracked is not treated as staged", groupChanges([f("x", { untracked: true })]).staged.length, 0);

// ---- error classification ------------------------------------------------
check("git missing", gitErrorKind("git unavailable: program not found"), "no-git");
check("not a repo", gitErrorKind("fatal: not a git repository (or any of the parent directories)"), "no-repo");
check("anything else", gitErrorKind("fatal: could not read Username"), "other");
check("empty message", gitErrorKind(""), "other");

// ---- colours -------------------------------------------------------------
check("untracked is neutral", statusColor("??"), "var(--text-2)");
check("conflict is red", statusColor("UU"), "#ff5d5d");
check("added is green", statusColor("A "), "#34d399");
check("deleted is pink", statusColor("D "), "#ff8fa6");
check("modified is amber", statusColor(" M"), "#f0b429");
check("renamed is blue", statusColor("R "), "#8fb4ff");

console.log(`\nscm: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
