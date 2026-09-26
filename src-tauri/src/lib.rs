// Library for Tauri app - exposes commands to the frontend

// Prevent dead code warnings in library mode
#![allow(dead_code)]

use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_fs::FsExt;

/// Lets the webview read/write inside one user-chosen folder (the workspace).
/// Scope is granted at runtime instead of a blanket `$HOME/**` capability, so
/// the AI agent can never touch files outside the folder the user opened.
#[tauri::command]
fn grant_workspace_scope(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.fs_scope()
        .allow_directory(PathBuf::from(&path), true)
        .map_err(|e| e.to_string())
}

/// Drop the grant again (used when a workspace is closed).
#[tauri::command]
fn revoke_workspace_scope(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.fs_scope()
        .forbid_directory(PathBuf::from(&path), true)
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Housekeeping (tools/vs_ide_clean.py)
//
// The script is compiled into the binary, so a packaged build can tidy a
// workspace up just like the dev checkout does. Python is found on PATH; when
// it is missing the app simply skips cleaning (and the caller reports it).
// ---------------------------------------------------------------------------

const HOUSEKEEP_PY: &str = include_str!("../../tools/vs_ide_clean.py");
const HOUSEKEEP_JSON_PREFIX: &str = "VSIDE_CLEAN_JSON:";

#[derive(serde::Serialize, Default, Clone)]
struct CleanupReport {
    ok: bool,
    target: String,
    freed_bytes: u64,
    freed_human: String,
    steps: Vec<serde_json::Value>,
    notes: Vec<String>,
    errors: Vec<String>,
    output: String,
    script: String,
    python: String,
}

/// A usable Python 3: the Windows launcher first, then python3/python.
fn find_python() -> Option<(String, Vec<String>)> {
    let candidates: Vec<(String, Vec<String>)> = if cfg!(target_os = "windows") {
        vec![
            ("py".to_string(), vec!["-3".to_string()]),
            ("python".to_string(), vec![]),
            ("python3".to_string(), vec![]),
        ]
    } else {
        vec![("python3".to_string(), vec![]), ("python".to_string(), vec![])]
    };
    for (program, args) in candidates {
        let mut probe = Command::new(&program);
        probe.args(&args).arg("--version");
        if let Ok(out) = exec(&mut probe, Duration::from_secs(10)) {
            if out.ok {
                return Some((program, args));
            }
        }
    }
    None
}

/// Locate vs_ide_clean.py. A checkout next to the app wins (so the script can
/// be edited); otherwise the embedded copy is written to %TEMP% and used.
fn housekeeping_script(app: &tauri::AppHandle) -> std::io::Result<PathBuf> {
    let file = "vs_ide_clean.py";
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("tools").join(file));
            // dev builds live in src-tauri/target/{debug,release}
            for up in ["..", "../..", "../../.."] {
                candidates.push(dir.join(up).join("tools").join(file));
            }
        }
    }
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("tools").join(file));
    }
    if let Ok(res) = app.path().resource_dir() {
        candidates.push(res.join("tools").join(file));
        candidates.push(res.join(file));
    }
    for c in candidates {
        if c.is_file() {
            return Ok(c);
        }
    }
    let mut dir = std::env::temp_dir();
    dir.push("vs-ide-tools");
    std::fs::create_dir_all(&dir)?;
    let path = dir.join(file);
    let unchanged = std::fs::read_to_string(&path)
        .map(|s| s == HOUSEKEEP_PY)
        .unwrap_or(false);
    if !unchanged {
        std::fs::write(&path, HOUSEKEEP_PY)?;
    }
    Ok(path)
}

/// Runs tools/vs_ide_clean.py against a folder and returns its report.
/// Called on app start (and on demand from the Settings menu).
#[tauri::command]
fn run_housekeeping(
    app: tauri::AppHandle,
    target: Option<String>,
    quick: Option<bool>,
    dry_run: Option<bool>,
) -> Result<CleanupReport, String> {
    let (python, pargs) =
        find_python().ok_or_else(|| "Python 3 was not found on this machine.".to_string())?;
    let script = housekeeping_script(&app)
        .map_err(|e| format!("Could not prepare the cleanup script: {e}"))?;
    let target = target
        .filter(|t| !t.trim().is_empty())
        .or_else(|| std::env::current_dir().ok().map(|p| p.to_string_lossy().to_string()))
        .unwrap_or_default();

    let mut cmd = Command::new(&python);
    cmd.args(&pargs)
        .arg(&script)
        .arg("--dir")
        .arg(&target)
        .arg("--json");
    if quick.unwrap_or(true) {
        cmd.arg("--quick");
    }
    if dry_run.unwrap_or(false) {
        cmd.arg("--dry-run");
    }
    // git gc on a huge repo can take a while - be generous, the caller shows a
    // "cleaning…" toast and the report when it lands.
    let out = exec(&mut cmd, Duration::from_secs(300))?;
    let mut report = CleanupReport {
        ok: out.ok,
        target,
        output: out.output.clone(),
        script: script.to_string_lossy().to_string(),
        python,
        ..Default::default()
    };
    if let Some(line) = out.output.lines().rev().find(|l| l.starts_with(HOUSEKEEP_JSON_PREFIX))
    {
        let body = &line[HOUSEKEEP_JSON_PREFIX.len()..];
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(body) {
            let arr = |k: &str| -> Vec<serde_json::Value> {
                v.get(k)
                    .and_then(|x| serde_json::from_value(x.clone()).ok())
                    .unwrap_or_default()
            };
            let strs = |k: &str| -> Vec<String> {
                arr(k)
                    .into_iter()
                    .filter_map(|x| x.as_str().map(str::to_string))
                    .collect()
            };
            report.freed_bytes = v.get("freed_bytes").and_then(|x| x.as_u64()).unwrap_or(0);
            report.freed_human = v
                .get("freed_human")
                .and_then(|x| x.as_str())
                .unwrap_or("0 B")
                .to_string();
            report.steps = arr("steps");
            report.notes = strs("notes");
            report.errors = strs("errors");
        }
    }
    Ok(report)
}

