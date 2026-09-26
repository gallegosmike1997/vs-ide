import { readFile, readTextFile, readDir, stat } from "@tauri-apps/plugin-fs";
import { isDesktop, currentRoots, baseName, SKIP_DIRS } from "./workspace";
import { TEXT_EXT } from "./fs";
import type { AiEdit } from "./aiEdits";

// ---------------------------------------------------------------------------
// Project fusion — the data layer behind the "Combine Projects" panel.
//
// Given two (or more) open workspace folders this scans each one for an
// inventory (text files, stack manifests, images), builds the AI prompt that
// merges them, and can also generate a fully OFFLINE FUSION.md blueprint so
// the feature still works with no model at all. Browser mode skips the disk
// walk entirely — the panel feeds picked folders in through
// scanImportedFiles() instead (memory only, never uploaded).
// ---------------------------------------------------------------------------

export type ScannedImage = { abs: string; rel: string; size: number };

export type RootScan = {
  /** Absolute folder path (the workspace root) — for imports: the folder name. */
  root: string;
  /** Last path segment — shown on the project card. */
  name: string;
  /** Sample of text-file paths relative to this root (capped). */
  files: string[];
  /** Text files seen during the walk (capped). */
  total: number;
  /** Stack manifests found (package.json, Cargo.toml, requirements.txt…). */
  manifests: string[];
  /** Small images found in the project (thumbnails for the gallery). */
  images: ScannedImage[];
  /** Dependency names parsed OUT of the manifests (package.json deps…). */
  deps: string[];
  /** Best-guess entry point, e.g. "package.json: npm start" or "src/main.py". */
  entry: string | null;
  /** Text-file count per extension, e.g. { ts: 41, json: 12 } — drives the fit check. */
  languages: Record<string, number>;
  /** Verbatim manifest excerpts (small, capped) handed to the AI prompt. */
  manifestText: string;
};

export type FusionStrategy = "bridge" | "monorepo" | "vendor";

const IMG_RE = /\.(png|jpe?g|webp|gif|svg|ico|bmp)$/i;
const MANIFEST_RE = /(^|\/)(package\.json|cargo\.toml|pyproject\.toml|requirements\.txt|poetry\.lock|go\.mod|pom\.xml|build\.gradle|composer\.json|gemfile|makefile|pipfile)$/i;
const MAX_IMG_BYTES = 3 * 1024 * 1024;
const MAX_IMAGES_PER_ROOT = 6;
const MAX_FILES_PER_ROOT = 150;

const norm = (s: string) => s.replace(/\\/g, "/").replace(/\/+$/, "");

/** Walk every open folder: file inventory + stack manifests + images. */
export async function scanWorkspaceProjects(): Promise<RootScan[]> {
  if (!isDesktop()) return [];
  const out: RootScan[] = [];
  for (const r of currentRoots()) {
    const rNorm = norm(r);
    const scan: RootScan = { root: r, name: baseName(r), files: [], total: 0, manifests: [], images: [], deps: [], entry: null, languages: {}, manifestText: "" };
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (scan.total >= MAX_FILES_PER_ROOT || depth > 6) return;
      let entries: Awaited<ReturnType<typeof readDir>>;
      try { entries = await readDir(dir); } catch { return; }
      for (const entry of entries) {
        if (scan.total >= MAX_FILES_PER_ROOT) return;
        const name = entry.name || "";
        const full = dir + "/" + name;
        const rel = full.slice(rNorm.length + 1);
        if (entry.isDirectory) {
          if (!SKIP_DIRS.has(name) && !name.startsWith(".")) await walk(full, depth + 1);
          continue;
        }
        scan.total++;
        if (MANIFEST_RE.test(rel)) scan.manifests.push(rel);
        if (IMG_RE.test(name) && scan.images.length < MAX_IMAGES_PER_ROOT) {
          try {
            const info = await stat(full);
            if ((info?.size ?? 0) <= MAX_IMG_BYTES) scan.images.push({ abs: full, rel, size: info?.size ?? 0 });
          } catch { /* unreadable — skip */ }
        }
        if (TEXT_EXT.test(name)) {
          const ext = (rel.split(".").pop() || "").toLowerCase();
          scan.languages[ext] = (scan.languages[ext] || 0) + 1;
          if (scan.files.length < 120) scan.files.push(rel);
        }
      }
    };
    await walk(rNorm, 0);
    await loadManifestInfo(rNorm, scan);
    out.push(scan);
  }
  return out;
}

