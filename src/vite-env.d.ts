/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Puter auth token (JWT) — brings the AI online with no sign-in popup. */
  readonly VITE_PUTER_TOKEN?: string;
  /** Model preselected for the Puter free tier (default: gpt-5-nano). */
  readonly VITE_PUTER_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
