// Library for Tauri app - exposes commands to the frontend

// Prevent dead code warnings in library mode
#![allow(dead_code)]

use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;
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

fn git(cwd: &str, args: &[&str]) -> Result<String, String> {
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
}

#[derive(serde::Serialize)]
struct GitStatus {
    repo: bool,
    branch: String,
    files: Vec<GitFile>,
}

/// `git status --porcelain=v1 -b` decoded into a branch + changed files.
#[tauri::command]
fn git_status(cwd: String) -> GitStatus {
    let mut result = GitStatus { repo: false, branch: String::new(), files: Vec::new() };
    let raw = match git(&cwd, &["status", "--porcelain=v1", "-b", "-uno"]) {
        Ok(s) => s,
        Err(_) => return result,
    };
    result.repo = true;
    for line in raw.lines() {
        if let Some(rest) = line.strip_prefix("## ") {
            // "main...origin/main [ahead 1]" -> "main"
            let name = rest.split("...").next().unwrap_or(rest);
            result.branch = name.split_whitespace().next().unwrap_or("").to_string();
            continue;
        }
        if line.len() < 4 {
            continue;
        }
        let code = &line[..2];
        let path = line[3..].trim().trim_matches('"').to_string();
        let staged = code.chars().next().map(|c| c != ' ' && c != '?').unwrap_or(false);
        result.files.push(GitFile { path, status: code.to_string(), staged });
    }
    result
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
        .invoke_handler(tauri::generate_handler![
            grant_workspace_scope,
            revoke_workspace_scope,
            run_command,
            write_temp_file,
            detect_shells,
            git_status,
            git_diff,
            git_gutter
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

