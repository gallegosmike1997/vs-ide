import { isTauri, invoke } from "@tauri-apps/api/core";
import { readDir, readTextFile, writeTextFile, mkdir, exists, remove, stat } from "@tauri-apps/plugin-fs";
import { open as openDirectoryDialog } from "@tauri-apps/plugin-dialog";
import { TEXT_EXT } from "./fs";

// ---------------------------------------------------------------------------
// Disk-backed workspaces.
//
// Everything here is guarded by two walls:
//   1. the Rust side only ever grants the fs scope for ONE folder the user
//      picked (see `grant_workspace_scope` in src-tauri/src/lib.rs);
//   2. this module refuses to touch any absolute path outside that root.
// In a plain browser (vite without Tauri) every function degrades to a no-op
// so `npm run dev` keeps working exactly as before.
// ---------------------------------------------------------------------------
export type WorkspaceFile = { label: string; path: string; absPath: string; content: string; /** Absolute folder root this file came from (multi-root workspaces). */ root: string };

export const SKIP_DIRS = new Set(["node_modules", ".git", "target", "dist", "dist-ssr", ".next", "build", "out", ".vscode", ".idea"]);
const MAX_FILES = 400;
const MAX_FILE_BYTES = 400 * 1024;
const MAX_DEPTH = 8;

/** Every open folder — roots[0] is the primary (cwd / new-file target). */
let roots: string[] = [];

export function isDesktop(): boolean {
  try { return isTauri(); } catch { return false; }
}
/** All open workspace folders (empty outside desktop, or with no workspace). */
export function currentRoots(): string[] { return isDesktop() ? [...roots] : []; }
/** Primary (first) root — kept for callers that only need a single cwd. */
export function currentRoot(): string | null { return isDesktop() && roots.length ? roots[0] : null; }
export function hasWorkspace(): boolean { return !!currentRoot(); }
/** Low-level root setter (tests / bootstrap). Prefer pickWorkspace(), which also grants the Rust scope. */
export function setRoot(r: string | null): void { roots = r ? [r] : []; }

