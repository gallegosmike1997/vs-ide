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
export type FusionAnalysis = { verdict: string; findings: FusionFinding[]; collisions: string[] };

/** Normalise a relative path for collision comparison (slashes, no case). */
const keyPath = (p: string) => p.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();

/** One of the projects taking part in a fusion: A hosts, B contributes. */
export type FusionRole = "host" | "source";

/**
 * The ordered pair a fusion runs on: [0] is always the host (it receives every
 * output file), [1] is always the source.
 *
 * Fusing more than two projects is really "pick a host and a source from what is
 * open", so the panel selects a pair from N scanned roots and the rest of the
 * pipeline keeps working on a plain two-element array. Every function below
 * takes this shape rather than a loose list, which is what stops the host/source
 * roles from being silently swapped somewhere downstream.
 */
export type FusionPair = [RootScan, RootScan];

/** Narrow a wider scan list to a host/source pair, or null if either is missing. */
export function asPair(scans: RootScan[], hostIdx: number, sourceIdx: number): FusionPair | null {
  const host = scans[hostIdx];
  const source = scans[sourceIdx];
  if (!host || !source || host.root === source.root) return null;
  return [host, source];
}

/** Every ordered pair available, for a "pick two" chooser. */
export function allPairs(scans: RootScan[]): { host: RootScan; source: RootScan; hostIdx: number; sourceIdx: number }[] {
  const out: { host: RootScan; source: RootScan; hostIdx: number; sourceIdx: number }[] = [];
  for (let h = 0; h < scans.length; h++) {
    for (let s = 0; s < scans.length; s++) {
      if (h === s) continue;
      out.push({ host: scans[h], source: scans[s], hostIdx: h, sourceIdx: s });
    }
  }
  return out;
}

/**
 * Relative paths that exist in BOTH projects.
 *
 * This is the single most destructive thing a fusion can do: whichever half is
 * applied second silently overwrites the first, and a `.ts` file replacing a
 * `.ts` file is easy to miss in review. Matching is case-insensitive because
 * Windows and macOS treat `Button.tsx` and `button.tsx` as the same file.
 */
export function findCollisions(a: RootScan, b: RootScan, limit = 12): string[] {
  const inA = new Set(a.files.map(keyPath));
  const hits: string[] = [];
  for (const f of b.files) {
    const k = keyPath(f);
    if (inA.has(k)) hits.push(f);
    if (hits.length >= limit) break;
  }
  return hits;
}

/**
 * Offline fit-check — no model needed. Compares languages, dependency overlap
 * and entry-point readiness so the user sees HOW to combine the two before
 * spending an AI request (surfaced in the panel, the prompt and the blueprint).
 */
