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
export type WorkspaceFile = { label: string; path: string; absPath: string; content: string };

const SKIP_DIRS = new Set(["node_modules", ".git", "target", "dist", "dist-ssr", ".next", "build", "out", ".vscode", ".idea"]);
const MAX_FILES = 400;
const MAX_FILE_BYTES = 400 * 1024;
const MAX_DEPTH = 8;

let root: string | null = null;

export function isDesktop(): boolean {
  try { return isTauri(); } catch { return false; }
}
export function currentRoot(): string | null { return isDesktop() ? root : null; }
export function hasWorkspace(): boolean { return !!currentRoot(); }
/** Low-level root setter (tests / bootstrap). Prefer pickWorkspace(), which also grants the Rust scope. */
export function setRoot(r: string | null): void { root = r; }

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
/** Absolute -> workspace-relative ("C:/repo/src/x.ts" -> "src/x.ts"). */
export function relPath(abs: string): string {
  const r = root ? norm(root) : null;
  const a = norm(abs);
  if (!r) return a;
  return a === norm(r) ? "" : a.startsWith(norm(r) + "/") ? a.slice(norm(r).length + 1) : a;
}
export function dirnameOf(p: string): string {
  const n = norm(p);
  const i = n.lastIndexOf("/");
  return i > 0 ? n.slice(0, i) : n;
}
/** Defense-in-depth: never allow paths that escape the granted root. */
export function ensureInsideRoot(abs: string): void {
  if (!root) throw new Error("No workspace folder is open.");
  const a = collapse(abs).toLowerCase();
  const b = collapse(root).toLowerCase();
  if (a !== b && !a.startsWith(b + "/")) throw new Error("Refusing to touch " + abs + " — it is outside the workspace folder.");
}

/** Folder picker + Rust scope grant. Returns the chosen root (null = cancelled / browser). */
export async function pickWorkspace(): Promise<string | null> {
  if (!isDesktop()) return null;
  const sel = await openDirectoryDialog({ directory: true, multiple: false, title: "Open workspace folder" });
  const path = typeof sel === "string" ? sel : null;
  if (!path) return null;
  await invoke("grant_workspace_scope", { path });
  root = path;
  return path;
}

/** Revokes the Rust fs scope and forgets the root. */
export async function closeWorkspace(): Promise<void> {
  if (root && isDesktop()) {
    try { await invoke("revoke_workspace_scope", { path: root }); } catch { /* already gone */ }
  }
  root = null;
}

/** The open folder as tabs, in one recursive pass (skipping noise + big/binary files). */
export async function readWorkspaceTree(): Promise<WorkspaceFile[]> {
  if (!currentRoot()) return [];
  const base = norm(root as string);
  const out: WorkspaceFile[] = [];
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (out.length >= MAX_FILES || depth > MAX_DEPTH) return;
    let entries: Awaited<ReturnType<typeof readDir>>;
    try { entries = await readDir(dir); } catch { return; }
    for (const entry of entries) {
      if (out.length >= MAX_FILES) return;
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
        out.push({ label: relPath(full) || name, path: relPath(full) || name, absPath: full, content: await readTextFile(full) });
      } catch { /* unreadable file — skip it */ }
    }
  };
  await walk(base, 0);
  return out;
}

/** Absolute path for a workspace-relative file ("src/new.ts"). */
export function absPathFor(rel: string): string {
  if (!root) throw new Error("No workspace folder is open.");
  return joinPath(root, rel);
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