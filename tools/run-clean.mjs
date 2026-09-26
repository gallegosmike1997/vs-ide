// ---------------------------------------------------------------------------
// Runs the VS-IDE housekeeping script (tools/vs_ide_clean.py) without letting a
// missing Python break `npm run dev` / `npm run build`.
//
// Wired in as the `predev` / `prebuild` hook in package.json, so starting the
// app from source always sweeps old build output, stale AI checkpoint refs and
// log junk first. The packaged app runs the same script through Rust
// (`run_housekeeping`), which has the script embedded in the binary.
//
//   node tools/run-clean.mjs            full clean of this folder
//   node tools/run-clean.mjs --quick    startup mode (keeps warm caches)
//   node tools/run-clean.mjs --dry-run  report only
// ---------------------------------------------------------------------------
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "tools", "vs_ide_clean.py");
const args = process.argv.slice(2);
const quiet = args.includes("--quiet");

if (!existsSync(script)) {
  console.log("[housekeeping] tools/vs_ide_clean.py is missing - skipped.");
  process.exit(0);
}

const CANDIDATES = process.platform === "win32"
  ? [["py", ["-3"]], ["python", []], ["python3", []]]
  : [["python3", []], ["python", []]];

const found = CANDIDATES.find(([bin, pre]) =>
  spawnSync(bin, [...pre, "--version"], { stdio: "ignore" }).status === 0
);

if (!found) {
  console.log("[housekeeping] Python 3 was not found on this machine - skipped.");
  process.exit(0);
}

const [bin, pre] = found;
const started = Date.now();
const res = spawnSync(bin, [...pre, script, "--dir", root, ...args], {
  stdio: quiet ? "ignore" : "inherit",
  timeout: 5 * 60_000,
});

if (res.error) {
  console.log("[housekeeping] could not start the cleanup script:", res.error.message);
  process.exit(0);
}
if (!quiet) {
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[housekeeping] finished in ${secs}s`);
}
process.exit(0);
