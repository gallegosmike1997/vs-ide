# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Getting the AI online (pick one)

Open **Settings → LLM Connection** (top-right gear, or the `LLM …` chip in the title bar) and use **Get me online (auto / free cloud)** — it checks your local servers first, then falls back to the free cloud tier.

| Tier | Provider | What you need |
| --- | --- | --- |
| Free cloud | **Puter** | Nothing to install. Press **Sign in to Puter** once (free account) — or paste a Puter auth token / set `VITE_PUTER_TOKEN` and skip the popup. Unlocks 1000+ models (`gpt-5-nano`, Claude, Gemini…). |
| Local | LM Studio | Start the local server on `:1234`, load a model. |
| Local | Ollama | `ollama serve` then `ollama pull llama3.1`. |
| Cloud | Groq / Gemini | Paste a key — both have free tiers. |
| Cloud | OpenAI / OpenRouter / Mistral / DeepSeek | Paste a provider key. |

The title-bar chip shows the live state: `LLM: <model>` (online), `LLM: sign in (free)`, or `LLM offline — click to fix`. Keys and settings are stored in `localStorage` (`vs-ide-llm-config`) and never leave your machine except in the request to the provider you chose.

## Let the AI implement changes (one click)

Every AI surface returns **real file edits** now, and the IDE reviews them before writing anything.

| Where | Button | What happens |
| --- | --- | --- |
| Right rail → **AI agent** | Fix bugs · Improve · Refactor · Fix types · Optimize · Write tests · Docs, or type your own task | the model edits the active file, then the review dialog opens |
| Right rail → **AI agent** | `apply automatically` | skips the dialog (undo stays available) |
| Bottom dock → **AI Actions** | Fix bugs / Refactor / Optimize / Tests … | same pipeline, file-aware |
| **AI Chat** | **Apply changes (n)** under any answer that contains edits | applies what the chat proposed |
| **Help** menu | *Fix active file* / *Generate tests* | really writes the change (tests → new file) |
| Command palette | *Fix active file (writes changes)* | same |

How it works:

- The model is asked for a strict `json` block of edits: whole-file `replace`, surgical `patch` (`search`/`replace`) or `create`. SEARCH/REPLACE-style answers are understood too, and a plain code block still falls back to rewriting the active file (the old behaviour).
- The review dialog lists each file with `+adds −removes`, shows a real **before/after diff** (Monaco diff view), lets you deselect files, and refuses edits that cannot be applied (for example patch text that is no longer in the file).
- **Undo** puts every touched file back the way it was.
- Edits land in the open tabs as *dirty buffers*: Ctrl+S saves them, exactly like typing. Nothing is written to disk behind your back.
- Files larger than 12 kB are truncated in the prompt, so the model is forced to send `patch` edits instead of rewriting the file.

Protocol, for reference:

```json
{"edits":[{"file":"App.tsx","action":"patch","search":"  return a - b;","replace":"  return a + b;"}]}
```

## Real workspaces (writes to disk)

In the desktop app, **File → Add Folder…** opens a *workspace*: a native folder picker, the tree read from disk (skipping `node_modules`, `.git`, `target`, `dist`), and every tab backed by a real file. From then on:

- **Ctrl+S / Save / Save All** write through to disk.
- **AI Apply** writes the reviewed changes straight to disk; **Undo** removes files the agent created and restores the previous bytes of everything it touched. Disk and buffers revert together.
- New files created by the agent (`create` edits) are written under the workspace root, parent folders included.

Security model: the webview never gets blanket file access. A Rust command (`grant_workspace_scope`) grants the fs scope for **exactly the folder you picked**, a TS-side guard refuses any absolute path outside it, and the capability file allows only read/write/mkdir/stat/remove — no broad `$HOME/**` grant. Closing without a workspace (or the browser dev server) keeps the old in-memory behaviour.

`src/` layout after the refactor: `lib/` holds the pure layers (`aiClient`, `aiEdits`, `fs`, `workspace`), `components/` the UI, `store.ts` the app state primitives.

## Puter auth token (no sign-in popup)

A Puter **auth token** is a JWT (`eyJ…`, three dot-separated segments). With one, the IDE skips `puter.js`/the popup entirely and talks to `https://api.puter.com` directly:

| What | Where |
| --- | --- |
| Chat | `POST /drivers/call` → `{ interface: "puter-chat-completion", driver: "ai-chat", method: "complete", args: { messages, model, temperature }, auth_token }` |
| Models | `GET /puterai/chat/models/details` (1000+ ids) |
| Token check | `GET /whoami` (used by the **Test** button) |

Two ways to supply it:

1. **`.env.local`** (git-ignored — never committed): copy `.env.example` and set
   `VITE_PUTER_TOKEN=eyJ…` (optional `VITE_PUTER_MODEL=gpt-5-nano`). The app starts online with no clicks.
   Note: Vite inlines `VITE_*` into the built bundle, so keep `dist/` private.
2. **Settings → LLM Connection → provider *Puter* → “PUTER AUTH TOKEN (optional)”**, then **Save + Close**.
   Stored in `localStorage` only.

Puter rejects a custom temperature on some models (the `gpt-5` family); the client retries once without it and remembers that model for the session.
