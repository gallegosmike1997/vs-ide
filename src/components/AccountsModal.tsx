import { useState, type ReactElement } from "react";
import { ExternalLink, Loader2, LogOut, ShieldCheck, X } from "lucide-react";
import {
  PROVIDERS, getCreds, isConfigured, setCreds, signIn, signOut, useAccounts,
  type ProviderId,
} from "../lib/accounts";
import { isDesktop } from "../lib/workspace";

/** Small brand glyphs so the buttons are recognisable at a glance. */
const GLYPH: Record<ProviderId, () => ReactElement> = {
  google: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  ),
  github: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#e6edf3" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C16.5 4.7 17.5 5 17.5 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z" />
    </svg>
  ),
  microsoft: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  ),
  facebook: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#1877f2" aria-hidden>
      <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z" />
    </svg>
  ),
};

type Props = { open: boolean; onClose: () => void; onToast?: (t: string, b?: string) => void };

/**
 * Sign-in sheet: one button per provider, the signed-in state, and the Client
 * ID each provider needs. The OAuth app is yours to register — the buttons are
 * wired to the real consent screens, not placeholders.
 */
export default function AccountsModal({ open, onClose, onToast }: Props) {
  const accounts = useAccounts();
  const [busy, setBusy] = useState<ProviderId | null>(null);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [credsOpen, setCredsOpen] = useState(false);

  if (!open) return null;

  const run = async (id: ProviderId) => {
    setBusy(id);
    setError("");
    setProgress("Starting…");
    try {
      const account = await signIn(id, setProgress);
      onToast?.("Signed in with " + account.name, account.email || undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      onToast?.("Sign-in failed", msg.slice(0, 180));
    } finally {
      setBusy(null);
      setProgress("");
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="glass modal" style={{ width: "min(560px, 94vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <span>Accounts</span>
          <button className="icon-btn" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            Connect an identity to VS-IDE. Each provider needs your own OAuth app
            (paste the Client ID once, below) — VS-IDE never sees your password, only
            what you approve on the provider's own page.
          </div>

          <div className="acc-grid">
            {PROVIDERS.map((p) => {
              const acc = accounts.find((a) => a.provider === p.id);
              const ready = isConfigured(p.id);
              return (
                <div key={p.id} className={"acc-card" + (acc ? " signed" : "")}>
                  <div className="acc-icon">{GLYPH[p.id]()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 13 }}>{p.label}</b>
                    {acc ? (
                      <div className="acc-who truncate" title={acc.email}>{acc.name}{acc.email ? " · " + acc.email : ""}</div>
                    ) : (
                      <div className="acc-state">{ready ? "Ready to sign in" : "Client ID needed"}</div>
                    )}
                  </div>
                  {acc ? (
                    <button className="btn btn-sm btn-ghost" onClick={() => { signOut(p.id); onToast?.("Signed out of " + p.label); }} title="Sign out">
                      <LogOut size={12} /> Out
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-primary" disabled={busy !== null || !ready || !isDesktop()}
                      title={!isDesktop() ? "Desktop app only" : !ready ? "Add the Client ID first" : `Continue with ${p.label}`}
                      onClick={() => void run(p.id)}>
                      {busy === p.id ? <Loader2 size={12} className="spin" /> : null} Sign in
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {(progress || error) && (
            <div className={"acc-note" + (error ? " err" : "")} title={error}>
              {busy ? <Loader2 size={12} className="spin" /> : null} {error || progress}
            </div>
          )}

          <div className="acc-creds">
            <button className="acc-creds-toggle" onClick={() => setCredsOpen((v) => !v)}>
              <ShieldCheck size={13} /> OAuth app credentials
            </button>
            {credsOpen && (
              <div className="acc-creds-body">
                {PROVIDERS.map((p) => {
                  const creds = getCreds(p.id);
                  return (
                    <div key={p.id} className="acc-cred-row">
                      <span className="acc-cred-label">{p.label}</span>
                      <input
                        className="input" placeholder="Client ID"
                        value={creds.clientId}
                        onChange={(e) => setCreds(p.id, e.target.value, creds.secret)}
                      />
                      {p.needsSecret && (
                        <input className="input" placeholder="App secret (required)" type="password"
                          value={creds.secret}
                          onChange={(e) => setCreds(p.id, creds.clientId, e.target.value)} />
                      )}
                      <a className="btn btn-sm btn-ghost" href={p.consoleUrl} target="_blank" rel="noreferrer"
                        title={"Open the " + p.label + " developer console"}>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  );
                })}
                <div className="acc-note">
                  Register an app as a <b>Desktop / public client</b> and add
                  <code> http://127.0.0.1/callback </code> (any port) as a redirect URI.
                  Tokens stay in this app's local storage on this machine. Facebook
                  also needs the app secret because its token endpoint does not
                  support PKCE.
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary btn-sm" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
