#!/usr/bin/env python3
"""
VS-IDE Housekeeping  (tools/vs_ide_clean.py)
=============================================
Removes the junk that quietly turns a dev folder into a multi-GB monster:

  1. build output nobody will ever use again (src-tauri/target/debug, dist,
     coverage, .vite, node_modules/.cache, release/incremental, *.tsbuildinfo)
  2. stale AI checkpoint refs in .git - every Cline / VS-IDE checkpoint pins a
     full snapshot of the tree, and a long session leaves hundreds of them
  3. stray logs, editor backups, __pycache__, Thumbs.db, *.pyc, ...
  4. the app's own leftovers in %TEMP%

Safety rules (this thing runs unattended on every app start):
  * source files are never touched - only regenerable build output
  * nothing inside .git is hand-deleted; `git gc` does the object pruning
  * every step is age-gated and can be previewed with --dry-run
  * a locked file (a running .exe) is skipped and reported, never fatal
  * the exit code is 0 even on internal errors, so it can never break
    `npm run dev` / `npm run build`

Usage
-----
    python tools/vs_ide_clean.py                    # clean this folder (full)
    python tools/vs_ide_clean.py --quick            # startup mode: keeps warm caches
    python tools/vs_ide_clean.py --dir C:\\code\\app # another workspace
    python tools/vs_ide_clean.py --dry-run          # report only, delete nothing
    python tools/vs_ide_clean.py --json             # + one machine-readable line
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

APP = "VS-IDE housekeeping"
JSON_PREFIX = "VSIDE_CLEAN_JSON:"

# Directories pruned wherever they are found (contents are always disposable).
JUNK_DIR_NAMES = ("__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".ipynb_checkpoints")
# Single files that are junk by name.
JUNK_FILE_GLOBS = ("*.log", "*.log.*", "npm-debug.log*", "yarn-error.log", "pnpm-debug.log*",
                   "*.tsbuildinfo", ".eslintcache", "*.bak", "*.orig", "*.rej", "*~", "*.tmp",
                   "Thumbs.db", "*.pyc", "*.pyo")
# Build output that can be regenerated from source at any time.
REGENERABLE_DIRS = ("dist", "dist-ssr", "coverage", ".vite", ".turbo")
# AI checkpoint refs: each one is a full snapshot, so they are the #1 space hog.
CHECKPOINT_PREFIXES = ("refs/cline/checkpoints/", "refs/checkpoints/", "refs/vs-ide/checkpoints/")
# Never descend into these while hunting for junk (handled explicitly instead).
NEVER_WALK = (".git", "node_modules", "target", "dist", "dist-ssr", "coverage",
              ".venv", "venv", "vendor", ".next", "out", "build")
MAX_ENTRIES = 250_000  # keep startup snappy on giant trees


def human(num: float) -> str:
    """12345678 -> '11.8 MB'."""
    n = float(num)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(n) < 1024.0 or unit == "TB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024.0
    return f"{n:.1f} TB"


def size_of(path: Path) -> int:
    """Total bytes of a file or tree (symlinks are counted, not followed)."""
    try:
        if path.is_file() or path.is_symlink():
            return path.lstat().st_size
    except OSError:
        return 0
    total = 0
    for base, _dirs, files in os.walk(path, onerror=lambda _e: None):
        for name in files:
            try:
                total += os.lstat(os.path.join(base, name)).st_size
            except OSError:
                pass
    return total


def age_days(path: Path) -> float:
    try:
        return (time.time() - path.stat().st_mtime) / 86400.0
    except OSError:
        return 0.0


def _clear_readonly(path: str) -> None:
    try:
        os.chmod(path, stat.S_IWRITE)
    except OSError:
        pass


def _rm_file(path: Path) -> None:
    _clear_readonly(str(path))
    os.unlink(path)


def _rm_tree(root: Path) -> None:
    """rmtree that also removes read-only git/cargo artefacts."""

    def retry(func, path, _exc=None):
        _clear_readonly(path)
        try:
            func(path)
        except OSError:
            pass  # still locked (running binary) -> caller reports it

    try:  # Python 3.12+ prefers onexc; 3.14 still accepts onerror with a warning
        shutil.rmtree(root, onexc=retry)
    except TypeError:
        shutil.rmtree(root, onerror=retry)


def remove_path(path: Path, dry_run: bool) -> tuple[int, str | None]:
    """Delete a file or tree. Returns (bytes_freed, error_or_None)."""
    if not path.exists() and not path.is_symlink():
        return 0, None
    size = size_of(path)
    if dry_run:
        return size, None
    try:
        if path.is_dir() and not path.is_symlink():
            _rm_tree(path)
        else:
            _rm_file(path)
    except OSError as e:
        return 0, f"{path.name}: {e.strerror or e}"
    return size, None


@dataclass
class Report:
    """What the run did - printed for humans and returned to the app as JSON."""
    target: str
    dry_run: bool = False
    freed: int = 0
    steps: list[dict] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def add(self, name: str, freed: int, detail: str, skipped: bool = False) -> None:
        self.steps.append({"name": name, "freed": freed,
                           "detail": detail, "skipped": skipped})
        self.freed += max(0, freed)

    def say(self, msg: str) -> None:
        print(f"  {msg}", flush=True)

    def to_dict(self) -> dict:
        return {"app": APP, "target": self.target, "dry_run": self.dry_run,
                "freed_bytes": self.freed, "freed_human": human(self.freed),
                "steps": self.steps, "notes": self.notes, "errors": self.errors,
                "when": int(time.time())}


# ---------------------------------------------------------------------------
# 1. build output (regenerable by definition)
# ---------------------------------------------------------------------------
def _drop(path: Path, rep: Report, label: str, min_age: float) -> int:
    """Age-gated delete of one build folder; returns bytes freed."""
    if age_days(path) < min_age:
        rep.say(f"kept {path.name} (changed {age_days(path):.1f} days ago)")
        return 0
    size = size_of(path)
    got, err = remove_path(path, rep.dry_run)
    if err:
        rep.errors.append(f"{path.name}: {err}")
        return 0
    verb = "would free" if rep.dry_run else "freed"
    if got:
        rep.say(f"{verb} {human(got)}  {label}: {path.name}")
    return got


def step_build_output(root: Path, rep: Report, min_age: float, full: bool) -> None:
    freed = 0
    # Hard target: the unused Rust debug build. `src-tauri/target/release` is kept
    # on purpose - it holds the shipped exe and a rebuild costs minutes.
    for p in (root / "src-tauri" / "target" / "debug", root / "target" / "debug"):
        if p.exists():
            # Startup mode only sweeps a debug build that has been sitting
            # around for a day, so `tauri dev` is not forced into a full
            # rebuild every single launch.
            freed += _drop(p, rep, "unused build output", min_age=0.0 if full else 1.0)

    if full:
        soft = [root / d for d in REGENERABLE_DIRS]
        soft += [root / "node_modules" / ".vite", root / "node_modules" / ".cache"]
        soft += [root / "src-tauri" / "target" / "release" / "incremental"]
        for p in soft:
            if p.exists():
                freed += _drop(p, rep, "regenerable build cache", min_age=min_age)

    freed += _sweep(root, rep, lambda n: n.endswith(".tsbuildinfo"),
                    "TypeScript build info", min_age=0.0, dirs=False)
    rep.add("Build output", freed, "target/debug, dist, caches, *.tsbuildinfo")


# ---------------------------------------------------------------------------
# 2. junk by name (logs, backups, python caches, thumbs.db ...)
# ---------------------------------------------------------------------------
def _matches(name: str, globs) -> bool:
    import fnmatch
    return any(fnmatch.fnmatch(name, g) for g in globs)


def _sweep(root: Path, rep: Report, match, label: str, min_age: float, dirs: bool = True) -> int:
    """Walk the tree (skipping NEVER_WALK folders) and remove what `match` hits.
    `dirs=True` matches folder names, `dirs=False` matches file names."""
    freed = 0
    seen = 0
    truncated = False
    for base, dirnames, filenames in os.walk(root, onerror=lambda _e: None):
        dirnames[:] = [d for d in dirnames if d not in NEVER_WALK]
        for name in (list(dirnames) if dirs else list(filenames)):
            if not match(name):
                continue
            target = Path(base) / name
            if age_days(target) < min_age:
                continue
            seen += 1
            if seen > MAX_ENTRIES:
                truncated = True
                dirnames[:] = []
                break
            got, err = remove_path(target, rep.dry_run)
            freed += got
            if err:
                rep.errors.append(f"{target.name}: {err}")
            elif dirs and name in dirnames:
                dirnames.remove(name)  # already gone - do not descend into it
    if truncated:
        rep.notes.append(f"{label}: scan limit ({MAX_ENTRIES:,} entries) reached, some left behind")
    return freed


def step_junk(root: Path, rep: Report, min_age: float) -> None:
    freed = _sweep(root, rep, lambda n: n in JUNK_DIR_NAMES, "Cache folders", min_age=0.0, dirs=True)
    freed += _sweep(root, rep, lambda n: _matches(n, JUNK_FILE_GLOBS), "Logs and backups", min_age, dirs=False)
    rep.add("Logs / backups", freed, "*.log, *.bak, *.tmp, Thumbs.db, __pycache__, *.pyc")


# ---------------------------------------------------------------------------
# 3. the app's own leftovers in %TEMP%
# ---------------------------------------------------------------------------
def step_temp(rep: Report, min_age: float) -> None:
    base = Path(tempfile.gettempdir()) / "vs-ide-run"
    if not base.exists():
        return
    freed = 0
    for item in base.iterdir():
        if age_days(item) < max(1.0, min_age):
            continue
        got, err = remove_path(item, rep.dry_run)
        freed += got
        if err:
            rep.errors.append(f"temp {item.name}: {err}")
    try:  # only removes the folder when it is empty
        base.rmdir()
    except OSError:
        pass
    if freed:
        rep.add("Temp files", freed, f"stale run files in {base}")


def _git(root: Path, *args: str, timeout: int = 180) -> tuple[int, str]:
    try:
        p = subprocess.run(["git", "-C", str(root), *args],
                           capture_output=True, text=True, timeout=timeout)
        return p.returncode, (p.stdout or "") + (p.stderr or "")
    except (OSError, subprocess.SubprocessError) as e:
        return 1, str(e)


def step_checkpoints(root: Path, rep: Report, keep: int, max_days: float, dry_run: bool = False) -> int:
    """Delete old refs/cline/checkpoints/*, keeping the newest `keep` per session."""
    if not (root / ".git").exists():
        return 0
    code, out = _git(root, "for-each-ref", "--format=%(refname)\t%(committerdate:unix)")
    if code != 0:
        rep.notes.append("git unavailable - checkpoint refs left alone")
        return 0
    refs: list[tuple[str, int]] = []
    for line in out.splitlines():
        if "\t" not in line:
            continue
        name, stamp = line.split("\t", 1)
        if any(name.startswith(p) for p in CHECKPOINT_PREFIXES):
            try:
                refs.append((name.strip(), int(stamp.strip() or 0)))
            except ValueError:
                pass
    if not refs:
        return 0
    refs.sort(key=lambda r: r[1], reverse=True)  # newest first
    per_session: dict[str, int] = {}
    doomed: list[str] = []
    for name, stamp in refs:
        session = name.rsplit("/", 1)[0]
        seen = per_session.get(session, 0)
        per_session[session] = seen + 1
        age = (time.time() - stamp) / 86400.0 if stamp else 0.0
        if seen < keep and age <= max_days:
            continue
        doomed.append(name)
    removed = 0
    if dry_run:  # a preview must never touch the repository
        if doomed:
            rep.say(f"would prune {len(doomed)} of {len(refs)} AI checkpoint ref(s)")
        return len(doomed)
    for name in doomed:
        if _git(root, "update-ref", "-d", name)[0] == 0:
            removed += 1
    if removed:
        rep.say(f"pruned {removed} of {len(refs)} AI checkpoint ref(s)")
    return removed


def step_git_gc(root: Path, rep: Report, do_gc: bool, dry_run: bool = False) -> None:
    """Objects unreachable after the refs went away are only reclaimed by git gc."""
    if not (root / ".git").exists():
        return
    git_dir = root / ".git"
    before = size_of(git_dir)
    if not do_gc:
        rep.add("Git repository", 0, f"{human(before)} of history kept (nothing expired)")
        return
    if dry_run:
        rep.add("Git objects", 0, f"would expire reflogs and repack {human(before)}", skipped=True)
        return
    _git(root, "reflog", "expire", "--expire=30.days", "--expire-unreachable=now", "--all")
    code, err = _git(root, "gc", "--prune=now", "--quiet")
    if code != 0:
        first = (err.strip().splitlines() or ["failed"])[0]
        rep.notes.append("git gc skipped: " + first[:120])
        return
    after = size_of(git_dir)
    rep.add("Git objects", max(0, before - after), f".git {human(before)} -> {human(after)}")


# ---------------------------------------------------------------------------
# driver
# ---------------------------------------------------------------------------
def looks_dangerous(root: Path) -> bool:
    """Refuse to clean a drive root, the home folder, or a system folder."""
    low = str(root).lower()
    anchor = Path(root.anchor or "")
    if anchor and root == anchor:
        return True
    protected = {str(Path(os.environ.get("SystemRoot", "C:/Windows"))).lower(),
                 str(Path(tempfile.gettempdir())).lower(),
                 str(Path.home()).lower()}
    return low in protected


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="vs_ide_clean.py", description="VS-IDE housekeeping")
    ap.add_argument("--dir", "-d", default=".", help="workspace folder to clean (default: .)")
    ap.add_argument("--quick", action="store_true", help="startup mode: keep warm caches")
    ap.add_argument("--dry-run", "-n", action="store_true", help="report only, delete nothing")
    ap.add_argument("--json", action="store_true", help="print one VSIDE_CLEAN_JSON: line")
    ap.add_argument("--min-age-days", type=float, default=0.0, help="only touch items older than this")
    ap.add_argument("--keep-checkpoints", type=int, default=20, help="checkpoints kept per session")
    ap.add_argument("--checkpoint-days", type=float, default=14.0, help="max age of a kept checkpoint")
    ap.add_argument("--no-git", action="store_true", help="skip checkpoint pruning + git gc")
    ap.add_argument("--strict", action="store_true", help="exit 1 when something went wrong")
    args = ap.parse_args(argv)

    try:
        root = Path(args.dir).expanduser()
        if root.exists():
            root = root.resolve()
    except OSError:
        root = Path(args.dir)
    if not root.is_dir():
        print(f"{APP}: not a folder: {root}")
        return 0
    if looks_dangerous(root):
        print(f"{APP}: refusing to clean {root} (too important)")
        return 0

    rep = Report(target=str(root), dry_run=args.dry_run)
    mode = "dry run" if args.dry_run else ("quick" if args.quick else "full")
    print(f"{APP} - {mode} - {root}")

    step_build_output(root, rep, args.min_age_days, full=not args.quick)
    step_junk(root, rep, args.min_age_days)
    if not args.quick:
        step_temp(rep, args.min_age_days)
    pruned = 0
    if not args.no_git:
        pruned = step_checkpoints(root, rep, max(0, args.keep_checkpoints), args.checkpoint_days, args.dry_run)
    step_git_gc(root, rep, do_gc=not args.no_git and (pruned > 0 or not args.quick), dry_run=args.dry_run)

    verb = "would free" if rep.dry_run else "freed"
    tail = f" · {len(rep.errors)} locked file(s) skipped" if rep.errors else ""
    print(f"{APP}: {verb} {human(rep.freed)}{tail}")
    for note in rep.notes:
        print(f"  note: {note}")
    if args.json:
        print(JSON_PREFIX + json.dumps(rep.to_dict()), flush=True)
    return 1 if (args.strict and rep.errors) else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"{APP}: interrupted")
        sys.exit(0)
    except Exception as exc:  # never break the caller's startup
        print(f"{APP}: unexpected error - {exc}", file=sys.stderr)
        sys.exit(0)
