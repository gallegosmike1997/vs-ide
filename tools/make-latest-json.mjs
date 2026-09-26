// ---------------------------------------------------------------------------
// Builds the update manifest the app fetches on launch.
//
// `tauri build` signs the installers (*.sig) but does not write `latest.json` on
// Windows, so a release is three files and this script produces the third. Run it
// after `npm run build:exe` and upload the result to the GitHub release.
//
//   node tools/make-latest-json.mjs
//   node tools/make-latest-json.mjs --notes "Adds source control + accounts"
//
// The endpoint in src-tauri/capabilities/default.json is
//   .../releases/latest/download/latest.json
// which GitHub serves from the assets of the most recent release.
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const repo = "gallegosmike1997/vs-ide";
const conf = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
const version = conf.version;
const bundle = join(root, "src-tauri/target/release/bundle");

const notesIdx = process.argv.indexOf("--notes");
const notes = notesIdx > -1 ? process.argv[notesIdx + 1] : `VS-IDE ${version}`;

const installer = `VS-IDE_${version}_x64-setup.exe`;
const installerPath = join(bundle, "nsis", installer);
const sigPath = join(bundle, "nsis", installer + ".sig");

if (!existsSync(sigPath)) {
  console.error(`Signature not found: ${sigPath}`);
  console.error("Build with the signing key in the environment first:");
  console.error('  $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content src-tauri/tauri.key -Raw)');
  console.error('  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<password>"');
  console.error("  npm run build:exe");
  process.exit(1);
}

const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: readFileSync(sigPath, "utf8").trim(),
      url: `https://github.com/${repo}/releases/download/v${version}/${installer}`,
    },
  },
};

const out = join(bundle, "latest.json");
writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`wrote ${out}`);
console.log("");
console.log("publish these three files on the GitHub release:");
for (const f of [join("nsis", installer), join("nsis", installer + ".sig"), "latest.json"]) {
  console.log(`  src-tauri/target/release/bundle/${f}`);
}
console.log("");
console.log(`gh release create v${version} \\`);
console.log(`  src-tauri/target/release/bundle/nsis/${installer} \\`);
console.log(`  src-tauri/target/release/bundle/nsis/${installer}.sig \\`);
console.log(`  src-tauri/target/release/bundle/latest.json \\`);
console.log(`  --title "VS-IDE ${version}" --notes "${notes}"`);
