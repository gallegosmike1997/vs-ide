/**
 * Harness for the command registry: chord parsing, labels, matching, rebinding.
 *
 * Run with:
 *   npx tsx test/commands.harness.ts
 *
 * NOTE: run with tsx (see normalizePlanResult.harness.ts for why). The module
 * touches localStorage at import time, but that is wrapped in try/catch so it
 * degrades to "no overrides" in Node.
 */
import {
  COMMANDS, chordFromEvent, chordLabel, chordMap, commandForEvent, conflicts,
  getOverrides, hintFor, keysFor, rebind, resetAllKeys,
} from "../src/lib/commands";
import { fuzzyFilter, fuzzyScore } from "../src/lib/fuzzy";

/** Current override map (rebind()/reset replace it with a new object). */
const ov = getOverrides;

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

/** Build a fake KeyboardEvent for chordFromEvent / commandForEvent. */
const key = (k: string, o: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}) => ({
  key: k, ctrlKey: !!o.ctrl, shiftKey: !!o.shift, altKey: !!o.alt, metaKey: !!o.meta,
}) as unknown as KeyboardEvent;

// ---- chord parsing --------------------------------------------------------
check("plain key", chordFromEvent(key("f5")), "f5");
check("ctrl+p", chordFromEvent(key("p", { ctrl: true })), "mod+p");
check("cmd maps to mod", chordFromEvent(key("p", { meta: true })), "mod+p");
check("shift+alt+arrow", chordFromEvent(key("ArrowDown", { shift: true, alt: true })), "alt+shift+arrowdown");
check("ctrl+shift+p", chordFromEvent(key("P", { ctrl: true, shift: true })), "mod+shift+p");
check("modifier alone", chordFromEvent(key("Shift")), "");
check("space", chordFromEvent(key(" ")), "space");

// ---- labels ---------------------------------------------------------------
check("label mod", chordLabel("mod+s"), "Ctrl+S");
check("label combo", chordLabel("mod+shift+p"), "Ctrl+Shift+P");
check("label punctuation", chordLabel("mod+comma"), "Ctrl+,");
check("label arrow", chordLabel("mod+alt+arrowdown"), "Ctrl+Alt+↓");
check("label f-key", chordLabel("f11"), "F11");
check("label empty", chordLabel(""), "");

// ---- defaults -------------------------------------------------------------
check("Ctrl+S is save", commandForEvent(key("s", { ctrl: true })), "save");
check("Ctrl+N is new file", commandForEvent(key("n", { ctrl: true })), "new-file");
check("F11 is zen", commandForEvent(key("F11")), "zen");
check("unbound chord", commandForEvent(key("q", { ctrl: true })), null);
check("no defaults lost", COMMANDS.length > 60, true);
check("every default key is unique per command", (() => {
  const seen = new Set<string>();
  for (const c of COMMANDS) for (const k of c.keys ?? []) seen.add(k + "|" + c.id);
  return seen.size === COMMANDS.reduce((n, c) => n + (c.keys?.length ?? 0), 0);
})(), true);
check("defaults have no clashes", Object.keys(conflicts()).length, 0);

// ---- rebinding ------------------------------------------------------------
resetAllKeys();
check("no overrides yet", keysFor("save").join(","), "mod+s");
rebind("save", "new-file", "mod+s");
check("new-file now owns mod+s", commandForEvent(key("s", { ctrl: true })), "new-file");
check("save no longer advertises mod+s", hintFor("save", ov()), "");
check("new-file advertises mod+s", hintFor("new-file", ov()), "Ctrl+S");
rebind("run-file", "run-file", "f7");
check("custom chord works", commandForEvent(key("F7")), "run-file");
check("label of custom", chordLabel(keysFor("run-file")[0]), "F7");
resetAllKeys();
check("reset restores defaults", commandForEvent(key("s", { ctrl: true })), "save");
check("save advertises mod+s again", hintFor("save", ov()), "Ctrl+S");
check("map size after reset", chordMap().size > 0, true);

// A command's own override must survive an unrelated rebind.
rebind("run-file", "tests", "mod+shift+t");
rebind("zoom-in", "zoom-out", "mod+shift+=");
check("unrelated override intact", commandForEvent(key("T", { ctrl: true, shift: true })), "tests");
resetAllKeys();

// ---- fuzzy matching (command palette / go to symbol) ----------------------
check("empty query scores 0", fuzzyScore("", "anything"), 0);
check("subsequence matches", fuzzyScore("gts", "Go to Symbol in File…") !== null, true);
check("wrong order does not match", fuzzyScore("stg", "Go to Symbol"), null);
check("missing char does not match", fuzzyScore("zzz", "Go to Symbol"), null);
check("word-start beats mid-word", (fuzzyScore("fmt", "Format Document") ?? -1) > (fuzzyScore("fmt", "aaaaaaaaafmt") ?? -1), true);
check("case insensitive", fuzzyScore("SAVE", "save active file") !== null, true);
check("ranking puts the exact label first", fuzzyFilter(
  ["Toggle Terminal", "Terminal Panel", "Terminal"], "terminal", (s) => s)[0].item, "Terminal");
check("ranking is stable for equal text", fuzzyFilter(["ab", "ab"], "", (s) => s).length, 2);

console.log(`\ncommands: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);