/** Read a small image off disk as an object URL for the gallery (null = failed). */
export async function loadImageThumb(abs: string): Promise<string | null> {
  if (abs.startsWith("blob:")) return abs; // browser-imported image (already an object URL)
  try {
    const bytes = await readFile(abs);
    const ext = abs.toLowerCase().split(".").pop() || "";
    const type =
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      ext === "gif" ? "image/gif" :
      ext === "svg" ? "image/svg+xml" :
      ext === "bmp" ? "image/bmp" :
      ext === "ico" ? "image/x-icon" : "image/jpeg";
    return URL.createObjectURL(new Blob([bytes], { type }));
  } catch {
    return null;
  }
}

function treeOf(s: RootScan): string {
  return s.files.length ? s.files.map((f) => "  " + f).join("\n") : "  (no text files indexed)";
}

/** One line per project: "typescript ×80, json ×30, md ×12" (largest first). */
function langLine(s: RootScan): string {
  const rows = Object.entries(s.languages).sort((x, y) => y[1] - x[1]);
  return rows.length ? rows.map(([k, v]) => `${k} ×${v}`).join(", ") : "unknown";
}

/**
 * Parse ONE manifest's text into the scan (deps + entry point + a small
 * excerpt for the AI prompt). Shared by the desktop walker (reads from disk)
 * and the browser folder importer (reads File.text()).
 */