/// Minimal "YYYY-MM-DD" stamp, so a scaffolded README does not need a crate.
fn today_iso() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let z = (secs / 86_400) as i64 + 719_468; // days since epoch -> civil date
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1_460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    format!("{:04}-{:02}-{:02}", if m <= 2 { y + 1 } else { y }, m, d)
}

/// One row of the "where is my disk space going" report.
#[derive(serde::Serialize, Clone)]
pub struct UsageEntry {
    name: String,
    bytes: u64,
}

/// (bytes, file count) under `dir`, stopping after `max_depth` levels.
fn walk_size(dir: &std::path::Path, max_depth: usize, depth: usize) -> (u64, u64) {
    let Ok(rd) = std::fs::read_dir(dir) else { return (0, 0) };
    let mut bytes = 0u64;
    let mut files = 0u64;
    for entry in rd.flatten() {
        let path = entry.path();
        // symlink_metadata: do not follow links out of the workspace.
        let Ok(meta) = std::fs::symlink_metadata(&path) else { continue };
        if meta.is_dir() {
            if depth < max_depth {
                let (b, f) = walk_size(&path, max_depth, depth + 1);
                bytes += b;
                files += f;
            }
        } else if meta.is_file() {
            bytes += meta.len();
            files += 1;
        }
    }
    (bytes, files)
}

/// Project health: total size, file count and what is eating the space.
/// Powers the Project panel in the AI side bar, so the cleanup feature is
/// visible instead of a menu item nobody finds.
#[tauri::command]
fn workspace_usage(path: String, limit: Option<usize>) -> Result<serde_json::Value, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("{} is not a folder.", root.display()));
    }
    let want = limit.unwrap_or(8).clamp(1, 25);
    let (total, files) = walk_size(&root, 4, 0);

    // Biggest things directly inside the project (the answer people want:
    // "node_modules is 800 MB").
    let mut top: Vec<UsageEntry> = std::fs::read_dir(&root)
        .map(|rd| {
            rd.flatten()
                .filter_map(|entry| {
                    let p = entry.path();
                    let name = p.file_name()?.to_string_lossy().to_string();
                    if p.is_dir() {
                        let (b, _) = walk_size(&p, 4, 1);
                        Some(UsageEntry { name, bytes: b })
                    } else {
                        Some(UsageEntry {
                            name,
                            bytes: std::fs::symlink_metadata(&p).map(|m| m.len()).unwrap_or(0),
                        })
                    }
                })
                .collect()
        })
        .unwrap_or_default();
    top.sort_by(|a, b| b.bytes.cmp(&a.bytes));
    top.truncate(want);

    Ok(serde_json::json!({
        "path": root.to_string_lossy(),
        "total_bytes": total,
        "files": files,
        "top": top,
    }))
}

/// Folder names that Windows refuses (or that break tooling later on).
fn sanitize_dir_name(name: &str) -> Result<String, String> {
    let n = name.trim();
    if n.is_empty() {
        return Err("Give the project a name first.".into());
    }
    if n == "." || n == ".." {
        return Err("That is not a usable folder name.".into());
    }
    if n.chars().any(|c| "<>:\"/\\|?*".contains(c) || (c as u32) < 32) {
        return Err("A folder name cannot contain \\ / : * ? \" < > |".into());
    }
    if n.ends_with('.') || n.ends_with(' ') {
        return Err("A folder name cannot end with a space or a dot.".into());
    }
    let stem = n.split('.').next().unwrap_or(n).to_ascii_uppercase();
    let reserved = ["CON", "PRN", "AUX", "NUL"].contains(&stem.as_str())
        || (stem.len() == 4
            && (stem.starts_with("COM") || stem.starts_with("LPT"))
            && stem[3..]
                .parse::<u8>()
                .map(|d| (1..=9).contains(&d))
                .unwrap_or(false));
    if reserved {
        return Err(format!("{n} is a reserved Windows name - pick another."));
    }
    Ok(n.to_string())
}

const GITIGNORE: &str =
    "node_modules/\ndist/\nbuild/\ntarget/\n__pycache__/\n*.log\n.DS_Store\nThumbs.db\n";

