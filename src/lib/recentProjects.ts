// ---------------------------------------------------------------------------
// Recently used projects (splash screen / project launcher).
//
// Plain localStorage: the list is tiny, and it is per-webview, so it follows
// the user between sessions without any backend.
// ---------------------------------------------------------------------------

export type RecentProject = { path: string; name: string; at: number };

const KEY = "vs-ide-recent-projects";
const MAX = 10;

/** Windows paths are case-insensitive, so dedupe that way. */
const key = (p: string) => p.replace(/[\\/]+$/, "").toLowerCase();
const nameOf = (p: string) => p.replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean).pop() || p;

export function loadRecent(): RecentProject[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((r: any) => r && typeof r.path === "string" && !!r.path.trim())
      .map((r: any) => ({ path: r.path, name: typeof r.name === "string" && r.name ? r.name : nameOf(r.path), at: Number(r.at) || 0 }))
      .sort((a: any, b: any) => b.at - a.at)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

function save(list: RecentProject[]): RecentProject[] {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage blocked */ }
  return list;
}

/** Move a project to the top of the list (called whenever one is opened). */
export function rememberProject(path: string): RecentProject[] {
  const clean = path.replace(/[\\/]+$/, "");
  if (!clean) return loadRecent();
  const rest = loadRecent().filter((p) => key(p.path) !== key(clean));
  return save([{ path: clean, name: nameOf(clean), at: Date.now() }, ...rest].slice(0, MAX));
}

export function forgetProject(path: string): RecentProject[] {
  return save(loadRecent().filter((p) => key(p.path) !== key(path)));
}

export function clearRecent(): void {
  save([]);
}

/** The project the user had open last - what "continue" offers. */
export function lastProject(): string | null {
  return loadRecent()[0]?.path ?? null;
}

/** "just open my last project next time" (skips the launcher). */
const AUTO_KEY = "vs-ide-auto-resume";
export function getAutoResume(): boolean {
  try { return localStorage.getItem(AUTO_KEY) === "1"; } catch { return false; }
}
export function setAutoResume(on: boolean): void {
  try { localStorage.setItem(AUTO_KEY, on ? "1" : "0"); } catch { /* storage blocked */ }
}

/** Run tools/vs_ide_clean.py on every start (on by default, desktop only). */
const CLEAN_KEY = "vs-ide-housekeeping";
export function getHousekeeping(): boolean {
  try { return localStorage.getItem(CLEAN_KEY) !== "0"; } catch { return true; }
}
export function setHousekeeping(on: boolean): void {
  try { localStorage.setItem(CLEAN_KEY, on ? "1" : "0"); } catch { /* storage blocked */ }
}

/** "2 minutes ago" - used on the launcher cards. */
export function ago(at: number): string {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " min ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? " hour ago" : " hours ago");
  const days = Math.round(hrs / 24);
  return days + (days === 1 ? " day ago" : " days ago");
}

/** Shorten a long path for display: C:\Users\me\code\thing -> C:\…\code\thing */
export function shortPath(p: string, keep = 2): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  if (parts.length <= keep + 1) return p;
  return (p.startsWith("\\\\") ? "\\\\" : parts[0].length <= 2 ? parts[0] + "\\" : "") + "…" + parts.slice(-keep).join("\\");
}