const norm = (s: string) => s.replace(/\\/g, "/").replace(/\/+$/, "");
/** Collapses ".", ".." and duplicate separators so "../" tricks can't escape. */
function collapse(p: string): string {
  const out: string[] = [];
  for (const part of norm(p).split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}
export function joinPath(...parts: string[]): string {
  return parts.map((p) => norm(p)).filter((p) => !!p).join("/");
}
/** Open a specific folder as the workspace (grants the Rust fs scope).
 *  `add: true` appends it as another root instead of replacing the workspace. */
export async function openWorkspaceAt(path: string, opts: { add?: boolean } = {}): Promise<string | null> {
  if (!isDesktop() || !path.trim()) return null;
  const p = norm(path);
  if (!opts.add) {
    if (roots.length) await removeWorkspaceRoot(roots[0]);
    roots = [];
  }
  if (roots.some((r) => norm(r).toLowerCase() === p.toLowerCase())) return p;
  try { await invoke("grant_workspace_scope", { path: p }); }
  catch (e: any) { throw new Error("Cannot open " + p + " — " + String(e?.message || e)); }
  roots = [...roots, p];
  return p;
}

/** Creates a project folder (with a starter structure) and returns its path. */
export async function createProjectFolder(parent: string, name: string, template: string): Promise<string> {
  if (!isDesktop()) throw new Error("Creating folders needs the desktop app.");
  return await invoke<string>("create_project_folder", { parent, name, template });
}

/** Absolute -> root-relative ("C:/repo/src/x.ts" -> "src/x.ts"), resolved
 *  against whichever open root contains the path. */
export function relPath(abs: string): string {
  const a = norm(abs);
  for (const r of roots) {
    const b = norm(r);
    if (a === b) return "";
    if (a.startsWith(b + "/")) return a.slice(b.length + 1);
  }
  return a;
}
/** Last path segment of a folder path ("C:/x/super-ai-stack" -> "super-ai-stack"). */
export function baseName(p: string): string {
  const parts = norm(p).split("/");
  return parts[parts.length - 1] || p;
}
export function dirnameOf(p: string): string {
  const n = norm(p);
  const i = n.lastIndexOf("/");
  return i > 0 ? n.slice(0, i) : n;
}
/** Defense-in-depth: never allow paths that escape every granted root. */
export function ensureInsideRoot(abs: string): void {
  if (!roots.length) throw new Error("No workspace folder is open.");
  const a = collapse(abs).toLowerCase();
  for (const r of roots) {
    const b = collapse(r).toLowerCase();
    if (a === b || a.startsWith(b + "/")) return;
  }
  throw new Error("Refusing to touch " + abs + " — it is outside every open workspace folder.");
}

/** Folder picker + Rust scope grant. The first pick becomes the primary root;
 *  later picks are ADDED so two projects can be edited side by side.
 *  Returns the chosen path (null = cancelled / browser). */
export async function pickWorkspace(): Promise<string | null> {
  if (!isDesktop()) return null;
  const sel = await openDirectoryDialog({ directory: true, multiple: false, title: "Open workspace folder" });
  const path = typeof sel === "string" ? sel : null;
  if (!path) return null;
  await invoke("grant_workspace_scope", { path });
  if (!roots.some((r) => norm(r) === norm(path))) roots.push(path);
  return path;
}

/** The root folder that CONTAINS an absolute path (most specific match),
 *  falling back to the primary root — so runs, tasks and terminal commands
 *  land in the right project inside a multi-root workspace. */
export function rootFor(abs: string | undefined | null): string | null {
  if (!abs) return currentRoot();
  const a = collapse(abs).toLowerCase();
  let best: string | null = null;
  for (const r of roots) {
    const b = collapse(r).toLowerCase();
    if (a === b || a.startsWith(b + "/")) {
      if (!best || b.length > collapse(best).length) best = r; // most specific match
    }
  }
  return best ?? currentRoot();
}

/** Close ONE folder (explorer ✕). Revokes its scope and returns the remaining roots. */
export async function removeWorkspaceRoot(path: string): Promise<string[]> {
  roots = roots.filter((r) => norm(r) !== norm(path));
  if (isDesktop()) { try { await invoke("revoke_workspace_scope", { path }); } catch { /* already gone */ } }
  return [...roots];
}

/** Revokes the Rust fs scopes and forgets every root. */
export async function closeWorkspace(): Promise<void> {
  if (isDesktop()) {
    for (const r of roots) { try { await invoke("revoke_workspace_scope", { path: r }); } catch { /* already gone */ } }
  }
  roots = [];
}

/** All open folders as tabs, one recursive pass per root (noise/big files skipped).
 *  Secondary roots get labels prefixed with their folder name so files from
 *  different projects never collide ("super-ai-stack/src/main.py"). */
export async function readWorkspaceTree(): Promise<WorkspaceFile[]> {
  if (!currentRoot()) return [];
  const out: WorkspaceFile[] = [];
  const perRoot = Math.max(60, Math.floor(MAX_FILES / Math.max(1, roots.length)));
  for (let i = 0; i < roots.length && out.length < MAX_FILES; i++) {
    const r = roots[i];
    const rNorm = norm(r);
    const secondary = i > 0;
    const start = out.length;
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (out.length >= MAX_FILES || out.length - start >= perRoot || depth > MAX_DEPTH) return;
      let entries: Awaited<ReturnType<typeof readDir>>;
      try { entries = await readDir(dir); } catch { return; }
      for (const entry of entries) {
        if (out.length >= MAX_FILES || out.length - start >= perRoot) return;
        const name = entry.name || "";
        const full = joinPath(dir, name);
        if (entry.isDirectory) {
          if (!SKIP_DIRS.has(name) && !name.startsWith(".")) await walk(full, depth + 1);
          continue;
        }
        if (!TEXT_EXT.test(name)) continue;
        try {
          const info = await stat(full);
          if ((info?.size ?? 0) > MAX_FILE_BYTES) continue;
          const rel = relPath(full) || name;
          const label = secondary ? baseName(r) + "/" + rel : rel;
          out.push({ label, path: label, absPath: full, root: rNorm, content: await readTextFile(full) });
        } catch { /* unreadable file — skip it */ }
      }
    };
    await walk(rNorm, 0);
  }
  return out;
}

/** Absolute path for a workspace-relative file ("src/new.ts"). Labels that
 *  start with a secondary root's folder name resolve into THAT root. */
export function absPathFor(rel: string): string {
  if (!roots.length) throw new Error("No workspace folder is open.");
  const n = rel.replace(/\\/g, "/");
  for (const r of roots) {
    const b = baseName(r);
    if (n === b) return norm(r);
    if (n.startsWith(b + "/")) return joinPath(r, n.slice(b.length + 1));
  }
  return joinPath(roots[0], rel);
}

export async function readWorkspaceFile(abs: string): Promise<string> {
  ensureInsideRoot(abs);
  return readTextFile(abs);
}

/** Writes through to disk, creating parent folders as needed. */
export async function writeWorkspaceFile(abs: string, text: string): Promise<void> {
  ensureInsideRoot(abs);
  const dir = dirnameOf(abs);
  if (!(await exists(dir))) await mkdir(dir, { recursive: true });
  await writeTextFile(abs, text);
}

/** Only used by undo, and only for files the agent created in this session. */
export async function removeWorkspaceFile(abs: string): Promise<void> {
  ensureInsideRoot(abs);
  await remove(abs);
}