/// Starter files for a new project: (relative path, contents).
fn scaffold(template: &str, name: &str) -> Vec<(String, String)> {
    let slug = name.to_lowercase().replace(' ', "-");
    let readme = format!("# {name}\n\nCreated with VS-IDE on {}.\n", today_iso());
    let v = |p: &str, body: String| (p.to_string(), body);
    match template {
        "web" => vec![
            v("index.html", format!("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\" />\n  <title>{name}</title>\n  <link rel=\"stylesheet\" href=\"styles.css\" />\n</head>\n<body>\n  <h1>Hello from VS-IDE</h1>\n  <button id=\"go\">Click me</button>\n  <script src=\"app.js\"></script>\n</body>\n</html>\n")),
            v("styles.css", ":root { color-scheme: dark; }\nbody { font-family: system-ui, sans-serif; background: #150a0f; color: #f4e9d8; display: grid; place-items: center; height: 100vh; margin: 0; }\nbutton { padding: 8px 16px; border-radius: 8px; border: 1px solid #e9c46a; background: transparent; color: #e9c46a; cursor: pointer; }\n".into()),
            v("app.js", "document.getElementById('go').addEventListener('click', () => {\n  console.log('it works');\n});\n".into()),
            v(".gitignore", GITIGNORE.into()),
            v("README.md", readme),
        ],
        "node" => vec![
            v("package.json", format!("{{\n  \"name\": \"{slug}\",\n  \"version\": \"1.0.0\",\n  \"type\": \"module\",\n  \"main\": \"index.js\",\n  \"scripts\": {{ \"start\": \"node index.js\" }},\n  \"license\": \"MIT\"\n}}\n")),
            v("index.js", format!("console.log('{name} is running');\n")),
            v(".gitignore", GITIGNORE.into()),
            v("README.md", readme),
        ],
        "python" => vec![
            v("main.py", format!("def main() -> None:\n    print(\"Hello from {name}\")\n\n\nif __name__ == \"__main__\":\n    main()\n")),
            v("requirements.txt", String::new()),
            v(".gitignore", format!(".venv/\n{GITIGNORE}")),
            v("README.md", readme),
        ],
        "react" => vec![
            v("package.json", format!("{{\n  \"name\": \"{slug}\",\n  \"private\": true,\n  \"version\": \"0.1.0\",\n  \"type\": \"module\",\n  \"scripts\": {{ \"dev\": \"vite\", \"build\": \"vite build\" }},\n  \"devDependencies\": {{ \"vite\": \"^5\", \"typescript\": \"^5\" }}\n}}\n")),
            v("index.html", format!("<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>{name}</title>\n  </head>\n  <body>\n    <div id=\"root\"></div>\n    <script type=\"module\" src=\"/src/main.tsx\"></script>\n  </body>\n</html>\n")),
            v("src/main.tsx", "import \"./styles.css\";\nimport { App } from \"./App\";\n\nconst root = document.getElementById(\"root\")!;\nroot.render(<App />);\n".into()),
            v("src/App.tsx", format!("export function App() {{\n  return <h1>Hello from {name}</h1>;\n}}\n")),
            v("src/styles.css", ":root { color-scheme: dark; }\nbody { margin: 0; font-family: system-ui, sans-serif; background: #150a0f; color: #f4e9d8; }\n".into()),
            v(".gitignore", GITIGNORE.into()),
            v("README.md", readme),
        ],
        _ => vec![v(".gitignore", GITIGNORE.into()), v("README.md", readme)],
    }
}

/// Creates a project folder (with a small starter structure) anywhere on disk and
/// returns its absolute path. Used by the splash screen's "New Project" flow.
#[tauri::command]
fn create_project_folder(parent: String, name: String, template: String) -> Result<String, String> {
    let name = sanitize_dir_name(&name)?;
    let parent_path = PathBuf::from(parent.trim());
    if !parent_path.is_dir() {
        return Err(format!("{} is not a folder.", parent_path.display()));
    }
    let path = parent_path.join(&name);
    if path.exists() {
        return Err(format!("{} already exists.", path.display()));
    }
    std::fs::create_dir_all(&path).map_err(|e| format!("Could not create the folder: {e}"))?;
    for (rel, body) in scaffold(&template, &name) {
        let full = path.join(&rel);
        if let Some(dir) = full.parent() {
            std::fs::create_dir_all(dir).map_err(|e| format!("Could not create {rel}: {e}"))?;
        }
        std::fs::write(&full, body).map_err(|e| format!("Could not write {rel}: {e}"))?;
    }
    Ok(path.to_string_lossy().to_string())
}

// ---------------------------------------------------------------------------
// Sign-in (OAuth 2.0 + PKCE, loopback redirect)
//
// The browser is opened for the provider's consent screen and we listen on
// 127.0.0.1 for the redirect, exactly like `gh auth login` and the VS Code
// extensions do. std::net is enough for a one-shot HTTP GET, so this needs no
// extra crate and opens no inbound port beyond the loopback interface.
//
// The code that comes back is exchanged for a token by the frontend, which
// shells out to curl (Rust cannot do TLS with std alone).
// ---------------------------------------------------------------------------

