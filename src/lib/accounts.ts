// ---------------------------------------------------------------------------
// Accounts: OAuth 2.0 sign-in with PKCE against a loopback redirect.
//
// The flow is real, not a mock:
//   1. build the authorize URL with a PKCE challenge + random state
//   2. Rust opens the browser and waits on 127.0.0.1 for the redirect
//   3. we verify `state`, swap the code for a token, fetch the profile
//   4. the token is kept in localStorage on this machine
//
// Honest limitation: every provider needs the developer to register an OAuth
// app and paste its Client ID (Facebook also needs the App Secret, because its
// token endpoint does not accept PKCE). Without one there is nothing to sign in
// with, so the UI says so instead of pretending. The exchange shells out to
// curl because Rust cannot do TLS with std alone.
// ---------------------------------------------------------------------------
import { useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./workspace";
import { runShell } from "./runner";
import { authRedirectUri, openExternal } from "./openExternal";

/**
 * Opens an http(s) link in the user's real browser.
 *
 * A Tauri webview never opens `<a target="_blank">` on its own — the click is
 * swallowed, so links have to go through the Rust `open_external` command. This
 * wrapper is the one place that knows the difference, and it still honours a
 * normal browser tab when the app is served over http (npm run dev).
 */
export { openExternal, authRedirectUri };

export type ProviderId = "google" | "github" | "microsoft" | "facebook";

export type Provider = {
  id: ProviderId;
  label: string;
  authorize: string;
  token: string;
  scope: string;
  /** Facebook's token endpoint needs the app secret, not PKCE. */
  needsSecret?: boolean;
  /** Where to register an app for a Client ID. */
  consoleUrl: string;
  docsUrl: string;
  color: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "google", label: "Google", color: "#ea4335",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    docsUrl: "https://developers.google.com/identity/protocols/oauth2/web-server",
  },
  {
    id: "github", label: "GitHub", color: "#8b95a5",
    authorize: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    consoleUrl: "https://github.com/settings/developers",
    docsUrl: "https://docs.github.com/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps",
  },
  {
    id: "microsoft", label: "Microsoft", color: "#00a4ef",
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile User.Read",
    consoleUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps",
    docsUrl: "https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow",
  },
  {
    id: "facebook", label: "Facebook", color: "#1877f2",
    authorize: "https://www.facebook.com/v21.0/dialog/oauth",
    token: "https://graph.facebook.com/v21.0/oauth/access_token",
    scope: "email public_profile",
    needsSecret: true,
    consoleUrl: "https://developers.facebook.com/apps",
    docsUrl: "https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow/",
  },
];

export const providerOf = (id: ProviderId) => PROVIDERS.find((p) => p.id === id)!;

export type Account = {
  provider: ProviderId;
  name: string;
  email: string;
  avatar: string;
  /** Stored locally; only ever sent back to that provider's own API. */
  accessToken: string;
  refreshToken?: string;
  at: number;
};

// ---------------------------------------------------------------------------
// Client credentials the user registers per provider
// ---------------------------------------------------------------------------
const CREDS_KEY = "vs-ide-oauth-creds";
type Creds = Record<string, { clientId: string; secret: string }>;

function loadCreds(): Creds {
  try { return JSON.parse(localStorage.getItem(CREDS_KEY) || "{}"); } catch { return {}; }
}
export function getCreds(id: ProviderId): { clientId: string; secret: string } {
  return loadCreds()[id] || { clientId: "", secret: "" };
}
export function setCreds(id: ProviderId, clientId: string, secret: string): void {
  const all = loadCreds();
  all[id] = { clientId: clientId.trim(), secret: secret.trim() };
  try { localStorage.setItem(CREDS_KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
}
export const isConfigured = (id: ProviderId) => !!getCreds(id).clientId;

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------
const b64u = (bytes: Uint8Array) => {
  let s = "";
  bytes.forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const sha256b64 = async (text: string) =>
  b64u(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));

export type AuthProgress = (msg: string) => void;

/** Opens the consent screen and waits for the loopback redirect. */
async function beginAuth(p: Provider, onProgress: AuthProgress): Promise<{ code: string; verifier: string; redirect: string }> {
  const { clientId, secret } = getCreds(p.id);
  if (!clientId) throw new Error(`Add your ${p.label} Client ID first.`);
  if (p.needsSecret && !secret) throw new Error(`${p.label} also needs the App Secret — its token endpoint does not accept PKCE.`);

  const verifier = b64u(random(32));
  const state = b64u(random(16));
  const challenge = await sha256b64(verifier);

  const url = new URL(p.authorize);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", "__REDIRECT__");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", p.scope);
  url.searchParams.set("state", state);
  if (!p.needsSecret) {
    // Public clients prove themselves with PKCE instead of a secret.
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
  }
  if (p.id === "github") url.searchParams.set("allow_signup", "true");

  onProgress("Waiting for the browser…");
  const cb = await invoke<{ query: string; redirect: string }>("auth_begin", {
    url: url.toString(), redirectPath: "callback", timeoutSecs: 240,
  });
  const params = new URLSearchParams(cb.query);
  if (params.get("state") !== state) throw new Error("Sign-in was cancelled or the state check failed.");
  const code = params.get("code");
  if (!code) throw new Error(params.get("error") || "No authorization code came back.");
  return { code, verifier, redirect: cb.redirect };
}

/** curl, not fetch: the token endpoints do not send CORS headers. */
async function postForm(url: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  const body = Object.entries(form).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const r = await runShell(`curl -s -X POST "${url}" -H "Accept: application/json" -d "${body}"`, 30000, undefined, null);
  const text = (r.output || "").trim();
  if (!text) throw new Error("The token request returned nothing (is curl installed?).");
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error("Unexpected response from the provider: " + text.slice(0, 200)); }
}

