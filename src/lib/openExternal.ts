import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./workspace";

/**
 * Open a link in the user's real browser.
 *
 * WHY THIS EXISTS: in a Tauri webview an `<a href target="_blank">` click is
 * silently swallowed — the webview will not hand the URL to the OS, so every
 * "open the provider console" / "get a key" link in the app did nothing when
 * clicked. The desktop build therefore routes outbound links through the Rust
 * `open_external` command, which shells out to the OS handler (the same proven
 * path `auth_begin` uses to open the OAuth consent screen).
 *
 * Served over http (npm run dev, or the browser build) there is no Rust side,
 * so it falls back to a normal new tab and the links behave as expected.
 */
export async function openExternal(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;              // never hand anything else to the OS
  if (!isDesktop()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  await invoke("open_external", { url });
}

/**
 * The exact redirect URI this machine will use for OAuth sign-in.
 *
 * The Rust side pins a loopback port precisely so this string is stable: a
 * random port would change every launch, and a redirect URI registered with
 * the provider would stop matching. Falls back to a copy-pasteable example if
 * the command is unavailable.
 */
export async function authRedirectUri(path = "callback"): Promise<string> {
  if (!isDesktop()) return `http://127.0.0.1:8977/${path}`;
  try { return await invoke<string>("auth_redirect_uri", { redirectPath: path }); }
  catch { return `http://127.0.0.1:8977/${path}`; }
}