/// Minimal percent-decoding for query strings.
fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            b'+' => {
                out.push(b' ');
                i += 1;
            }
            b'%' if i + 2 < bytes.len() => {
                let hex = std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("");
                match u8::from_str_radix(hex, 16) {
                    Ok(b) => {
                        out.push(b);
                        i += 3;
                    }
                    Err(_) => {
                        out.push(bytes[i]);
                        i += 1;
                    }
                }
            }
            b => {
                out.push(b);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

/// Pull `key` out of a redirect query string, decoded.
fn query_value(query: &str, key: &str) -> Option<String> {
    for pair in query.split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            if k.eq_ignore_ascii_case(key) {
                return Some(percent_decode(v));
            }
        }
    }
    None
}

/// What the provider redirected back with, plus the exact redirect_uri that
/// was used (the token exchange has to repeat it byte for byte).
#[derive(serde::Serialize)]
struct AuthCallback {
    query: String,
    redirect: String,
}

/// Opens `url` in the user's browser and blocks until the provider redirects
/// back to `127.0.0.1:<port>/<redirect_path>`.
#[tauri::command]
fn auth_begin(url: String, redirect_path: String, timeout_secs: Option<u64>) -> Result<AuthCallback, String> {
    use std::io::{Read, Write};
    use std::net::TcpListener;

    let want_raw = redirect_path.trim_start_matches('/');
    let want = if want_raw.is_empty() { "callback".to_string() } else { want_raw.to_string() };
    let deadline = std::time::Duration::from_secs(timeout_secs.unwrap_or(180).clamp(10, 900));

    // Bind a free loopback port (retry in case something else grabbed it).
    let mut bound = None;
    let mut port = 0u16;
    for _ in 0..20 {
        if let Ok(l) = TcpListener::bind(("127.0.0.1", 0)) {
            port = l.local_addr().map(|a| a.port()).unwrap_or(0);
            bound = Some(l);
            break;
        }
    }
    let listener = bound.ok_or_else(|| "Could not open a loopback port for sign-in.".to_string())?;

    // Pin the redirect URI to the port we actually got, then open the browser.
    let redirect_uri = format!("http://127.0.0.1:{port}/{want}");
    let fixed = url.replace("__REDIRECT__", &redirect_uri);
    let _ = if cfg!(target_os = "windows") {
        std::process::Command::new("cmd").args(["/C", "start", "", &fixed]).spawn().is_ok()
    } else {
        std::process::Command::new("xdg-open").arg(&fixed).spawn().is_ok()
    };

    listener.set_nonblocking(true).ok();
    let started = std::time::Instant::now();
    loop {
        if started.elapsed() > deadline {
            return Err("Sign-in timed out before the browser came back.".into());
        }
        let accepted = match listener.accept() {
            Ok(pair) => pair,
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(std::time::Duration::from_millis(120));
                continue;
            }
            Err(e) => return Err(format!("Sign-in listener failed: {e}")),
        };
        let (mut stream, _addr) = accepted;
        let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(5)));
        let mut buf = [0u8; 8192];
        let n = stream.read(&mut buf).unwrap_or(0);
        let head = String::from_utf8_lossy(&buf[..n]).to_string();
        let target = head.lines().next().and_then(|l| l.split_whitespace().nth(1)).unwrap_or("/").to_string();
        let (path, query) = match target.split_once('?') {
            Some((p, q)) => (p.to_string(), q.to_string()),
            None => (target.clone(), String::new()),
        };
        if !path.trim_end_matches('/').ends_with(&want) {
            let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\n\r\n");
            continue;
        }

        let failed = query_value(&query, "error").is_some();
        let body = if failed {
            "Sign-in was cancelled or denied."
        } else {
            "Signed in - you can close this tab."
        };
        let page = format!(
            "<!doctype html><meta charset=utf-8><title>VS-IDE</title>\
             <body style='font:16px system-ui;background:#150a10;color:#f4e9d8;display:grid;place-items:center;height:100vh;margin:0'>\
             <div style='text-align:center'><h1 style='color:#e9c46a'>{body}</h1>\
             <p style='opacity:.65'>VS-IDE</p></div>"
        );
        let _ = stream.write_all(
            format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                page.len(), page
            )
            .as_bytes(),
        );
        let _ = stream.flush();
        return match query_value(&query, "error") {
            Some(e) => Err(e),
            None => Ok(AuthCallback { query, redirect: redirect_uri }),
        };
    }
}

// ---------------------------------------------------------------------------
// Integrated terminal / code execution
//
// Non-interactive by design: stdin is closed, so scripts that wait for input
// fail fast instead of hanging the terminal forever. The whole run is bounded
// by a timeout, after which the child process is killed.
// ---------------------------------------------------------------------------

#[derive(serde::Serialize)]
struct RunOutput {
    ok: bool,
    code: Option<i32>,
    output: String,
    timed_out: bool,
}

