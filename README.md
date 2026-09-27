# VS-IDE

An AI-native code editor built with Tauri + React + TypeScript (Monaco editor, real shell/git integration, workspace-aware AI agent).

## Build the Windows desktop app (`.exe`)

The app is a real Tauri desktop app, so it compiles to a normal Windows executable you can pin to the taskbar or launch from a desktop shortcut — no browser or dev server needed.

**Prerequisites:** [Node.js](https://nodejs.org), Rust (`rustup` on Windows), and the usual MSVC C++ build tools (`winget install Microsoft.VisualStudio.Component.VC.Tools.x86.x64` or the "Desktop development with C++" workload).

```powershell
npm install
npm run build:exe      # fast path: NSIS installer (portable .exe is built too)
# or
npm run build:app      # default tauri build
```

Artifacts (after the build finishes):

| What | Where |
| --- | --- |
| Portable app | `src-tauri\target\release\vs_ide.exe` |
| Installer (Start Menu + optional desktop shortcut) | `src-tauri\target\release\bundle\nsis\VS-IDE_0.1.0_x64-setup.exe` |

**Make a desktop shortcut (any of these):**

1. Run the installer — it registers VS-IDE in the Start Menu (and offers a desktop shortcut), or
2. Right-click `vs_ide.exe` → **Send to → Desktop (create shortcut)**, or
3. One-liner from the repo root (creates `VS-IDE.lnk` on your desktop):

```powershell
$s = (New-Object -ComObject WScript.Shell).CreateShortcut("$env:USERPROFILE\Desktop\VS-IDE.lnk")
$s.TargetPath = "$PWD\src-tauri\target\release\vs_ide.exe"
$s.Save()
```

`npm run dev:app` still launches the desktop app in dev mode with hot reload, and `npm run dev` runs the web-only dev server.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Getting the AI online (pick one)

Open **Settings → LLM Connection** (top-right gear, or the `LLM …` chip in the title bar) and use **Get me online (auto / free cloud)** — it checks your local servers first, then falls back to the free cloud tier.

**Puter is the recommended default.** It is the only tier that needs nothing at all — no API key, no account registration, no local install. Press **Sign in to Puter** once (free account) and 1000+ models become available on your own free allowance. Everything else is an *alternative* you opt into when you already have a key or want everything to run locally.

| Tier | Provider | What you need |
| --- | --- | --- |
| **Recommended** · free cloud | **Puter** | Nothing to install. Press **Sign in to Puter** once (free account) — or paste a Puter auth token / set `VITE_PUTER_TOKEN` and skip the popup. Unlocks 1000+ models (`gpt-5-nano`, Claude, Gemini…). |
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

- **Workspace-aware AI:** every chat prompt carries the file tree of the whole opened folder (not just the active tab) plus previews of nearby files. If the model needs a file that isn't included, it replies with a fenced `read` block listing paths — the IDE loads those files (open buffers first, then disk inside the workspace scope) and asks the model one more time with the contents attached. The one-click agent buttons use the same protocol, so they can edit files beyond the active one.
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

## Project fusion (combine two projects into one)

**Go → Project Fusion** (the ⧉ icon in the activity bar) merges two project folders into one offline tool. Open your host project plus a second folder, pick a strategy, and generate the plan. Output always lands in **project A** (the host), never in B.

| Strategy | What it produces |
| --- | --- |
| **Bridge** | Thin adapter files under `src/fusion/` that call B's entry points by relative path. Nothing is copied. |
| **Vendor** | Sync scripts that copy B into `vendor/<name>/` at build time, plus one offline launcher. |
| **Fusion scaffold** | Shared config, launcher and status scripts so both halves run side by side. |
| **FUSION.md blueprint** | Deterministic markdown: both trees, stats, fit check, roadmap. **No AI needed** — works with zero configuration. |

Nothing is ever written directly from this panel. Everything goes through the same review dialog and pre-save verification gate as every other AI edit.

**Offline fit check.** Before spending an AI request, both projects are compared: primary language, shared languages, dependency overlap, entry points, and **overlapping file paths**. A path present in *both* projects is the dangerous case — whichever half is applied second silently overwrites the first — so collisions are listed in the panel, in `FUSION.md`, and as a hard rule in the prompt telling the model to namespace B's copy instead of replacing A's.

**Swap A/B.** The scan order follows the workspace root order, but fusing in the opposite direction is a completely different plan, so the host and the source can be swapped with one button.

**Any two of N projects.** Open as many folders as you like and pick the host and the source explicitly from dropdowns. Selection is by index into the scan list rather than by reordering it, so choosing a different pair never disturbs the workspace root order, and the same project can never be picked as both. `asPair()` is the single place that validates a selection, which is what stops the host/source roles being silently swapped downstream.

**Plan vs actual (drift).** The dry run is a *prediction*, and models drift — they invent paths, skip the ones asked for, or write a file nobody planned. After generation, `reconcilePlan()` compares what was predicted against what actually came back and reports `as-planned` / `drift` / `off-plan`. The case that matters is an **unannounced overwrite**: a file the plan never mentioned, landing on a path that already exists in the host. That is the exact failure the preview exists to prevent, arriving through the back door, so it is flagged in red and fed into retries.

**Retry with feedback.** Verification used to be a dead end — it could tell you the merge failed, but the only remedy was starting over by hand. `buildRetryPrompt()` feeds the failed checks and any drift back into the prompt as constraints, so a retry addresses what actually went wrong instead of re-rolling the dice with the same request. The button reads "Retry — fix 3 problems" so you know what it is about to attempt.

**Execution check.** `verifyFusion()` is honest that structural presence is not a build, so this closes the gap: it runs the launcher the fusion generated and reports the exit code and output. It is deliberately conservative — only a script the fusion itself created is ever executed, never a project's own build or test command, and only when you press **Run**. A timeout, missing interpreter or absent script all resolve to `inconclusive` rather than a pass or a fail, because none of them tell you whether the fusion works.

**History.** Past fusions are recorded locally (`localStorage`, capped at 20) with their host, source, strategy and verification verdict, so a bad fusion stays visible and reproducible. A repeat of the same triple is moved to the top rather than duplicated, so it reads as a history and not a log.

**Dry run (preview).** `previewFusion()` predicts which files a strategy would create or overwrite, entirely offline and free — no AI call. Each path is labelled `NEW` or `OVERWRITE`, and the verdict is `safe` / `caution` / `blocked`. If anything real would be overwritten, the panel demands an explicit confirmation before an AI request is spent. Overwriting `FUSION.md` alone is only `caution` (it is a generated report, so nothing is lost); overwriting a manifest gets its own warning, because a rewritten `package.json` that drops a dependency is the classic way a fusion breaks the host.

**Verify fusion.** After applying, `verifyFusion()` **re-scans from disk** and reports whether the merge actually landed: is `FUSION.md` present, did the planned files get written, is the host entry point still intact, does the source project still exist, and — the real question — is the host actually *wired* to the fusion, or were files merely copied in? It is honest about its limits: the compile check reports `skip`, not `pass`, because structural presence is not a build. Run the host build for a real verdict.

All of this is offline and model-free, including the blueprint path. `test/fusion.harness.ts` covers the collision rules, the preview verdicts, pair selection, drift detection, the retry prompt and the verifier's pass/warn/fail outcomes.

## Project launcher, context menus and keybindings

### Splash screen / project launcher

The app opens on a launcher instead of a blank editor:

- **Continue in `<last project>`** — reopens the folder you had open when you quit.
- **Open Folder…** — the native picker.
- **New Project…** — name + parent folder (typed or browsed) + a starter template (web, Node, Python, React+TS, empty). The folder is created on disk by a Rust command and opened straight away.
- **Recent projects** — the last 10 folders, newest first, with a forget ✕.
- Two switches: *always reopen my last project* (skips the launcher next time) and *clean up build junk on startup*.
- `Esc` skips, `Enter` creates. Re-open it any time with **F1** or **File → Project Launcher…**.

State lives in `localStorage` (`src/lib/recentProjects.ts`). Browser dev mode skips the launcher, since there is no project to open there.

### Right-click menus

`src/lib/contextMenu.tsx` provides one themed menu; every surface decides its own items, and any entry can be a *command*, so it shows the user's current shortcut and runs through the same dispatcher as the menu bar (`src/lib/cmdBus.ts`).

| Where | What you get |
| --- | --- |
| Editor | Cut/Copy/Paste, Copy Path, Reveal, Go to Line, Find/Replace, Format, Comment, Quick Fix, Rename Symbol, Go to Definition, AI Explain/Fix/Tests, Split, Save, Close |
| Explorer file | Open, Copy Path/Name, Reveal, New File/Folder, AI Explain/Fix, **Rename…**, **Delete** (writes to disk) |
| Explorer folder | New File/Folder, Add File/Folder/Repo, Copy Path, Reveal, **Clean Up Build Junk**, Close Folder |
| Terminal | **Paste** (via the clipboard), Copy Selection, Run Active File, Clear Scrollback, New/Kill Terminal |
| AI chat bubble | Copy message/last answer/selection, Ask about this, Apply changes, Copy/Re-run proposed commands, Clear conversation |
| Tab strip | Close / Others / All, Copy Path, Reveal, Split, AI Explain |
| Bottom panel, status bar, activity bar, AI side bar headers | panel + layout toggles, copy/clear output |

### Menus and shortcuts

`src/lib/commands.ts` is the single registry for every command: its label, its default chord, and the group it belongs to. The menu bar, the right-click menus, the global key handler and the shortcut editor all read it, so nothing can drift apart.

- **File / Edit / Selection / View** were filled out with the VS Code commands that make sense here (New Folder, Save All, Replace in File, comment toggles, duplicate/delete/move line, indent, join lines, sort lines, transform case, multi-cursor, expand/shrink selection, minimap, split editor, panel switches, …) plus a new **Go** menu for the activity bar and housekeeping under **Settings**.
- **Settings → Keyboard Shortcuts…** (or the `keys` tab) opens the editor: grouped list, search box, click a shortcut and press the new combination. `Esc` cancels, `Del` clears it, the ↺ button restores one default, *Reset all* restores everything. Overrides persist in `localStorage`.
- Take a chord from another command and it is reassigned, not duplicated — the menu stops advertising it for the old owner.

## Source control (the git tab)

The Source Control activity item is a real SCM view now, one group per open folder:

- **Branch header** with ahead/behind badges, upstream name, a **Sync** button (fetch → fast-forward pull → push) and a `…` menu (commit staged only, fetch, push, new branch, add remote, unstage all, discard all, recent history).
- **Commit box** (Ctrl+Enter) that stages everything and commits, with a staged-count badge.
- **Staged Changes / Changes / Conflicted** sections, collapsible, with per-file stage / unstage / discard, stage-all / unstage-all, click to open the file, and a right-click menu.
- **Recent history** with sha, subject, author and date.
- "Not a repository" offers **Initialize Repository**; a missing git binary says so.

The Rust side moved from `--porcelain=v1 -uno` (which hid untracked files) to **`--porcelain=v2 --branch`**, so branch, upstream, ahead/behind, renames and conflicts are all decoded, and there are real commands behind it: `git_log`, `git_stage`, `git_discard`, `git_commit`, `git_sync`, `git_fetch`, `git_branch_new`, `git_init`, `git_remote_add`. `git_sync` deliberately refuses a non-fast-forward pull and tells you to merge/rebase instead of silently creating a merge commit. Destructive actions (discard) always confirm first. `src/lib/scm.ts` is the typed wrapper.

## Accounts (Google · GitHub · Microsoft · Facebook)

> **You do not need any of this to use the AI features.** Accounts are for *identity* only. The assistant runs on [Puter](#getting-the-ai-online-pick-one), which needs no OAuth app, no Client ID and no API key. The sheet says so at the top for exactly that reason.

A **Sign in** chip in the title bar opens the account sheet with one button per provider. The flow is a real OAuth 2.0 + PKCE authorization-code flow with a loopback redirect:

1. PKCE verifier/challenge and a random `state` are generated (`src/lib/accounts.ts`).
2. A new Rust command `auth_begin` opens the browser and listens on `127.0.0.1` for the redirect — the same approach as `gh auth login`. `std::net` is enough for a one-shot HTTP GET, so it needs no extra crate and opens no inbound port beyond loopback. It answers with a small confirmation page and returns the query **plus the exact redirect URI**, which the token exchange has to repeat byte for byte.
3. The code is swapped for a token (shelling out to `curl`, because Rust can't do TLS with std alone and the token endpoints don't send CORS headers), then the profile is fetched and the token stored in `localStorage`.

**One thing you have to do first:** each provider requires an OAuth app of your own, so you paste its **Client ID** in *OAuth app credentials*. Buttons read "Client ID needed" until then rather than pretending. Facebook also needs the **App secret** because its token endpoint does not support PKCE. Tokens live only in this app's local storage on this machine, and they are not yet used for anything — this is the identity foundation, not a data pipe.

**The redirect URI is pinned to port 8977.** Providers validate the redirect URI exactly, so an ephemeral port would change on every launch and a URI you registered would stop matching. The loopback port is therefore fixed, with a free-port fallback if 8977 is busy, and the sheet displays the *exact* URI this machine will use (`auth_redirect_uri`) so there is nothing to guess.

**Outbound links go through `open_external`.** A Tauri webview silently swallows `<a target="_blank">` — the click does nothing and no browser opens. Every outbound link (provider consoles, the docs button, "get a key" in Settings) therefore calls a Rust `open_external` command that hands the URL to the OS, with a new-tab fallback in the browser build. The command only accepts `http`/`https` and rejects newlines and quotes, so a URL can never break out of the `cmd /C start` command line.

## Distributing VS-IDE to another machine

`npm run build:exe` produces two installers in `src-tauri\target\release\bundle\`:

| File | Use it for |
| --- | --- |
| `nsis\VS-IDE_0.1.0_x64-setup.exe` | People. Per-user install, no admin rights, Start Menu + Desktop shortcuts, proper uninstaller. |
| `msi\VS-IDE_0.1.0_x64_en-US.msi` | Company machines / GPO / MDM deployment. |

Both are **~210 MB** because the build now embeds the **offline WebView2 installer** (`bundle.windows.webviewInstallMode = offlineInstaller`): a machine that has never seen Edge WebView2 and has no internet can still install and run the app. Tauri has no `zip` bundle target — a portable copy is just `target\release\vs_ide.exe` zipped up, which is the *no-install* option but does **not** carry WebView2.

### Signing

`npm run sign` signs the app binary and both installers with `tools/sign-release.ps1` (signtool from the Windows SDK, falling back to `Set-AuthenticodeSignature`) and prints the resulting signature status for each file. Timestamping is on by default so the signature outlives the certificate.

Two kinds of certificate, with very different reach:

- **The bundled dev certificate** (`src-tauri\vs-ide-signing.pfx`, self-signed) — cryptographically valid and tamper-evident, and any machine that *trusts* it shows a clean publisher. That means the machines you control: import `src-tauri\vs-ide-signing.cer` into **Trusted Root Certification Authorities** (and **Trusted Publishers**) once and the SmartScreen publisher warning disappears. **Do not distribute this to the public** — anyone could sign malware with it.
- **A real CA certificate** — the only thing that fixes SmartScreen for the public. Register an app at a code-signing CA (DigiCert, Sectigo, GlobalSign, AWS Private CA…), roughly $70–$400/year, and they verify your identity before issuing; allow a few days. An **OV** certificate is enough: Microsoft retired the old "EV gets instant SmartScreen reputation" behaviour in 2021, so EV no longer buys anything extra here. Note that reputation is per-file, so a freshly signed binary can still warn until enough machines have downloaded and run that exact build.

Then: `npm run sign -- -Pfx C:\certs\mzsg.pfx` (it will prompt for the password unless a password file is present).

**Where the password lives.** It is **not** hardcoded any more. `sign-release.ps1` reads it from the gitignored `src-tauri\signing-password.txt`, and prompts you if that file is absent. The previous version defaulted to a literal that had also been committed, which meant anyone with a clone of this repo could produce a binary that appeared to come from you — so the cert was rotated and the default removed. The `.pfx` and the password file are both in `.gitignore`; back them up somewhere private, because **losing them means you can never sign another release.**

### Mark of the Web

Windows writes a "downloaded from the internet" zone identifier onto **any** file a browser saves — that cannot be prevented from the producing side. Three ways around it, best first:

1. **Download it without a browser.** `curl -o VS-IDE-setup.exe https://…` or `bitsadmin` do not set the zone identifier, so there is nothing to clear.
2. **Sign it** (above) — a signature is what SmartScreen actually weighs.
3. **Clear the mark afterwards**: right-click → *Properties* → tick *Unblock*, or `npm run unblock`, or `pwsh tools/unblock.ps1 -Path C:\Users\me\Downloads`.

The bare `vs_ide.exe` needs WebView2 already present; the installers do not.

## Automatic updates (from the GitHub release)

VS-IDE can check for a newer release on launch and install it in place. The
mechanics are Tauri's updater plugin (`tauri-plugin-updater` + `process`, both
scoped to the release endpoint in `capabilities/default.json`), pointed at your
repo: `https://github.com/gallegosmike1997/vs-ide/releases/latest/download/latest.json`.

**It cannot hurt offline operation.** The design is deliberately timid:

- one small HTTPS GET, fired **6 seconds after launch** so it never competes with
  first paint, wrapped in try/catch — no network, DNS failure, no release yet, or
  a failed signature check are all a silent `null`;
- **check ≠ install.** Nothing is downloaded until you press *Download & install*;
  the app never silently replaces itself or restarts on its own;
- the download is verified against the minisign public key compiled into the app,
  so a tampered file cannot install;
- **Settings → Automatic Updates on Launch** turns the check off entirely, and
  *Not now* remembers that version so it will not nag you again;
- *Check for Updates…* always checks on demand, whatever the setting.

### Publishing a release (the part only you can do)

Bump the version in **all four** files — they drift if you only do the obvious two:

| File | Field |
| --- | --- |
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `[package] version` |
| `src-tauri/Cargo.lock` | the `vs_ide` entry (regenerated by the build) |

```bash
npm run build:exe
node tools/make-latest-json.mjs --notes "What changed"
# then upload all three files as assets of a new GitHub release (tag v0.2.0):
#      src-tauri/target/release/bundle/nsis/VS-IDE_0.2.0_x64-setup.exe
#      src-tauri/target/release/bundle/nsis/VS-IDE_0.2.0_x64-setup.exe.sig
#      src-tauri/target/release/bundle/latest.json
```

`latest.json` needs the signing key in the environment, which is why `.gitignore`
protects `src-tauri/tauri.key`. **This Tauri version wants the key contents
inline, not the path** — setting only `TAURI_SIGNING_PRIVATE_KEY_PATH` builds the
installers but silently produces no `.sig`, and the build ends with:

```
A public key has been found, but no private key.
```

which leaves you with a release whose updater cannot work:

```bash
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content src-tauri/tauri.key -Raw)
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<your password>"
npm run build:exe
```

Confirm the signatures were actually written before publishing:

```bash
Get-ChildItem src-tauri\target\release\bundle -Recurse -Filter *.sig
```

> **Whoever holds `tauri.key` can sign an update this app will install.** Treat it
> like a password: keep it out of git, out of shared folders, and back it up.
>
> To be precise about what is and isn't exposed: `tauri.key` is gitignored and has
> **never** been committed — only its public half (`tauri.key.pub`) is in history,
> which is harmless. What *was* in history is the old code-signing `.pfx` (blob
> `bb5bb63`, removed in `700688e` but still retrievable), which is why the
> certificate and its password have been rotated. The updater key is unchanged, so
> installs on 0.1.3/0.1.4 keep updating normally; rotating it would have forced
> every existing install to download manually.

Each update is a ~210 MB download, because the installer carries the offline
WebView2 runtime. If that is too heavy, switching `webviewInstallMode` to
`embedBootstrapper` brings it to ~7 MB — at the cost of needing internet on the
machine that installs it.

## Navigation, the command palette and project health

### Command palette (Ctrl+K / Ctrl+Shift+P)

One quick-open box, two modes: **files** by default, **commands** behind `>`. The command list *is* the registry (`src/lib/commands.ts`), so every File / Edit / Selection / View / Go item is reachable by name, grouped, and shows your current binding. Typing something that matches no file asks the AI instead of doing nothing. Matching is a small fuzzy scorer (`src/lib/fuzzy.ts`) with word-start and consecutive-run bonuses — the same matcher drives Go to Symbol.

### Breadcrumbs + Go to Symbol (Ctrl+Shift+O)

The bar under the tab strip is now real: workspace root → path segments → **the symbol chain around your cursor**. Click a segment to reveal the file, click a symbol to jump to it. `Ctrl+Shift+O` opens a fuzzy symbol picker for the active file (the helpers in `src/lib/symbols.ts` were written for this and finally have a home).

### Selection-aware AI

Right-click a selection in the editor and you get **Explain / Review / Document Selection** next to the file-level actions. Only shown when something is actually selected; the selection is attached to the prompt and the answer lands in the Output panel.

### Project health panel

A new card in the AI side bar: how much disk the project uses, how many files, the biggest folders as bars, the last cleanup result broken down by step, plus **Clean up** and **Preview** buttons. Backed by a new Rust command `workspace_usage`, so the housekeeping feature is something you can *see* instead of a menu item you never find.

## Offline editor (no CDN)

`@monaco-editor/react` loads Monaco from jsdelivr on first use, which meant the packaged app needed the internet — and ran a different version (0.55.1) than the one in `package.json` (0.56.0). `src/lib/monacoSetup.ts` now bundles Monaco with the app and wires the five language workers (editor, TypeScript, JSON, CSS, HTML) through `MonacoEnvironment.getWorker`, so the editor works fully offline and the version matches. The workers are referenced by *relative* path on purpose: monaco's `exports` map does not expose those deep ESM paths, so the bare `monaco-editor/...?worker` specifier does not resolve.

## Housekeeping (`tools/vs_ide_clean.py`)

A Python script that keeps a workspace from turning into a multi-GB dump. It removes build output nobody will use again (`src-tauri/target/debug`, `dist`, `coverage`, `.vite`, `node_modules/.cache`, `*.tsbuildinfo`), prunes stale **AI checkpoint refs** in `.git` (each one pins a full snapshot — these are the biggest hidden cost) and then repacks, sweeps junk by name (`*.log`, `*.bak`, `*.tmp`, `Thumbs.db`, `__pycache__`, `*.pyc`, …) and clears the app's own `%TEMP%\vs-ide-run` leftovers.

Safety: source files are never touched, nothing inside `.git` is hand-deleted (`git gc` does the work), locked files (a running `.exe`) are skipped and reported, `--dry-run` really is inert, and the exit code is 0 even on error so it can never break a build.

```bash
python tools/vs_ide_clean.py                    # full clean of this folder
python tools/vs_ide_clean.py --dry-run         # report only
python tools/vs_ide_clean.py --quick            # startup mode
npm run clean:workspace                        # same, via npm
npm run housekeeping                           # node wrapper (never fails the build)
```

It runs on every start from two directions:

- **From source** — `predev` / `prebuild` in `package.json` call `tools/run-clean.mjs`, which finds Python (`py -3`, `python`, `python3`) and skips quietly if there is none. Startup mode only drops `target/debug` when it is more than a day old, so `tauri dev` is not forced into a full rebuild every launch.
- **From the app** — the Rust command `run_housekeeping` finds a checkout copy of the script next to the exe, otherwise writes the copy **embedded in the binary** (`include_str!`) to `%TEMP%` and runs it, returning a report. The launcher runs it in the background for the project you just opened, and **Settings → Housekeeping: Run Now / Preview** runs it on demand. Only the app's own projects are cleaned — never `src-tauri/target/release`, which holds the shipped `.exe`.

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