export function analyzeFusion(scans: RootScan[]): FusionAnalysis {
  const a = scans[0];
  const b = scans[1];
  const findings: FusionFinding[] = [];
  if (!a || !b) return { verdict: "Open two projects to analyse the fit.", findings, collisions: [] };
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
  // Overwriting a file is unrecoverable and invisible in review, so this is the
  // one finding promoted to a hard rule in the prompt.
  const collisions = findCollisions(a, b);
  if (collisions.length) {
    findings.push({
      kind: "warn",
      text: `${collisions.length} path(s) exist in BOTH projects (e.g. ${collisions.slice(0, 3).join(", ")}) — never overwrite: keep A's copy, or move B's to a namespaced path.`,
    });
  } else {
    findings.push({ kind: "ok", text: "No overlapping file paths — a merge cannot silently overwrite existing files." });
  }
  const verdict = findings.some((f) => f.kind === "warn")
    ? "Complementary but mismatched — use a process-level bridge and pin shared versions."
    : "Strong fit — the two halves can share code directly.";
  return { verdict, findings, collisions };
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
    "OVERLAPPING PATHS (present in BOTH projects): " + (analyzeFusion(scans).collisions.join(", ") || "(none)"),
    "",
    "Reference images supplied by the user (infer intent from the names): " + (attached.join(", ") || "(none)"),
    "",
    "STRATEGY:\n" + stratText,
    "",
    "HARD RULES:",
    `- EVERY output file path is relative to PROJECT A's root (e.g. "src/fusion/bridge.ts", "FUSION.md"). NEVER write into project B's folder.`,
    "- Prefer a few small adapter/scaffold files over copying B's sources.",
    "- NEVER overwrite a file that already exists in PROJECT A with B's version. If a path above is listed as overlapping, keep A's file and namespace B's copy instead.",
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
  );
  if (fit.collisions.length) {
    lines.push(
      "## ⚠ Overlapping paths (would overwrite)",
      "",
      "These relative paths exist in BOTH projects. Copying B over A destroys work and is easy to miss in review — keep A's version and namespace B's copy under a distinct path.",
      "",
      ...fit.collisions.map((c) => "- `" + c + "`"),
      "",
    );
  }
  lines.push(
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

// ---------------------------------------------------------------------------
// Dry-run preview
//
// Answers "what will this fusion actually DO to my disk?" BEFORE spending an AI
// request. It is a PREDICTION from the chosen strategy, not a diff: the exact
// contents are unknown until a model writes them, but the set of touched paths is
// knowable, and that is what decides whether a fusion is safe to run at all.
// ---------------------------------------------------------------------------

/** One path a strategy is expected to touch, relative to project A. */
export type PlannedWrite = {
  path: string;
  kind: "create" | "overwrite" | "config";
  /** Why this file is in the plan — shown in the preview. */
  why: string;
  /** True when A already has this exact path (the overwrite risk). */
  clashes: boolean;
};

export type FusionPreview = {
  writes: PlannedWrite[];
  createCount: number;
  overwriteCount: number;
  /** Paths that already exist in A and would be replaced. */
  destructive: string[];
  verdict: "safe" | "caution" | "blocked";
  notes: string[];
};

const scriptExt = () => "ps1";

/** Match the host project's dominant language so generated files compile. */
function extOf(a: RootScan): string {
  const top = Object.entries(a.languages).sort((x, y) => y[1] - x[1])[0]?.[0]?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx", "py", "rs", "go"].includes(top)) return top === "tsx" ? "ts" : top;
  if (a.manifests.some((m) => /package\.json$/i.test(m))) return "ts";
  if (a.manifests.some((m) => /(requirements\.txt|pyproject\.toml)$/i.test(m))) return "py";
  if (a.manifests.some((m) => /cargo\.toml$/i.test(m))) return "rs";
  return "ts";
}

/**
 * The file set each strategy promises, derived from the two project names.
 * Exported so the execution check can find the launcher without duplicating
 * the strategy → file mapping in a second place.
 */
export function expectedPaths(strategy: FusionStrategy | "blueprint", a: RootScan, b: RootScan): PlannedWrite[] {
  if (strategy === "blueprint") {
    return [{ path: "FUSION.md", kind: "create", why: "Deterministic blueprint: inventory, fit check, roadmap. No AI used.", clashes: false }];
  }
  if (strategy === "bridge") {
    return [
      { path: "FUSION.md", kind: "create", why: "What was merged, how to run the combined tool.", clashes: false },
      { path: `src/fusion/bridge.${extOf(a)}`, kind: "create", why: `Thin adapter calling ${b.name} by relative path.`, clashes: false },
      { path: `src/fusion/index.${extOf(a)}`, kind: "create", why: "Single import surface for the fused capabilities.", clashes: false },
      { path: `src/fusion/launch.${extOf(a)}`, kind: "create", why: "One entry point that starts both halves offline.", clashes: false },
    ];
  }
  if (strategy === "vendor") {
    return [
      { path: "FUSION.md", kind: "create", why: "Vendor layout, sync instructions, offline run steps.", clashes: false },
      { path: "scripts/fuse-vendor.ps1", kind: "create", why: "Copies " + b.name + " into vendor/ at build time (no network).", clashes: false },
      { path: "scripts/fuse-vendor.sh", kind: "create", why: "POSIX twin of the sync script.", clashes: false },
      { path: `run-fusion.${scriptExt()}`, kind: "create", why: "Single offline launcher: host + vendored copy.", clashes: false },
      { path: "vendor/.gitkeep", kind: "create", why: "Marks the vendor drop target so the folder is never empty.", clashes: false },
    ];
  }
  return [
    { path: "FUSION.md", kind: "create", why: "Shared workspace map and run instructions.", clashes: false },
    { path: "fusion.config.json", kind: "config", why: "Both halves' entry points in one readable config.", clashes: false },
    { path: `scripts/run-fusion.${scriptExt()}`, kind: "create", why: "Starts both projects side by side, offline.", clashes: false },
    { path: `scripts/status-fusion.${scriptExt()}`, kind: "create", why: "Reports whether both halves are reachable.", clashes: false },
  ];
}

/**
 * Predict what a fusion would touch, and flag anything destructive.
 *
 * `a.files` is the host's file list; a planned path that already appears there is
 * an overwrite, which is the one outcome that can lose work irrecoverably. The
 * verdict is deliberately conservative — "blocked" means "confirm before
 * running", not that the AI is forbidden from proceeding.
 */
export function previewFusion(strategy: FusionStrategy | "blueprint", scans: RootScan[]): FusionPreview {
  const a = scans[0];
  const b = scans[1];
  const notes: string[] = [];
  if (!a || !b) {
    return { writes: [], createCount: 0, overwriteCount: 0, destructive: [], verdict: "blocked", notes: ["Open two projects first."] };
  }
  const inA = new Set(a.files.map(keyPath));
  const writes = expectedPaths(strategy, a, b).map((w) => ({ ...w, clashes: inA.has(keyPath(w.path)) }));
  const destructive = writes.filter((w) => w.clashes).map((w) => w.path);
  const createCount = writes.length - destructive.length;

  if (destructive.length) {
    notes.push(`${destructive.length} planned path(s) already exist in ${a.name} and would be replaced.`);
    if (destructive.includes("FUSION.md")) notes.push("FUSION.md is only a generated report — replacing it loses nothing.");
  }
  // A rewritten manifest that drops dependencies is the classic fusion foot-gun.
  if (destructive.some((p) => /(package\.json|cargo\.toml|requirements\.txt|pyproject\.toml)$/i.test(p))) {
    notes.push("A manifest is in the overwrite list — check that no existing dependency is dropped.");
  }
  const collisions = findCollisions(a, b);
  if (collisions.length) {
    notes.push(`${collisions.length} path(s) exist in both projects; the plan is told to namespace B's copies.`);
  }
  if (!notes.length) notes.push("Every planned path is new — this fusion adds files without replacing any.");

  // Overwriting FUSION.md is harmless (it is a generated report), so it earns
  // "caution" rather than "blocked" — but it is still a replace, so it must not
  // read as a clean "safe". Any other real overwrite escalates to "blocked".
  const realOverwrites = destructive.filter((p) => p !== "FUSION.md").length;
  const verdict: FusionPreview["verdict"] =
    realOverwrites > 1 ? "blocked" : destructive.length ? "caution" : "safe";
  return { writes, createCount, overwriteCount: destructive.length, destructive, verdict, notes };
}

// ---------------------------------------------------------------------------
// Plan drift
//
// The preview is a PREDICTION from the strategy, and models drift: they invent
// their own paths, skip the ones asked for, or write a file nobody planned.
// Without this the user reviews a diff against their imagination of the plan,
// and "we said 4 files, here are 7" passes unnoticed.
//
// This compares what was PREDICTED against what was ACTUALLY produced, so the
// review dialog can state the difference rather than leaving it to be spotted.
// ---------------------------------------------------------------------------

export type FusionDrift = {
  /** Predicted but never produced — the model ignored or renamed the ask. */
  missing: string[];
  /** Produced but never predicted — off-plan, and the risky direction. */
  unexpected: string[];
  /** Predicted files that landed, in order. */
  matched: string[];
  /** Unplanned writes onto a path that already exists in the host. */
  unplannedOverwrites: string[];
  verdict: "as-planned" | "drift" | "off-plan";
  summary: string;
};

/**
 * Reconcile the predicted plan against the edits a model actually returned.
 *
 * The dangerous case is `unplannedOverwrites`: a file the plan never mentioned,
 * landing on a path that already exists in the host. That is an unannounced
 * overwrite — the exact failure the whole preview exists to prevent, arriving
 * through the back door.
 */
export function reconcilePlan(
  strategy: FusionStrategy | "blueprint",
  scans: RootScan[],
  actualPaths: string[],
): FusionDrift {
  const a = scans[0];
  if (!a) {
    return { missing: [], unexpected: [], matched: [], unplannedOverwrites: [], verdict: "off-plan", summary: "No host project to compare against." };
  }
  const predicted = expectedPaths(strategy, a, scans[1]).map((w) => w.path);
  const predKeys = new Map(predicted.map((p) => [keyPath(p), p]));
  const hostFiles = new Set(a.files.map(keyPath));

  const actual = actualPaths.filter((p) => typeof p === "string" && p.trim());
  const actualKeys = new Map(actual.map((p) => [keyPath(p), p]));

  const matched = predicted.filter((p) => actualKeys.has(keyPath(p)));
  const missing = predicted.filter((p) => !actualKeys.has(keyPath(p)));
  const unexpected = actual.filter((p) => !predKeys.has(keyPath(p)));
  const unplannedOverwrites = unexpected.filter((p) => hostFiles.has(keyPath(p)));

  const verdict: FusionDrift["verdict"] =
    unplannedOverwrites.length || missing.length > predicted.length / 2 ? "off-plan" : missing.length || unexpected.length ? "drift" : "as-planned";

  const bits: string[] = [];
  if (matched.length) bits.push(`${matched.length} of ${predicted.length} predicted file(s) landed`);
  if (unexpected.length) bits.push(`${unexpected.length} unplanned file(s)`);
  if (missing.length) bits.push(`${missing.length} predicted file(s) missing`);
  if (unplannedOverwrites.length) bits.push(`⚠ ${unplannedOverwrites.length} overwrite(s) the plan never mentioned`);
  return {
    missing, unexpected, matched, unplannedOverwrites, verdict,
    summary: bits.join(" · ") || "No files produced.",
  };
}

// ---------------------------------------------------------------------------
// Retry with feedback
//
// Verification and generation were separate: verify could tell you the merge
// failed, but the only remedy was to start over by hand. This feeds the failed
// checks back in as constraints, so a retry addresses what actually went wrong
// instead of re-rolling the dice with the same prompt.
// ---------------------------------------------------------------------------

/** Turn a failed verification report into instructions the model can act on. */
export function buildRetryPrompt(
  base: string,
  report: FusionVerifyReport | null,
  drift: FusionDrift | null,
): string {
  if (!report && !drift) return base;
  const problems: string[] = [];

  if (drift) {
    if (drift.missing.length) problems.push("You did not produce these planned files: " + drift.missing.join(", "));
    if (drift.unplannedOverwrites.length) {
      problems.push(
        "You wrote files the plan never mentioned, and they overwrite existing host files: " +
        drift.unplannedOverwrites.join(", ") + ". Do not touch those paths.",
      );
    } else if (drift.unexpected.length) {
      problems.push("You produced unplanned files: " + drift.unexpected.join(", ") + ". Stick to the planned paths.");
    }
  }
  for (const c of report?.checks || []) {
    if (c.status === "fail") problems.push(`FAILED CHECK "${c.label}": ${c.detail}`);
    else if (c.status === "warn") problems.push(`WARNING "${c.label}": ${c.detail}`);
  }

  if (!problems.length) return base;
  return [
    base,
    "",
    "=".repeat(60),
    "A PREVIOUS ATTEMPT WAS APPLIED AND FAILED VERIFICATION.",
    "The problems below were found by reading the filesystem afterwards.",
    "Fix THESE problems, do not repeat the same approach:",
    "",
    ...problems.map((p) => "- " + p),
    "",
    "Output the COMPLETE corrected set of files again, using the same json edits format.",
    "Keep every hard rule from the original brief, especially: never overwrite an existing file in project A.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Fusion history
//
// Fusions are expensive to run and easy to get wrong, so a bad one should stay
// visible. Records what was fused, with which strategy, and how it went.
// ---------------------------------------------------------------------------

export type FusionRecord = {
  at: number;
  host: string;
  source: string;
  hostName: string;
  sourceName: string;
  strategy: string;
  /** The verification verdict at the time it was recorded, if known. */
  outcome?: "pass" | "warn" | "fail" | "none";
  /** How many files the plan actually produced. */
  files?: number;
};

const HISTORY_KEY = "vs-ide-fusion-history";
const MAX_HISTORY = 20;

export function loadFusionHistory(): FusionRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((r) => r && typeof r.host === "string") : [];
  } catch { return []; }
}

/** Record a fusion. A repeat of the same host/source/strategy is moved to the
 *  top rather than duplicated, so the list stays a history and not a log. */
export function recordFusion(rec: FusionRecord): FusionRecord[] {
  const all = loadFusionHistory().filter(
    (r) => !(r.host === rec.host && r.source === rec.source && r.strategy === rec.strategy),
  );
  const next = [rec, ...all].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
  return next;
}

export function clearFusionHistory(): void {
  try { localStorage.removeItem(HISTORY_KEY); } catch { /* storage blocked */ }
}

// ---------------------------------------------------------------------------
//
// The blueprint roadmap's last step is "run both halves together", but nothing in
// the app actually did it. This closes that loop: after a fusion is applied,
// re-scan both projects and report whether the combined tool is really wired up
// — offline, with no model, by checking facts on disk.
// ---------------------------------------------------------------------------

export type FusionCheck = { label: string; status: "pass" | "fail" | "warn" | "skip"; detail: string };
export type FusionVerifyReport = {
  checks: FusionCheck[];
  pass: number;
  fail: number;
  verdict: "pass" | "warn" | "fail";
  at: number;
};

/**
 * Verify a fusion that has already been written to disk.
 *
 * Every check is a fact about the filesystem, not a guess. `scans` must be FRESH
 * scans taken AFTER applying — reusing the pre-apply scan would report on the
 * old state and always "fail" a merge that actually worked. `planned` is the
 * preview's file list, used to confirm the promised files really landed.
 */
export function verifyFusion(scans: RootScan[], planned: string[] = []): FusionVerifyReport {
  const checks: FusionCheck[] = [];
  const a = scans[0];
  const b = scans[1];
  const at = Date.now();

  if (!a) {
    return { checks: [{ label: "Scan", status: "fail", detail: "No host project to verify." }], pass: 0, fail: 1, verdict: "fail", at };
  }
  const all = a.files.map(keyPath);
  const has = (p: string) => all.includes(keyPath(p));

  // 1. The blueprint is the human-readable record of the merge.
  checks.push(
    has("FUSION.md")
      ? { label: "FUSION.md present", status: "pass", detail: "The merge is documented in the host project." }
      : { label: "FUSION.md present", status: "warn", detail: "No FUSION.md — there is no record of what was merged or why." },
  );

  // 2. Did the promised scaffolding actually land?
  if (planned.length) {
    const missing = planned.filter((p) => !has(p));
    checks.push(
      missing.length === 0
        ? { label: "Planned files written", status: "pass", detail: `All ${planned.length} planned file(s) are on disk.` }
        : missing.length === planned.length
          ? { label: "Planned files written", status: "fail", detail: "None of the planned files were written." }
          : { label: "Planned files written", status: "warn", detail: `${missing.length}/${planned.length} missing: ${missing.join(", ")}` },
    );
  }

  // 3. The host must still have a working entry point — a fusion that breaks the
  //    host is worse than no fusion at all.
  checks.push(
    a.entry
      ? { label: "Host entry point intact", status: "pass", detail: a.entry }
      : { label: "Host entry point intact", status: "fail", detail: "The host project has no detectable entry point any more." },
  );

  // 4. The source half must still exist — a copy can lose it.
  if (b) {
    checks.push(
      b.root && b.root !== a.root
        ? { label: "Source project still present", status: "pass", detail: b.root }
        : { label: "Source project still present", status: "warn", detail: "Source and host resolve to the same folder." },
    );
  }

  // 5. Is the host actually referencing the fusion? This is the difference
  //    between "files were copied in" and "the halves are wired together".
  const fuseRefs = a.files.filter((f) => /(^|[\\/])(fusion|vendor)[\\/]/i.test(f) || /fuse-vendor|run-fusion/i.test(f));
  checks.push(
    fuseRefs.length
      ? { label: "Fusion wired into host", status: "pass", detail: fuseRefs.slice(0, 3).join(", ") }
      : { label: "Fusion wired into host", status: "fail", detail: "No fusion/ or vendor/ files in the host — the merge did not land." },
  );

  // 6. Be explicit that a real compile check was NOT run, rather than implying
  //    the code is known-good. A green tick here means "structurally present".
  const code = fuseRefs.filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs|json)$/i.test(f));
  if (code.length) {
    checks.push({
      label: "Fusion code compiles",
      status: "skip",
      detail: `${code.length} code file(s) present — run the host build for a real answer.`,
    });
  }

  // 7. A manifest that stopped resolving is the most common silent breakage.
  checks.push(
    a.manifests.length
      ? { label: "Host manifest readable", status: "pass", detail: a.manifests.join(", ") }
      : { label: "Host manifest readable", status: "warn", detail: "No manifest found in the host project." },
  );

  const pass = checks.filter((c) => c.status === "pass").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  return {
    checks, pass, fail,
    verdict: fail ? "fail" : checks.some((c) => c.status === "warn") ? "warn" : "pass",
    at,
  };
}


