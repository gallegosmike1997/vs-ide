// ---------------------------------------------------------------------------
// In-app updates.
//
// Design rule: the app must never depend on this. It is one small HTTPS GET to
// a GitHub release manifest, fired in the background a few seconds after launch
// and wrapped in try/catch, so offline (or "no release published yet") is a
// silent no-op. Downloading and installing is only ever started by the user, and
// only then does the app relaunch itself.
//
// The manifest is signed with the minisign key whose public half lives in
// tauri.conf.json; the plugin refuses an update whose signature does not match,
// so a tampered download cannot be installed.
// ---------------------------------------------------------------------------
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isDesktop } from "./workspace";

const KEY = "vs-ide-auto-update";
const SEEN_KEY = "vs-ide-update-dismissed";

/** "Check for updates on launch" - on by default, one click to turn off. */
export function autoUpdateEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
}
export function setAutoUpdate(on: boolean): void {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* storage blocked */ }
}

/** Don't nag about a version the user already said no to. */
function dismissed(version: string): boolean {
  try { return localStorage.getItem(SEEN_KEY) === version; } catch { return false; }
}
export function dismissVersion(version: string): void {
  try { localStorage.setItem(SEEN_KEY, version); } catch { /* storage blocked */ }
}

export type UpdateInfo = {
  version: string;
  current: string;
  date: string | null;
  body: string;
};

/**
 * Ask the release endpoint whether something newer exists.
 * Returns null for: not desktop, no network, no release yet, already dismissed.
 * Never throws.
 */
export async function checkForUpdate(opts: { manual?: boolean } = {}): Promise<UpdateInfo | null> {
  if (!isDesktop()) return null;
  if (!opts.manual && !autoUpdateEnabled()) return null;
  try {
    const update: Update | null = await check();
    if (!update) return null;
    if (!opts.manual && dismissed(update.version)) return null;
    return {
      version: update.version,
      current: update.currentVersion,
      date: update.date ?? null,
      body: (update.body || "").slice(0, 1200),
    };
  } catch {
    // Offline, DNS failure, 404 because no release exists yet, or the manifest
    // failed signature validation. None of that is the user's problem.
    return null;
  }
}

/** Download + install, then restart. Only call this from a user action. */
export async function installUpdate(onProgress?: (done: number, total: number) => void): Promise<void> {
  const update = await check();
  if (!update) throw new Error("No update is available.");
  let downloaded = 0;
  let total = 0;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") { total = event.data?.contentLength ?? 0; downloaded = 0; }
    else if (event.event === "Progress") { downloaded += event.data?.chunkLength ?? 0; }
    onProgress?.(downloaded, total);
  });
  // The installer has run; start the new version. The process plugin owns this
  // (`process:allow-restart`), a plain reload would not pick up the new binary.
  await relaunch();
}