/// C:\Users\me\repo  ->  /mnt/c/Users/me/repo   (only WSL needs this).
fn to_wsl_path(p: &str) -> String {
    let mut s = p.replace('\\', "/");
    if s.len() >= 2 && s.as_bytes()[1] == b':' {
        let drive = s[..1].to_lowercase();
        s = format!("/mnt/{}{}", drive, &s[2..]);
    }
    s
}

/// Builds the shell invocation for a profile id: cmd, powershell, pwsh,
/// git-bash, bash, sh, wsl. Unknown/empty values fall back to the platform
/// default (cmd on Windows, sh elsewhere).
fn shell_command(profile: &str, cmd: &str) -> Command {
    if cfg!(target_os = "windows") {
        match profile {
            "powershell" => {
                let mut c = Command::new("powershell");
                c.args(["-NoProfile", "-NonInteractive", "-Command", cmd]);
                c
            }
            "pwsh" => {
                let mut c = Command::new("pwsh");
                c.args(["-NoProfile", "-NonInteractive", "-Command", cmd]);
                c
            }
            "git-bash" | "bash" => {
                // Git for Windows ships bash; fall back to PATH bash.
                let bash = {
                    let git_bash = PathBuf::from("C:\\Program Files\\Git\\bin\\bash.exe");
                    if git_bash.exists() {
                        git_bash.to_string_lossy().to_string()
                    } else {
                        "bash".to_string()
                    }
                };
                let mut c = Command::new(bash);
                c.args(["-lc", cmd]);
                c
            }
            "sh" => {
                let mut c = Command::new("bash");
                c.args(["-lc", cmd]);
                c
            }
            "wsl" => {
                let mut c = Command::new("wsl");
                c.args(["bash", "-lc", cmd]);
                c
            }
            _ => {
                let mut c = Command::new("cmd");
                c.args(["/C", cmd]);
                c
            }
        }
    } else {
        match profile {
            "pwsh" => {
                let mut c = Command::new("pwsh");
                c.args(["-NoProfile", "-NonInteractive", "-Command", cmd]);
                c
            }
            _ => {
                let mut c = Command::new("sh");
                c.arg("-c").arg(cmd);
                c
            }
        }
    }
}

/// Runs a command line and waits for it, collecting stdout + stderr.
/// `shell` selects the interpreter profile; `cwd` is the workspace folder.
fn exec(command: &mut Command, timeout: Duration) -> Result<RunOutput, String> {
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Could not start process: {}", e))?;

    // Drain both pipes on worker threads so a chatty child can't deadlock.
    let mut out_pipe = child.stdout.take().ok_or("no stdout")?;
    let mut err_pipe = child.stderr.take().ok_or("no stderr")?;
    let out_handle = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = out_pipe.read_to_end(&mut buf);
        buf
    });
    let err_handle = std::thread::spawn(move || {
        let mut buf = Vec::new();
        let _ = err_pipe.read_to_end(&mut buf);
        buf
    });

    // Poll for completion; kill the process once the deadline passes.
    let started = std::time::Instant::now();
    let mut timed_out = false;
    let status = loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(s) => break Some(s),
            None => {
                if started.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    timed_out = true;
                    break None;
                }
                std::thread::sleep(Duration::from_millis(40));
            }
        }
    };

    let stdout = out_handle.join().unwrap_or_default();
    let stderr = err_handle.join().unwrap_or_default();
    let mut text = String::from_utf8_lossy(&stdout).into_owned();
    let err_text = String::from_utf8_lossy(&stderr).into_owned();
    if !err_text.is_empty() {
        if !text.is_empty() && !text.ends_with('\n') {
            text.push('\n');
        }
        text.push_str(&err_text);
    }
    if timed_out {
        text.push_str("\n[timed out — process killed]");
    }

    Ok(RunOutput {
        ok: status.as_ref().map(|s| s.success()).unwrap_or(false),
        code: status.and_then(|s| s.code()),
        output: text,
        timed_out,
    })
}

/// Runs a command line through the selected shell in the workspace directory.
#[tauri::command]
fn run_command(cmd: String, cwd: Option<String>, timeout_ms: Option<u64>, shell: Option<String>) -> Result<RunOutput, String> {
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(20_000));
    let profile = shell.unwrap_or_default().to_lowercase();
    let mut command = shell_command(&profile, &cmd);
    if let Some(dir) = &cwd {
        let d = if profile == "wsl" && cfg!(target_os = "windows") {
            to_wsl_path(dir)
        } else {
            dir.clone()
        };
        command.current_dir(d);
    }
    exec(&mut command, timeout)
}

/// Writes an unsaved editor buffer to a temp file so it can be executed.
#[tauri::command]
fn write_temp_file(name: String, contents: String) -> Result<String, String> {
    let safe: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || "._-".contains(c) { c } else { '_' })
        .collect();
    let safe = if safe.is_empty() { "untitled.txt".to_string() } else { safe };
    let mut dir = std::env::temp_dir();
    dir.push("vs-ide-run");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    dir.push(safe);
    std::fs::write(&dir, contents).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[derive(serde::Serialize)]
struct ShellInfo {
    id: String,
    available: bool,
    version: Option<String>,
}