function parseManifestInto(scan: RootScan, rel: string, text: string): void {
  const base = (rel.split("/").pop() || rel).toLowerCase();
  // Keep prompt excerpts small: at most ~3 KB per project.
  if (text.length <= 3000 && scan.manifestText.length < 6000) {
    scan.manifestText += (scan.manifestText ? "\n\n" : "") + rel + ":\n" + text;
  }
  const addDep = (name: string) => {
    const n = name.replace(/^[\s~^>=<*]+/, "").split(/[\s/@"']+/)[0];
    if (n && !scan.deps.includes(n)) scan.deps.push(n);
  };
  try {
    if (base === "package.json") {
      const j = JSON.parse(text);
      const all = { ...(j.dependencies || {}), ...(j.devDependencies || {}) };
      Object.keys(all).forEach(addDep);
      if (typeof j.main === "string") scan.entry = j.main;
      else if (j.bin) scan.entry = "bin";
      else if (j.scripts?.start) scan.entry = "npm start";
    } else if (base === "requirements.txt") {
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (t && !t.startsWith("#") && !t.startsWith("-")) addDep(t.split(/[=<>!~[\s]/)[0]);
      }
    } else if (base === "pyproject.toml") {
      const m = text.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
      if (m) for (const raw of m[1].split(",")) { const q = raw.replace(/["'\s]/g, ""); if (q) addDep(q.split(/[=<>!~[]/)[0]); }
    } else if (base === "cargo.toml") {
      let inDeps = false;
      for (const line of text.split(/\r?\n/)) {
        if (/^\s*\[/.test(line)) inDeps = /^\s*\[(dependencies|dev-dependencies)/.test(line);
        else if (inDeps) { const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/); if (m) addDep(m[1]); }
      }
    } else if (base === "go.mod") {
      let inReq = false;
      for (const line of text.split(/\r?\n/)) {
        if (/^\s*require\s*\(/.test(line)) inReq = true;
        else if (inReq && /^\s*\)/.test(line)) inReq = false;
        else if (/^\s*require\s+\S+\s+v/.test(line)) addDep(line.trim().split(/\s+/)[0] || "");
        else if (inReq) { const p = line.trim().split(/\s+/); if (p[0] && p[1]) addDep(p[0]); }
      }
    }
  } catch { /* malformed manifest — skip its deps, keep the excerpt */ }
}

/** Common entry-point guesses when no manifest declares one. */
function guessEntry(scan: RootScan): string | null {
  const candidates = [
    "src/main.rs", "src/bin/main.rs", "main.rs",
    "src/main.py", "main.py", "app.py", "manage.py", "server.py",
    "src/index.ts", "src/index.tsx", "src/main.ts", "index.js", "index.ts",
    "main.go", "cmd/main.go", "src/App.tsx",
  ];
  for (const c of candidates) if (scan.files.includes(c)) return c;
  return null;
}

/** Read the detected manifests off disk and fill deps/entry/excerpts. */
async function loadManifestInfo(root: string, scan: RootScan): Promise<void> {
  for (const rel of scan.manifests) {
    if (/\.(lock)$/i.test(rel)) continue; // lockfiles are huge — list them, never read them
    try {
      // Scope for this root was granted by grant_workspace_scope on open.
      const text = await readTextFile(root.replace(/[\\/]+$/, "") + "/" + rel);
      parseManifestInto(scan, rel, text);
    } catch { /* unreadable manifest — skip */ }
  }
  if (!scan.entry) scan.entry = guessEntry(scan);
}
/** Project profile block for the AI prompt: stack, entry, deps, languages, tree. */
function profileOf(s: RootScan): string[] {
  return [
    `Stack manifests: ${s.manifests.join(", ") || "(none detected)"}`,
    `Entry point: ${s.entry ?? "unknown"}`,
    `Key dependencies (${s.deps.length}): ${s.deps.slice(0, 20).join(", ") || "n/a"}`,
    `Languages: ${langLine(s)}`,
    ...(s.manifestText ? ["Manifest excerpts:", "```", s.manifestText, "```"] : []),
    "Files:\n" + treeOf(s),
  ];
}

export type FusionFinding = { kind: "ok" | "info" | "warn"; text: string };
export type FusionAnalysis = { verdict: string; findings: FusionFinding[] };

/**
 * Offline fit-check — no model needed. Compares languages, dependency overlap
 * and entry-point readiness so the user sees HOW to combine the two before
 * spending an AI request (surfaced in the panel, the prompt and the blueprint).
 */
export function analyzeFusion(scans: RootScan[]): FusionAnalysis {
  const a = scans[0];
  const b = scans[1];
  const findings: FusionFinding[] = [];
  if (!a || !b) return { verdict: "Open two projects to analyse the fit.", findings };
  const top = (s: RootScan) => Object.entries(s.languages).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "";
  const mainA = top(a);
  const mainB = top(b);
  if (mainA && mainB && mainA === mainB) {
    findings.push({ kind: "ok", text: `Same primary language (${mainA}) — direct module import inside A is safe.` });
  } else if (mainA && mainB) {
    findings.push({ kind: "warn", text: `Different primary languages (A: ${mainA}, B: ${mainB}) — bridge B behind a CLI/subprocess adapter, not an import.` });
  } else {
    findings.push({ kind: "info", text: "Language data incomplete — prefer a process-level bridge." });
  }
  const langsA = new Set(Object.keys(a.languages));
  const sharedLangs = Object.keys(b.languages).filter((l) => langsA.has(l));
  if (sharedLangs.length > 1) {
    findings.push({ kind: "info", text: `Shared languages: ${sharedLangs.slice(0, 6).join(", ")} — utilities can be linked directly.` });
  }
  const depOverlap = a.deps.filter((d) => b.deps.includes(d));
  if (depOverlap.length) {
    findings.push({ kind: "info", text: `Shared dependencies: ${depOverlap.slice(0, 8).join(", ")} — keep ONE pinned version after fusing.` });
  }
  const baseOf = (m: string) => (m.split("/").pop() || m).toLowerCase();
  if (a.manifests.some((m) => b.manifests.some((n) => baseOf(n) === baseOf(m)))) {
    findings.push({ kind: "info", text: "Both projects declare the same manifest type — merge configs deliberately to avoid version clashes." });
  }
  if (!a.entry || !b.entry) {
    findings.push({ kind: "warn", text: `Entry point missing (A: ${a.entry ?? "?"}, B: ${b.entry ?? "?"}) — confirm the launch file before wiring the launcher.` });
  } else {
    findings.push({ kind: "ok", text: `Entry points found — A: ${a.entry}, B: ${b.entry}.` });
  }
  const verdict = findings.some((f) => f.kind === "warn")
    ? "Complementary but mismatched — use a process-level bridge and pin shared versions."
    : "Strong fit — the two halves can share code directly.";
  return { verdict, findings };
}

/**
 * Browser mode: build a RootScan from a `<input webkitdirectory>` FileList so
 * fusion works without the Tauri fs plugin (no disk writes — the plan lands in
 * editor buffers for review). Desktop workspaces use scanWorkspaceProjects().
 */
export async function scanImportedFolder(files: File[], folderName: string): Promise<RootScan> {
  const scan: RootScan = { root: folderName, name: folderName, files: [], total: 0, manifests: [], images: [], deps: [], entry: null, languages: {}, manifestText: "" };
  const bodies: { rel: string; text: string }[] = [];
  for (const f of Array.from(files)) {
    if (scan.total >= MAX_FILES_PER_ROOT) break;
    // webkitRelativePath is "<topFolder>/sub/file.ts" — drop the top folder.
    const rel = (f.webkitRelativePath || f.name).split("/").slice(1).join("/") || f.name;
    if (!rel) continue;
    const parts = rel.split("/");
    const name = parts[parts.length - 1];
    if (parts.slice(0, -1).some((p) => SKIP_DIRS.has(p) || p.startsWith("."))) continue;
    scan.total++;
    if (MANIFEST_RE.test(rel)) {
      scan.manifests.push(rel);
      if (!/\.(lock)$/i.test(name) && f.size <= 64 * 1024) {
        try { bodies.push({ rel, text: await f.text() }); } catch { /* unreadable */ }
      }
    }
    if (IMG_RE.test(name) && scan.images.length < MAX_IMAGES_PER_ROOT && f.size <= MAX_IMG_BYTES) {
      try { scan.images.push({ abs: URL.createObjectURL(f), rel, size: f.size }); } catch { /* blob failed */ }
    }
    if (TEXT_EXT.test(name)) {
      const ext = (rel.split(".").pop() || "").toLowerCase();
      scan.languages[ext] = (scan.languages[ext] || 0) + 1;
      if (scan.files.length < 120) scan.files.push(rel);
    }
  }
  for (const body of bodies) parseManifestInto(scan, body.rel, body.text);
  if (!scan.entry) scan.entry = guessEntry(scan);
  return scan;
}

/**
 * The fusion prompt: both project inventories + the chosen strategy + the
 * hard rule that ALL output lands in project A (the primary root), so the
 * apply pipeline can resolve every path with absPathFor() safely.
 */
export function buildFusionPrompt(strategy: FusionStrategy, scans: RootScan[], attached: string[]): string {
  const a = scans[0];
  const b = scans[1];
  const stratText =
    strategy === "bridge"
      ? `Bridge ${b.name} into ${a.name}: expose ${b.name}'s capabilities as a module/command the main app can invoke (thin adapter files, wired entry points, npm/cargo scripts, updated READMEs). Do NOT copy whole projects — reference B by relative path only.`
      : strategy === "vendor"
      ? `Vendor ${b.name} INSIDE ${a.name}: generate sync scripts (scripts/fuse-vendor.ps1 + fuse-vendor.sh) that copy B's folder into vendor/${b.name}/ at build time — NEVER paste B's sources into your edits — plus ONE top-level offline launcher that runs host + vendored copy, a shared config, and FUSION.md. The scripts must quote paths and need no network.`
      : `Scaffold a fusion workspace INSIDE ${a.name}: a top-level FUSION.md, shared offline config, and a launcher that runs both projects side by side offline (scripts + docs, no cloud services).`;
  return [
    "You are merging two local projects into ONE ultimate offline tool, working inside a multi-root IDE workspace.",
    "",
    `PROJECT A — primary (every output file goes here): ${a.name} @ ${a.root}`,
    ...profileOf(a),
    "",
    `PROJECT B — secondary (source of the new capabilities): ${b.name} @ ${b.root}`,
    ...profileOf(b),
    "",
    "FIT CHECK (offline analysis):",
    ...analyzeFusion(scans).findings.map((f) => `- [${f.kind}] ${f.text}`),
    "",
    "Reference images supplied by the user (infer intent from the names): " + (attached.join(", ") || "(none)"),
    "",
    "STRATEGY:\n" + stratText,
    "",
    "HARD RULES:",
    `- EVERY output file path is relative to PROJECT A's root (e.g. "src/fusion/bridge.ts", "FUSION.md"). NEVER write into project B's folder.`,
    "- Prefer a few small adapter/scaffold files over copying B's sources.",
    "- Everything must run fully OFFLINE (no cloud-only services or keys).",
    "- Start your answer with a 3-6 line markdown summary of the integration approach.",
    "- After the summary, output ONE ```json block of edits for exactly the files you change:",
    '  {"edits":[{"file":"<path relative to A>","action":"create|replace|patch","content":"<complete file text>"}]}',
    'Use action "patch" (with search/replace) when editing an existing file whose full text you were given; "create" for new files. Complete file text only — never "..." placeholders.',
  ].join("\n");
}
/** Fully offline blueprint: no model needed, works with zero configuration. */
export function buildBlueprint(scans: RootScan[], attached: string[]): string {
  const a = scans[0];
  const b = scans[1];
  const lines: string[] = [
    "# Fusion Blueprint",
    "",
    "> Generated offline by VS-IDE · Project Fusion on " + new Date().toISOString().slice(0, 16).replace("T", " "),
    "",
    "## The two projects",
    "",
    `### A (primary/host) — ${a.name}`,
    `- Root: \`${a.root}\``,
    `- Stack: ${a.manifests.join(", ") || "unknown"}`,
    `- Entry point: ${a.entry ?? "unknown"}`,
    `- Dependencies (${a.deps.length}): ${a.deps.slice(0, 16).join(", ") || "n/a"}`,
    `- Languages: ${langLine(a)}`,
    `- Text files indexed: ${a.total}`,
    "",
    "```",
    ...a.files.slice(0, 60),
    "```",
    "",
    `### B (capability source) — ${b.name}`,
    `- Root: \`${b.root}\``,
    `- Stack: ${b.manifests.join(", ") || "unknown"}`,
    `- Entry point: ${b.entry ?? "unknown"}`,
    `- Dependencies (${b.deps.length}): ${b.deps.slice(0, 16).join(", ") || "n/a"}`,
    `- Languages: ${langLine(b)}`,
    `- Text files indexed: ${b.total}`,
    "",
    "```",
    ...b.files.slice(0, 60),
    "```",
    "",
  ];
  if (attached.length) {
    lines.push("## Reference images", "", ...attached.map((n) => "- " + n), "");
  }
  const fit = analyzeFusion(scans);
  lines.push(
    "## Fit check",
    "",
    ...fit.findings.map((f) => `- **${f.kind}** — ${f.text}`),
    "",
    `> ${fit.verdict}`,
    "",
    "## Integration roadmap",
    "",
    `1. **Inventory** — confirm what ${a.name} already provides vs what ${b.name} adds (list above).`,
    `2. **Adapter layer** — add thin bridge files under \`src/fusion/\` in ${a.name} that call ${b.name}'s entry points by relative path.`,
    "3. **Offline wiring** — merge scripts/commands into one launcher; no cloud-only steps.",
    "4. **Shared config** — unify environment/config so both halves read the same settings.",
    "5. **Verification** — run both halves together, then update the root READMEs to document the combined tool.",
    "",
    "## Next steps",
    "",
    "- Switch **Mode → Do** (top toolbar), then press **AI fusion plan** to scaffold this roadmap into project A.",
    "- The plan opens in the review dialog with pre-save verification — nothing touches disk until you press Apply.",
    "",
  );
  return lines.join("\n");
}

/** Wrap the offline blueprint as a single create-edit for the apply pipeline. */
export function blueprintEdit(scans: RootScan[], attached: string[]): AiEdit {
  return { kind: "create", file: "FUSION.md", content: buildBlueprint(scans, attached), summary: "Offline fusion blueprint" };
}