async function getJson(url: string, token: string): Promise<Record<string, unknown>> {
  const r = await runShell(`curl -s "${url}" -H "Authorization: Bearer ${token}" -H "Accept: application/json"`, 30000, undefined, null);
  const text = (r.output || "").trim();
  if (!text) return {};
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; }
}

/** Name / email / avatar for whichever provider signed in. */
async function fetchProfile(p: Provider, token: string): Promise<{ name: string; email: string; avatar: string }> {
  if (p.id === "github") {
    const u = await getJson("https://api.github.com/user", token);
    let email = String(u.email || "");
    if (!email) {
      const emails = await getJson("https://api.github.com/user/emails", token);
      const primary = Array.isArray(emails) ? (emails as any[]).find((e) => e?.primary) : null;
      email = String(primary?.email || "");
    }
    return { name: String(u.name || u.login || "GitHub user"), email, avatar: String(u.avatar_url || "") };
  }
  if (p.id === "google") {
    const u = await getJson("https://openidconnect.googleapis.com/v1/userinfo", token);
    return { name: String(u.name || ""), email: String(u.email || ""), avatar: String(u.picture || "") };
  }
  if (p.id === "microsoft") {
    const u = await getJson("https://graph.microsoft.com/v1.0/me", token);
    return { name: String(u.displayName || u.mail || ""), email: String(u.mail || u.userPrincipalName || ""), avatar: "" };
  }
  const u = await getJson("https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)", token);
  const pic = u.picture as { data?: { url?: string } } | undefined;
  return { name: String(u.name || ""), email: String(u.email || ""), avatar: String(pic?.data?.url || "") };
}

/** Full sign-in for one provider. */
export async function signIn(id: ProviderId, onProgress: AuthProgress): Promise<Account> {
  if (!isDesktop()) throw new Error("Sign-in needs the desktop app (it opens your browser).");
  const p = providerOf(id);
  onProgress("Preparing the sign-in…");
  const { code, verifier, redirect } = await beginAuth(p, onProgress);

  onProgress("Exchanging the code…");
  const { clientId, secret } = getCreds(id);
  const form: Record<string, string> = {
    client_id: clientId,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirect,   // must match the authorize request exactly
  };
  if (p.needsSecret) form.client_secret = secret;
  else form.code_verifier = verifier;

  const res = await postForm(p.token, form);
  if (res.error) throw new Error(String(res.error_description || res.error));
  const accessToken = String(res.access_token || "");
  if (!accessToken) throw new Error("The provider did not return an access token.");

  onProgress("Loading your profile…");
  const who = await fetchProfile(p, accessToken);
  return {
    provider: id,
    name: who.name || p.label + " user",
    email: who.email,
    avatar: who.avatar,
    accessToken,
    refreshToken: res.refresh_token ? String(res.refresh_token) : undefined,
    at: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Signed-in accounts (localStorage, this device only)
// ---------------------------------------------------------------------------
const ACCOUNTS_KEY = "vs-ide-accounts";
const listeners = new Set<() => void>();

function load(): Account[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((a) => a && typeof a.provider === "string") : [];
  } catch { return []; }
}
let accounts: Account[] = load();

function commit(next: Account[]) {
  accounts = next;
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}

export const listAccounts = (): Account[] => accounts;
export const accountFor = (id: ProviderId): Account | undefined => accounts.find((a) => a.provider === id);

export function storeAccount(a: Account): void {
  commit([...accounts.filter((x) => x.provider !== a.provider), a]);
}
export function signOut(id: ProviderId): void {
  commit(accounts.filter((a) => a.provider !== id));
}
export function signOutAll(): void { commit([]); }

/** Re-renders when an account signs in or out. */
export function useAccounts(): Account[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => accounts,
    () => accounts,
  );
}