/// Probe which shells / CLIs actually exist on this machine.
#[tauri::command]
fn detect_shells() -> Vec<ShellInfo> {
    struct Probe {
        id: &'static str,
        program: &'static str,
        args: &'static [&'static str],
    }

    let probes: &[Probe] = if cfg!(target_os = "windows") {
        &[
            Probe { id: "cmd", program: "cmd", args: &["/C", "ver"] },
            Probe { id: "powershell", program: "powershell", args: &["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"] },
            Probe { id: "pwsh", program: "pwsh", args: &["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"] },
            Probe { id: "git-bash", program: "C:\\Program Files\\Git\\bin\\bash.exe", args: &["--version"] },
            Probe { id: "wsl", program: "wsl", args: &["--status"] },
        ]
    } else {
        &[
            Probe { id: "sh", program: "sh", args: &["-c", "echo ok"] },
            Probe { id: "bash", program: "bash", args: &["--version"] },
            Probe { id: "pwsh", program: "pwsh", args: &["-NoProfile", "-NonInteractive", "-Command", "$PSVersionTable.PSVersion.ToString()"] },
        ]
    };

    probes
        .iter()
        .map(|p| {
            let version = Command::new(p.program)
                .args(p.args)
                .stdin(Stdio::null())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .ok()
                .filter(|o| o.status.success())
                .map(|o| {
                    let s = String::from_utf8_lossy(&o.stdout).into_owned();
                    let first = s.lines().next().unwrap_or("").trim().to_string();
                    if first.len() > 90 {
                        first[..90].to_string()
                    } else {
                        first
                    }
                });
            ShellInfo { id: p.id.to_string(), available: version.is_some(), version }
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Git integration — powers the Source Control panel and the editor gutter.
// Everything shells out to `git -C <workspace>`; a missing repo or missing git
// binary returns a soft/empty result so the UI never has to crash.
// ---------------------------------------------------------------------------

/// Run git with literal arguments.
fn git(cwd: &str, args: &[&str]) -> Result<String, String> {
    let owned: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    git_owned(cwd, &owned)
}

/// Same, for commands whose arguments are built at runtime (file paths).
fn git_owned(cwd: &str, args: &[String]) -> Result<String, String> {
    let out = Command::new("git")
        .arg("-C")
        .arg(cwd)
        .args(args)
        .stdin(Stdio::null())
        .output()
        .map_err(|e| format!("git unavailable: {}", e))?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&out.stdout).into_owned())
}

#[derive(serde::Serialize)]
struct GitFile {
    path: String,
    /// Two-letter porcelain code, e.g. " M", "??", "A ".
    status: String,
    staged: bool,
    untracked: bool,
    conflicted: bool,
    /// Set for renames/copies: where the file came from.
    orig_path: Option<String>,
}

#[derive(serde::Serialize)]
struct GitStatus {
    repo: bool,
    branch: String,
    /// "origin/main" when a tracking branch is configured.
    upstream: String,
    /// Commits the branch is ahead of / behind its upstream.
    ahead: u32,
    behind: u32,
    remote: String,
    has_commits: bool,
    /// True on a detached HEAD.
    detached: bool,
    files: Vec<GitFile>,
}

impl GitStatus {
    fn empty() -> Self {
        GitStatus {
            repo: false, branch: String::new(), upstream: String::new(),
            ahead: 0, behind: 0, remote: String::new(), has_commits: false,
            detached: false, files: Vec::new(),
        }
    }
}

/// `git status --porcelain=v2 --branch`: branch + upstream + ahead/behind +
/// staged / unstaged / untracked / conflicted files, decoded for the SCM panel.
#[tauri::command]
fn git_status(cwd: String) -> GitStatus {
    let mut out = GitStatus::empty();
    let raw = match git(&cwd, &["status", "--porcelain=v2", "--branch"]) {
        Ok(s) => s,
        Err(_) => return out,
    };
    out.repo = true;

    for line in raw.lines() {
        if let Some(rest) = line.strip_prefix("# ") {
            let (key, value) = match rest.split_once(' ') {
                Some((k, v)) => (k, v),
                None => (rest, ""),
            };
            match key {
                "branch.head" => {
                    out.has_commits = value != "(initial)";
                    out.detached = value == "(detached)";
                    out.branch = if out.detached { "(detached HEAD)".into() } else { value.to_string() };
                }
                "branch.upstream" => out.upstream = value.to_string(),
                "branch.remote" => out.remote = value.to_string(),
                "branch.ab" => {
                    for part in value.split_whitespace() {
                        let (sign, num) = part.split_at(1);
                        let n: u32 = num.parse().unwrap_or(0);
                        if sign == "+" { out.ahead = n; } else { out.behind = n; }
                    }
                }
                _ => {}
            }
            continue;
        }

        // Entries: "1 XY ..." / "2 XY ..." / "u XY ..." / "? path" / "! path"
        let kind = line.chars().next().unwrap_or(' ');
        if kind == '?' || kind == '!' {
            let path = line[2..].trim().trim_matches('"').to_string();
            out.files.push(GitFile {
                path,
                status: if kind == '?' { "??".into() } else { "!!".into() },
                staged: false,
                untracked: kind == '?',
                conflicted: false,
                orig_path: None,
            });
            continue;
        }
        if line.len() < 9 {
            continue;
        }
        let xy = &line[2..4];
        let conflicted = kind == 'u' || xy == "AA" || xy == "DD";
        // v2 puts the path last; renames use "path\torigPath".
        let (head, orig) = match line.split_once('\t') {
            Some((h, o)) => (h, Some(o.trim().trim_matches('"').to_string())),
            None => (line, None),
        };
        let path = head
            .rsplit_once(' ')
            .map(|(_, p)| p)
            .unwrap_or("")
            .trim()
            .trim_matches('"')
            .to_string();
        let staged = xy.chars().next().map(|c| c != '.' && c != ' ' && c != '?').unwrap_or(false);
        out.files.push(GitFile {
            path,
            status: xy.to_string(),
            staged,
            untracked: false,
            conflicted,
            orig_path: orig,
        });
    }
    out
}

