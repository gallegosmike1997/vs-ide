import { langFromName, type TabDef } from "../store";

function uid(prefix = "file"): string {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
}

function pickFiles(acceptFolder = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    if (acceptFolder) {
      (input as any).webkitdirectory = true;
    }
    input.onchange = () => {
      const files = Array.from(input.files || []);
      resolve(files);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}

const TEXT_EXT = /\.(tsx?|jsx?|mjs|cjs|json|md|markdown|txt|py|rs|go|java|cs|css|scss|html|xml|yml|yaml|toml|ini|sh|sql|vue|svelte)$/i;
export { TEXT_EXT };
const MAX_FILE_BYTES = 400 * 1024;
const MAX_FILES = 60;

export async function openFilePicker(): Promise<TabDef[]> {
  const files = await pickFiles(false);
  return readAsTabs(files, null);
}

export async function openFolderPicker(): Promise<{ tabs: TabDef[]; folder: string }> {
  const files = await pickFiles(true);
  const folder = files.length ? (files[0] as any).webkitRelativePath?.split("/")[0] || "folder" : "folder";
  const tabs = await readAsTabs(files, folder);
  return { tabs, folder };
}

async function readAsTabs(files: File[], folder: string | null): Promise<TabDef[]> {
  const out: TabDef[] = [];
  const list = files.slice(0, MAX_FILES);
  for (const f of list) {
    const rel = (f as any).webkitRelativePath as string | undefined;
    const name = folder && rel ? rel : f.name;
    if (!TEXT_EXT.test(f.name)) continue;
    if (f.size > MAX_FILE_BYTES) continue;
    try {
      const text = await f.text();
      out.push({ id: uid("disk"), label: name, language: langFromName(f.name), content: text, dirty: false, path: name });
    } catch { /* skip */ }
  }
  return out;
}

export function downloadTab(tab: TabDef) {
  const blob = new Blob([tab.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = tab.label.split("/").pop() || "untitled.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function parseGitHub(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?(\/|$)/i);
  if (!m) return null;
  return { owner: m[1], repo: m[2] };
}

export async function importRepoFromGitHub(url: string, onProgress?: (s: string) => void): Promise<TabDef[]> {
  const parsed = parseGitHub(url);
  if (!parsed) throw new Error("That doesn't look like a GitHub URL. Example: https://github.com/facebook/react");
  const { owner, repo } = parsed;
  onProgress?.("Fetching repo tree…");
  // 1. default branch
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!metaRes.ok) throw new Error("Repo not found or private (HTTP " + metaRes.status + ").");
  const meta = await metaRes.json();
  const branch = meta.default_branch || "main";
  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!treeRes.ok) throw new Error("Could not read file tree (HTTP " + treeRes.status + "). Rate-limited? Try again shortly.");
  const tree = await treeRes.json();
  const blobs = (tree.tree || []).filter((t: any) => t.type === "blob" && TEXT_EXT.test(t.path) && t.size < MAX_FILE_BYTES).slice(0, MAX_FILES);
  const out: TabDef[] = [];
  let i = 0;
  for (const b of blobs) {
    i++;
    onProgress?.(`Importing ${i}/${blobs.length} ${b.path}`);
    try {
      const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${b.path}`);
      if (!raw.ok) continue;
      const text = await raw.text();
      out.push({ id: uid("repo"), label: `${repo}/${b.path}`, language: langFromName(b.path), content: text.slice(0, 60000), dirty: false, path: `${repo}/${b.path}` });
    } catch { /* skip file */ }
  }
  if (!out.length) throw new Error("No importable text files found in that repo.");
  return out;
}

/** Tiny sandboxed JS runner: captures console.log, supports async, 3s timeout. */
export async function runJsPreview(code: string): Promise<{ ok: boolean; output: string }> {
  const logs: string[] = [];
  const fakeConsole = {
    log: (...a: any[]) => logs.push(a.map((x) => stringify(x)).join(" ")),
    info: (...a: any[]) => logs.push(a.map((x) => stringify(x)).join(" ")),
    warn: (...a: any[]) => logs.push("⚠ " + a.map((x) => stringify(x)).join(" ")),
    error: (...a: any[]) => logs.push("✖ " + a.map((x) => stringify(x)).join(" ")),
  };
  function stringify(x: any): string {
    try { return typeof x === "string" ? x : JSON.stringify(x, null, 2); }
    catch { return String(x); }
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, output: logs.join("\n") + "\n\n⏱ Timed out after 3s (infinite loop?)" }), 3000);
    try {
      const fn = new Function("console", `"use strict";\n(async () => {\n${code}\n})();`);
      Promise.resolve(fn(fakeConsole)).then(
        () => { clearTimeout(timer); resolve({ ok: true, output: logs.join("\n") || "(ran with no console output)" }); },
        (e: any) => { clearTimeout(timer); resolve({ ok: false, output: (logs.join("\n") ? logs.join("\n") + "\n\n" : "") + String(e?.stack || e) }); }
      );
    } catch (e: any) {
      clearTimeout(timer);
      resolve({ ok: false, output: String(e?.stack || e) });
    }
  });
}