#[derive(serde::Serialize)]
struct GitCommit {
    short: String,
    author: String,
    date: String,
    subject: String,
}

/// Recent history, newest first — the SCM panel's activity list.
#[tauri::command]
fn git_log(cwd: String, limit: Option<u32>) -> Result<Vec<GitCommit>, String> {
    let n = limit.unwrap_or(20).clamp(1, 200);
    let raw = git(&cwd, &[
        "log", &format!("-{n}"),
        "--pretty=format:%h%x1f%an%x1f%ad%x1f%s", "--date=short",
    ])?;
    Ok(raw
        .lines()
        .filter_map(|line| {
            let mut it = line.split('\u{1f}');
            Some(GitCommit {
                short: it.next()?.to_string(),
                author: it.next().unwrap_or("").to_string(),
                date: it.next().unwrap_or("").to_string(),
                subject: it.next().unwrap_or("").to_string(),
            })
        })
        .collect())
}

/// Stage (`git add`) or unstage (`git restore --staged`) the given paths.
#[tauri::command]
fn git_stage(cwd: String, paths: Vec<String>, staged: bool) -> Result<String, String> {
    if paths.is_empty() {
        return Ok(String::new());
    }
    if staged {
        let mut args: Vec<String> = vec!["add".into(), "--".into()];
        args.extend(paths);
        return git_owned(&cwd, &args);
    }
    // `restore --staged` needs git >= 2.23; fall back to `reset HEAD --`.
    let mut args: Vec<String> = vec!["restore".into(), "--staged".into(), "--".into()];
    args.extend(paths.clone());
    match git_owned(&cwd, &args) {
        Ok(o) => Ok(o),
        Err(_) => {
            let mut fallback: Vec<String> = vec!["reset".into(), "HEAD".into(), "--".into()];
            fallback.extend(paths);
            git_owned(&cwd, &fallback)
        }
    }
}

/// Throw away changes to a file: working-tree copy, staged copy, or both.
#[tauri::command]
fn git_discard(cwd: String, path: String, staged: bool) -> Result<String, String> {
    if staged {
        git(&cwd, &["restore", "--staged", "--worktree", "--", &path])
    } else {
        git(&cwd, &["checkout", "--", &path])
    }
}

/// `git add -A` then commit. `all = false` commits whatever is already staged.
#[tauri::command]
fn git_commit(cwd: String, message: String, all: Option<bool>) -> Result<String, String> {
    let msg = message.trim();
    if msg.is_empty() {
        return Err("The commit message is empty.".into());
    }
    if all.unwrap_or(true) {
        git(&cwd, &["add", "-A"])?;
    }
    git(&cwd, &["commit", "-m", msg])
}

/// Fetch, then fast-forward the branch, then push whatever is ahead.
#[tauri::command]
fn git_sync(cwd: String) -> Result<String, String> {
    let mut log = String::new();
    let (ahead, behind, has_upstream) = match git(&cwd, &["status", "--porcelain=v2", "--branch"]) {
        Ok(s) => {
            let mut a = 0;
            let mut b = 0;
            let mut up = false;
            for line in s.lines().filter_map(|l| l.strip_prefix("# ")) {
                if let Some(rest) = line.strip_prefix("branch.ab ") {
                    for part in rest.split_whitespace() {
                        let (sign, num) = part.split_at(1);
                        let n: u32 = num.parse().unwrap_or(0);
                        if sign == "+" { a = n; } else { b = n; }
                    }
                }
                if line.starts_with("branch.upstream ") { up = true; }
            }
            (a, b, up)
        }
        Err(_) => (0, 0, false),
    };

    if has_upstream {
        log.push_str("$ git fetch --all --prune\n");
        log.push_str(&git(&cwd, &["fetch", "--all", "--prune"])?);
        if behind > 0 {
            log.push_str("\n$ git pull --ff-only\n");
            // A non-fast-forward means local history diverged: stop and say so
            // instead of silently creating a surprise merge commit.
            match git(&cwd, &["pull", "--ff-only"]) {
                Ok(o) => log.push_str(&o),
                Err(e) => return Err(format!("Pull needs a merge or rebase (fast-forward refused):\n{e}")),
            }
        }
    }
    if ahead > 0 {
        log.push_str("\n$ git push\n");
        log.push_str(&git(&cwd, &["push"])?);
    }
    if log.is_empty() {
        log.push_str("Nothing to sync - no upstream branch yet (push once to create it).");
    }
    Ok(log)
}

#[tauri::command]
fn git_fetch(cwd: String) -> Result<String, String> {
    git(&cwd, &["fetch", "--all", "--prune"])
}

#[tauri::command]
fn git_branch_new(cwd: String, name: String) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Give the branch a name.".into());
    }
    if !name.chars().all(|c| c.is_alphanumeric() || "-_/.".contains(c)) {
        return Err("Branch names may use letters, numbers, - _ / and .".into());
    }
    git(&cwd, &["checkout", "-b", name])
}

#[tauri::command]
fn git_init(cwd: String) -> Result<String, String> {
    // `-b main` needs git >= 2.28; fall back to a plain init when it is old.
    match git(&cwd, &["init", "-b", "main"]) {
        Ok(o) => Ok(o),
        Err(_) => git(&cwd, &["init"]),
    }
}

#[tauri::command]
fn git_remote_add(cwd: String, name: String, url: String) -> Result<String, String> {
    let n = if name.trim().is_empty() { "origin" } else { name.trim() };
    let url = url.trim();
    if !url.starts_with("http://") && !url.starts_with("https://") && !url.contains('@') {
        return Err("That does not look like a git remote URL.".into());
    }
    git(&cwd, &["remote", "add", n, url])
}

/// Unified diff for one file — used by the diff viewer.
/// `staged` compares HEAD against the index, otherwise the index against the
/// working tree. Untracked files diff against /dev/null.
#[tauri::command]
fn git_diff(cwd: String, path: String, staged: Option<bool>) -> Result<String, String> {
    if staged.unwrap_or(false) {
        return git(&cwd, &["diff", "--cached", "--", &path]);
    }
    match git(&cwd, &["diff", "--", &path]) {
        Ok(d) if !d.is_empty() => Ok(d),
        // Untracked / no-index file: show it as pure additions.
        _ => git(&cwd, &["diff", "--no-index", "--", "/dev/null", &path]),
    }
}

/// Per-line change markers for the editor gutter:
/// "+" added, "-" deleted (anchored to the line below), "~" modified.
#[derive(serde::Serialize)]
struct LineChange {
    line: u32,
    kind: String,
}

/// "12,3" -> (12, 3); "12" -> (12, 1); "0,0" -> (0, 0).
fn parse_range(spec: &str) -> (u32, u32) {
    let mut it = spec.split(',');
    let start = it.next().unwrap_or("0").parse::<u32>().unwrap_or(0);
    let len = it.next().map(|v| v.parse::<u32>().unwrap_or(1)).unwrap_or(1);
    (start, len)
}

#[tauri::command]
fn git_gutter(cwd: String, path: String) -> Result<Vec<LineChange>, String> {
    // -U0 gives tight hunks; --no-color keeps the parser simple.
    let diff = git(&cwd, &["diff", "--no-color", "-U0", "--", &path])?;
    let mut changes: Vec<LineChange> = Vec::new();
    for line in diff.lines() {
        if !line.starts_with("@@") {
            continue;
        }
        // @@ -a,b +c,d @@
        let body = line.split("@@").nth(1).unwrap_or("").trim();
        let mut parts = body.split_whitespace();
        let (old_start, old_len) = parse_range(parts.next().unwrap_or("").trim_start_matches('-'));
        let (new_start, new_len) = parse_range(parts.next().unwrap_or("").trim_start_matches('+'));
        if new_len == 0 {
            // Pure deletion — anchor to the line where it used to be.
            changes.push(LineChange { line: old_start.max(1), kind: "-".into() });
        } else if old_len == 0 {
            for i in 0..new_len {
                changes.push(LineChange { line: new_start + i, kind: "+".into() });
            }
        } else {
            for i in 0..new_len {
                changes.push(LineChange { line: new_start + i, kind: "~".into() });
            }
        }
    }
    // Collapse duplicate lines (a line can appear in several hunks).
    changes.sort_by_key(|c| c.line);
    changes.dedup_by_key(|c| c.line);
    Ok(changes)
}

/// App entry point (called from main.rs) so the command macros and the handler
/// stay in the same crate.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        // In-app updates. Checked in the background on launch; a failure (no
        // network, no release yet) is swallowed by the caller, so the app never
        // depends on it.
        .plugin(tauri_plugin_updater::Builder::new().build())
        // Only used to relaunch the app after an update has been installed.
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            grant_workspace_scope,
            revoke_workspace_scope,
            run_housekeeping,
            create_project_folder,
            workspace_usage,
            run_command,
            write_temp_file,
            detect_shells,
            git_status,
            git_log,
            git_stage,
            git_discard,
            git_commit,
            git_sync,
            git_fetch,
            git_branch_new,
            git_init,
            git_remote_add,
            git_diff,
            git_gutter,
            auth_begin
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

