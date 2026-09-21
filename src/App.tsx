import { useEffect, useMemo, useRef, useState } from "react";
import MonacoEditor from "./components/MonacoEditor";
import FileExplorer from "./components/FileExplorer";
import EditorTabs from "./components/EditorTabs";
import AICommandPalette from "./components/AICommandPalette";
import SemanticSearchPanel from "./components/SemanticSearchPanel";
import AICodeActions from "./components/AICodeActions";
import DebugAssistant from "./components/DebugAssistant";
import AIChatSidebar from "./components/AIChatSidebar";
import AIAgentPanel from "./components/AIAgentPanel";
import AIApplyModal, { type ApplyPlan } from "./components/AIApplyModal";
import ProjectRefactorEngine from "./components/ProjectRefactorEngine";
import AIRefactorPanel from "./components/AIRefactorPanel";
import TitleBar from "./components/TitleBar";
import ActivityBar from "./components/ActivityBar";
import StatusBar from "./components/StatusBar";
import SettingsModal from "./components/SettingsModal";
import BottomDock from "./components/BottomDock";
import QuickOpen from "./components/QuickOpen";
import SearchPanel from "./components/SearchPanel";
import OutlinePanel from "./components/OutlinePanel";
import SourceControl from "./components/SourceControl";
import TasksPanel from "./components/TasksPanel";
import { runShell } from "./lib/runner";
import { readTextFile } from "@tauri-apps/plugin-fs";
import RepoModal from "./components/RepoModal";
import DebugConsole from "./components/DebugConsole";
import LlmSetupGuide from "./components/LlmSetupGuide";
import ShortcutsModal from "./components/ShortcutsModal";
import AboutModal from "./components/AboutModal";
import type { Problem } from "./components/ProblemsPanel";
import { langFromName, useTabs, useTheme, useToasts, STARTER_FILES } from "./store";
import type { Activity, DockTab, MenuAction, TabDef } from "./store";
import { describeParseFailure, planEdits, runAgentEdit, summarizePlan, type AiEdit, type EditPlanItem } from "./lib/aiEdits";
import { downloadTab, importRepoFromGitHub, openFilePicker, openFolderPicker, runJsPreview } from "./lib/fs";
import { autoDetectLLM, activateFreeCloud, checkLLM, useLLMCall } from "./lib/aiClient";
import { absPathFor, closeWorkspace, currentRoot, isDesktop, pickWorkspace, readWorkspaceTree, removeWorkspaceFile, writeWorkspaceFile } from "./lib/workspace";
import { ChevronRight, Columns2, Play, Save, X } from "lucide-react";

export default function App() {
  const tabsApi = useTabs();
  const { tabs, active, activeId: maybeActiveId, setActiveId } = tabsApi;
  const activeId = maybeActiveId ?? "";
  const { updateContent, close, save, saveAll, closeAll, openFiles, addFile, setTabs } = tabsApi;
  // Split-editor pane model: groups/focus/split come from the store.
  const { groups, focusedGroupId, focusGroup, splitRight, closeGroup } = tabsApi;
  const { theme, toggle } = useTheme();
  const { toasts, push, dismiss } = useToasts();
  const [activity, setActivity] = useState<Activity>("explorer");
  const [dock, setDock] = useState<DockTab>("terminal");
  const [palette, setPalette] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [repoBusy, setRepoBusy] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [settingsTab, setSettingsTab] = useState<"llm" | "editor" | "keys">("llm");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [llmGuideOpen, setLlmGuideOpen] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [editSignal, setEditSignal] = useState<{ n: number; cmd: string } | null>(null);
  const editCount = useRef(0);
  function fireEdit(cmd: string) {
    editCount.current += 1;
    setEditSignal({ n: editCount.current, cmd });
  }
  function openSettings(tab: "llm" | "editor" | "keys") {
    setSettingsTab(tab);
    setSettings(true);
  }
  const [problems, setProblems] = useState<Problem[]>([]);
  const [gotoLine, setGotoLine] = useState<number | null>(null);
  const [findSignal, setFindSignal] = useState(0);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [output, setOutput] = useState("");
  const toast = (title: string, body?: string) => push({ title, body, kind: "ok" });
  const toastErr = (title: string, body?: string) => push({ title, body, kind: "error" });
  const dirty = useMemo(() => tabs.some((t) => t.dirty), [tabs]);
  const { run: runAI } = useLLMCall();

  // ---- AI apply pipeline: model answer -> review dialog -> real file edits ----
  const [plan, setPlan] = useState<ApplyPlan | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [planApplied, setPlanApplied] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const undoRef = useRef<TabDef[] | null>(null);
  const undoDiskRef = useRef<{ created: string[]; modified: { abs: string; text: string }[] } | null>(null);

  /** Parse edits out of a model answer and open the review dialog. */
  function showPlan(reply: string, edits: AiEdit[], task = ""): EditPlanItem[] | null {
    const items = planEdits(edits, tabs);
    const usable = items.filter((i) => !i.error);
    if (!usable.length) {
      toastErr("Nothing to apply", items[0]?.error || describeParseFailure(reply));
      setDock("output");
      setOutput("AI returned changes that could not be applied:\n" + items.map((i) => "- " + i.label + " · " + (i.error || "")).join("\n"));
      return null;
    }
    setPlan({ items, reply, task, at: Date.now() });
    setPlanApplied(false);
    setPlanOpen(true);
    return usable;
  }

  /** Writes the chosen edits into the tabs — and through to disk when a workspace folder is open. */
  async function applyItems(items: EditPlanItem[]) {
    if (!items.length) return;
    undoRef.current = tabs.map((t) => ({ ...t }));
    const byId = new Map(items.filter((i) => i.tabId).map((i) => [i.tabId as string, i]));
    const stamp = Date.now();
    const rootNow = currentRoot();
    const created: TabDef[] = items.filter((i) => !i.tabId).map((i, n) => ({
      id: "ai-" + stamp + "-" + n, label: i.label, language: langFromName(i.label), content: i.after, dirty: true, path: i.label,
      absPath: rootNow ? absPathFor(i.label) : undefined,
    }));
    setTabs((ts) => {
      const next = ts.map((t) => { const it = byId.get(t.id); return it ? { ...t, content: it.after, dirty: true } : t; });
      created.forEach((c) => next.push(c));
      return next;
    });
    // Disk writes (workspace only). Files we fail to write stay dirty in the UI.
    const writes: { tabId: string | null; abs: string; text: string }[] = [];
    const modifiedDisk: { abs: string; text: string }[] = [];
    if (rootNow && isDesktop()) {
      for (const it of items) {
        const t = it.tabId ? tabs.find((x) => x.id === it.tabId) : undefined;
        const c = it.tabId ? undefined : created.find((x) => x.label === it.label);
        const abs = t?.absPath ?? c?.absPath;
        if (!abs) continue;
        writes.push({ tabId: it.tabId ?? c?.id ?? null, abs, text: it.after });
        if (t?.absPath) modifiedDisk.push({ abs, text: it.before });
      }
    }
    const writtenIds: string[] = [];
    const failed: string[] = [];
    for (const w of writes) {
      try { await writeWorkspaceFile(w.abs, w.text); if (w.tabId) writtenIds.push(w.tabId); }
      catch (e: any) { failed.push(w.abs + " — " + String(e?.message || e).slice(0, 120)); }
    }
    if (writtenIds.length) setTabs((ts) => ts.map((t) => (writtenIds.includes(t.id) ? { ...t, dirty: false } : t)));
    undoDiskRef.current = { created: writes.filter((w) => !w.tabId).map((w) => w.abs), modified: modifiedDisk };
    const stats = summarizePlan(items);
    const focus = created[0]?.id || items.find((i) => i.tabId)?.tabId;
    if (focus) setActiveId(focus);
    setPlanApplied(true);
    setDock("output");
    const onDisk = rootNow && isDesktop();
    const diskNote = onDisk ? (writes.length ? " · disk: " + (writes.length - failed.length) + "/" + writes.length + " written" : "") : " · in buffers (open a workspace folder to write to disk)";
    setOutput("AI applied " + stats.label + diskNote + "\n\n" + items.map((i) => (i.tabId ? "  ~ " : "  + ") + i.label + "  +" + i.added + " −" + i.removed).join("\n") + (failed.length ? "\n\nFAILED:\n" + failed.join("\n") : ""));
    toast("AI wrote " + stats.files + " file(s)", stats.label + (onDisk ? " — on disk" : " — in buffers only"));
  }

  async function undoApply() {
    const snap = undoRef.current;
    const disk = undoDiskRef.current;
    if (!snap && !disk) { toast("Nothing to undo"); return; }
    // Disk first: remove files the agent created, then restore previous bytes.
    if (disk && isDesktop()) {
      for (const abs of disk.created) { try { await removeWorkspaceFile(abs); } catch { /* already gone */ } }
      for (const m of disk.modified) {
        try { await writeWorkspaceFile(m.abs, m.text); }
        catch (e: any) { toastErr("Undo failed on disk", m.abs + " — " + String(e?.message || e).slice(0, 120)); }
      }
    }
    if (snap) {
      setTabs(snap);
      if (!snap.some((t) => t.id === activeId)) setActiveId(snap[0]?.id || activeId);
    }
    undoRef.current = null;
    undoDiskRef.current = null;
    setPlanApplied(false);
    setPlanOpen(false);
    toast("Reverted the AI change", disk && isDesktop() ? "Disk and buffers are back to how they were." : "The files are back to how they were.");
  }

  /** One-click agent run: the model edits the active file, then you review (or auto-apply). */
  async function runImplement(task: string, auto = false) {
    const ok = await ensureOnline();
    if (!ok) return;
    setAiBusy(true);
    setDock("output");
    setOutput("AI agent working on " + active.label + "…\n" + task);
    try {
      const { reply, edits } = await runAgentEdit(task, { file: active.label, code: active.content, files: tabs });
      setOutput(reply);
      if (!edits.length) { toastErr("No file edits returned", describeParseFailure(reply)); return; }
      const usable = showPlan(reply, edits, task);
      if (usable && auto) applyItems(usable);
    } catch (e: any) {
      toastErr("AI request failed", String(e?.message || e).slice(0, 200));
    } finally { setAiBusy(false); }
  }
  const pendingCount = plan && !planApplied ? plan.items.filter((i) => !i.error).length : 0;

  async function ensureOnline(): Promise<boolean> {
    const s = await checkLLM(true);
    if (s === "online") return true;
    if (s === "signin") { openSettings("llm"); toast("Almost online", "Press “Sign in to Puter” — free account, no API key."); return false; }
    const r = await activateFreeCloud();
    if (r.ok) { toast("LLM is online", r.provider + " → " + r.model); return true; }
    openSettings("llm");
    if (r.needsSignIn) toast("Almost online", "Press “Sign in to Puter” — free account, no API key.");
    else toastErr("LLM offline", r.detail);
    return false;
  }

  // First run: quietly look for a local server; otherwise point at the free cloud.
  useEffect(() => {
    let stop = false;
    (async () => {
      const s = await checkLLM(true);
      if (stop || s === "online") return;
      const found = await autoDetectLLM();
      if (stop) return;
      if (found) { toast("LLM auto-connected", found.provider + " → " + (found.models[0] || "")); return; }
      if (!localStorage.getItem("vs-ide-llm-onboarded")) {
        localStorage.setItem("vs-ide-llm-onboarded", "1");
        openSettings("llm");
        toast("Turn the AI on", "Pick “Free cloud · Puter” and press Sign in — free, no API key needed.");
      }
    })();
    return () => { stop = true; };
  }, []);

  async function doQuickRun() {
    setDock("output");
    setOutput("$ run " + active.label + "\nRunning…");
    const r = await runJsPreview(active.content);
    setOutput("$ run " + active.label + "\n\n" + (r.ok ? "" : "FAILED\n\n") + r.output);
    if (!r.ok) setDock("debug");
    toast(r.ok ? "Run finished" : "Run failed");
  }
  async function doAddFile() {
    try {
      const files = await openFilePicker();
      if (!files.length) { toast("No text files", "Picked files were skipped (binary/too large)."); return; }
      openFiles(files);
      setActivity("explorer");
      toast("Added " + files.length + " file(s)", files[0].label);
    } catch (e: any) { toastErr("Add file failed", String(e?.message || e)); }
  }
  /** Writes a tab to disk when it belongs to the workspace; false = buffer-only tab. */
  async function saveTabToDisk(tab: TabDef): Promise<boolean> {
    if (!tab.absPath || !isDesktop()) return false;
    try { await writeWorkspaceFile(tab.absPath, tab.content); return true; }
    catch (e: any) { toastErr("Save failed", tab.label + " — " + String(e?.message || e).slice(0, 160)); return false; }
  }
  async function doSaveActive() {
    save(activeId);
    if (await saveTabToDisk(active)) { toast("Saved to disk", active.label); return; }
    downloadTab(active);
    toast("Saved " + active.label);
  }
  async function doSaveAll() {
    const disk = tabs.filter((t) => t.absPath);
    let ok = 0;
    for (const t of disk) if (await saveTabToDisk(t)) ok++;
    saveAll();
    toast(disk.length ? "Saved " + ok + "/" + disk.length + " file(s) to disk" : "All files saved");
  }
  async function doAddFolder() {
    // Desktop: a real workspace folder (native dialog + fs scope) replaces the tab set.
    if (isDesktop()) {
      try {
        const root = await pickWorkspace();
        if (!root) return;
        setWorkspaceRoot(root);
        const files = await readWorkspaceTree();
        const stamp = Date.now();
        const next: TabDef[] = files.map((f, n) => ({ id: "disk-" + stamp + "-" + n, label: f.label, language: langFromName(f.label), content: f.content, dirty: false, path: f.path, absPath: f.absPath }));
        setTabs(next);
        if (next.length) setActiveId(next[0].id);
        setFolderName(root.split(/[\\/]/).filter(Boolean).pop() || root);
        setActivity("explorer");
        setDock("output");
        setOutput("Workspace: " + root + "\n" + files.length + " file(s) loaded.\nAI edits and Ctrl+S now write to disk inside this folder.");
        toast(files.length ? "Workspace open" : "Empty workspace", root + (files.length ? " · " + files.length + " file(s)" : " · no text files found"));
      } catch (e: any) { toastErr("Open folder failed", String(e?.message || e).slice(0, 200)); }
      return;
    }
    try {
      const { tabs: files, folder } = await openFolderPicker();
      if (!files.length) { toast("No text files", "Folder had no importable text files."); return; }
      setFolderName(folder);
      openFiles(files);
      setActivity("explorer");
      toast("Added folder: " + folder, files.length + " file(s)");
    } catch (e: any) { toastErr("Add folder failed", String(e?.message || e)); }
  }
  async function doCloseWorkspace() {
    await closeWorkspace();
    setWorkspaceRoot(null);
    setFolderName(null);
    setTabs([...STARTER_FILES]);
    setActiveId("app");
    setActivity("explorer");
    setDock("output");
    setOutput("Workspace closed.\nBack to in-memory mode — files are no longer saved to disk.");
    toast("Workspace closed", "Back to in-memory mode");
  }
  async function doImportRepo(url: string) {
    setRepoBusy(true);
    try {
      const files = await importRepoFromGitHub(url, (s) => setOutput(s));
      openFiles(files);
      setRepoOpen(false);
      setActivity("explorer");
      setDock("output");
      setOutput("Imported " + files.length + " file(s) from " + url);
      toast("Repo imported", files.length + " file(s)");
    } catch (e: any) {
      toastErr("Repo import failed", String(e?.message || e).slice(0, 220));
    } finally { setRepoBusy(false); }
  }
  /** Open a file by absolute path (Source Control hits, task errors, search). */
  async function openAbsFile(abs: string): Promise<void> {
    const norm = (p: string) => p.replace(/\\/g, "/").toLowerCase();
    const found = tabs.find((t) => t.absPath && norm(t.absPath) === norm(abs));
    if (found) { setActiveId(found.id); return; }
    if (!isDesktop()) return;
    try {
      const content = await readTextFile(abs);
      const label = abs.split(/[\\/]/).pop() || abs;
      const id = "disk-" + Date.now() + "-" + Math.floor(Math.random() * 1e5);
      setTabs((ts) => [...ts, { id, label, language: langFromName(label), content, dirty: false, path: label, absPath: abs }]);
      setActiveId(id);
    } catch (e: any) { toastErr("Open failed", abs + " — " + String(e?.message || e).slice(0, 160)); }
  }
  /** Jump to a task/search problem hit: match by label, relative path or abs-path suffix. */
  function openTaskHit(file: string, line: number) {
    const norm = (p: string) => p.replace(/\\/g, "/").toLowerCase();
    const nf = norm(file);
    const hit = tabs.find((t) =>
      norm(t.label) === nf ||
      norm(t.label).endsWith("/" + nf) ||
      (t.path && norm(t.path).endsWith("/" + nf)) ||
      (t.absPath && norm(t.absPath).endsWith("/" + nf)));
    if (hit) { setActiveId(hit.id); setGotoLine(line); return; }
    if (isDesktop() && workspaceRoot) {
      const abs = workspaceRoot.replace(/[\\/]+$/, "") + "/" + file.replace(/^\.?\//, "");
      void openAbsFile(abs).then(() => setGotoLine(line));
    }
  }
  /** Commit all current changes through the real git CLI (desktop + repo only). */
  async function doCommit(msg: string) {
    const safe = msg.replace(/"/g, "'");
    const r = await runShell(`git add -A && git commit -m "${safe}"`, 30000);
    setOutput((o) => o + "\n$ git commit — " + msg + "\n" + r.output);
    if (r.ok) toast("Committed", msg);
    else toastErr("Commit failed", r.output.slice(0, 220) || "Is this folder a git repository?");
  }
  function gotoLinePrompt() {
    const raw = window.prompt("Go to line:", String(cursor.line));
    const n = raw ? parseInt(raw, 10) : NaN;
    if (!isNaN(n) && n > 0) setGotoLine(n);
  }
  async function aiHelp(kind: "explain" | "fix" | "tests") {
    // "fix" and "tests" now really write the changes: you review the diff first.
    if (kind === "fix") return runImplement("Find and fix the bugs in this file. Keep the public behaviour intact and explain each fix in one line.");
    if (kind === "tests") return runImplement("Write a complete test file for this code as a new file next to it, covering the main path, boundaries and error cases.");
    const ok = await ensureOnline();
    if (!ok) return;
    setDock("output");
    setOutput("explain… asking " + active.label);
    const ans = await runAI("File: " + active.label + "\n```\n" + active.content.slice(0, 6000) + "\n```\nTask: Explain this file briefly with key functions.");
    setOutput("> explain " + active.label + "\n\n" + ans);
  }
  function onMenu(a: MenuAction) {
    if (a === "new-file") { addFile(); setActivity("explorer"); }
    else if (a === "open-file") doAddFile();
    else if (a === "open-folder") doAddFolder();
    else if (a === "open-repo") setRepoOpen(true);
    else if (a === "close-workspace") void doCloseWorkspace();
    else if (a === "save") doSaveActive();
    else if (a === "save-all") doSaveAll();
    else if (a === "close-tab") close(activeId);
    else if (a === "close-all") closeAll();
    else if (a === "palette") setPalette(true);
    else if (a === "goto-line") gotoLinePrompt();
    else if (a === "find") setFindSignal((n) => n + 1);
    else if (a === "toggle-theme") toggle();
    else if (a === "toggle-terminal") setDock("terminal");
    else if (a === "toggle-problems") setDock("problems");
    else if (a === "toggle-output") setDock("output");
    else if (a === "toggle-actions") setDock("actions");
    else if (a === "toggle-debug") setDock("debug");
    else if (a === "undo" || a === "redo" || a === "cut" || a === "copy" || a === "paste" || a === "select-all" || a === "format" || a === "comment" || a === "fold" || a === "unfold") fireEdit(a);
    else if (a === "wordwrap") { const next = !wordWrap; setWordWrap(next); toast("Word wrap " + (next ? "on" : "off")); }
    else if (a === "explain") aiHelp("explain");
    else if (a === "fix") aiHelp("fix");
    else if (a === "tests") aiHelp("tests");
    else if (a === "settings") openSettings("llm");
    else if (a === "shortcuts") setShortcutsOpen(true);
    else if (a === "about") setAboutOpen(true);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "k") { e.preventDefault(); setPalette(true); }
      else if (mod && k === "s") { e.preventDefault(); doSaveActive(); }
      else if (mod && k === "n") { e.preventDefault(); addFile(); }
      else if (mod && k === "o") { e.preventDefault(); doAddFile(); }
      else if (mod && k === "w") { e.preventDefault(); close(activeId); }
      else if (mod && k === "g") { e.preventDefault(); gotoLinePrompt(); }
      else if (mod && k === ",") { e.preventDefault(); openSettings("llm"); }
      else if (mod && e.shiftKey && k === "f") { e.preventDefault(); setActivity("search"); }
      else if (mod && k === "f") { e.preventDefault(); setFindSignal((n) => n + 1); }
      else if (mod && k === "p" && !e.shiftKey) { e.preventDefault(); setQuickOpen(true); }
      else if (mod && e.shiftKey && k === "p") { e.preventDefault(); setPalette(true); }
      else if (k === "f5") { e.preventDefault(); doQuickRun(); }
    };
    const onSave = () => { void doSaveActive(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("vs-ide:save", onSave as any);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("vs-ide:save", onSave as any); };
  });
  function onPaletteRun(cmd: string, res: string) {
    setOutput("> " + cmd + "\n\n" + res);
    if (cmd.startsWith("cmd:")) {
      const c = cmd.slice(4);
      if (c === "New file") addFile();
      if (c === "Add file…") doAddFile();
      if (c === "Add folder…") doAddFolder();
      if (c === "Add repo…") setRepoOpen(true);
      if (c === "Toggle theme") toggle();
      if (c === "Save file") doSaveActive();
      if (c === "Go to terminal") setDock("terminal");
      if (c === "Show problems") setDock("problems");
      if (c === "Run JS") doQuickRun();
      if (c === "Explain active file") aiHelp("explain");
      if (c === "Fix active file (writes changes)") aiHelp("fix");
      if (c === "Write tests (creates a file)") aiHelp("tests");
    } else { setDock("output"); }
  }
  // Split view: one pane per editor group; orphan tabs (not yet in a group) trail the focused pane.
  const splitPanes = useMemo(() => {
    const inAny = new Set(groups.flatMap((g) => g.tabIds));
    const orphans = tabs.filter((t) => !inAny.has(t.id));
    const byId = new Map(tabs.map((t) => [t.id, t]));
    return groups.map((g) => {
      const tabIds = g.id === focusedGroupId ? [...g.tabIds, ...orphans.map((o) => o.id)] : g.tabIds;
      return {
        id: g.id,
        activeId: g.activeId,
        tab: g.activeId ? byId.get(g.activeId) : undefined,
        tabs: tabIds.map((id) => byId.get(id)).filter((t): t is TabDef => !!t),
      };
    });
  }, [groups, tabs, focusedGroupId]);
  const leftPanel = activity === "chat"
    ? <AIChatSidebar code={active.content} file={active.label} onToast={toast} onPlan={showPlan} />
    : activity === "search"
    ? <SearchPanel
        currentFiles={tabs.map((t) => ({ label: t.label, content: t.content }))}
        onOpenHit={(label, abs) => {
          if (abs) void openAbsFile(abs);
          else { const t = tabs.find((x) => x.label === label); if (t) setActiveId(t.id); }
        }}
      />
    : activity === "source-control"
    ? <SourceControl open={activity === "source-control"} onOpenFile={(p) => void openAbsFile(p)} onCommit={doCommit} onToast={toast} />
    : activity === "outline"
    ? <OutlinePanel code={active.content} onGoto={(l) => setGotoLine(l)} />
    : activity === "tasks"
    ? <TasksPanel onToast={toast} onOutput={(s) => { setDock("output"); setOutput((o) => o + (o ? "\n" : "") + s); }} onGoto={(f, l) => openTaskHit(f, l)} />
    : activity === "refactor"
    ? <AIRefactorPanel code={active.content} onToast={toast} />
    : activity === "debug"
    ? <><DebugConsole code={active.content} onToast={toast} onLog={(s) => setOutput((o) => o + "\n" + s)} /><DebugAssistant code={active.content} logs={output} onToast={toast} /></>
    : activity === "project"
    ? <ProjectRefactorEngine files={tabs} />
    : <FileExplorer tabs={tabs} activeId={activeId} onOpen={setActiveId} onNew={() => addFile()} onAddFile={doAddFile} onAddFolder={doAddFolder} onAddRepo={() => setRepoOpen(true)} folderName={folderName} />;
  return (
    <div className="ambient-bg"><div className="ide-shell">
      <TitleBar onPalette={() => setPalette(true)} onSettings={() => openSettings("llm")} theme={theme} onTheme={toggle} dirty={dirty} onMenu={onMenu} dock={dock} wordWrap={wordWrap} />
      <div className="ide-body">
        <ActivityBar active={activity} onPick={setActivity} />
        <div className="ide-left">{leftPanel}</div>
        <div className="ide-center">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><EditorTabs tabs={tabs} activeId={activeId} onChange={setActiveId} onClose={close} /></div>
            <button className="btn btn-sm" onClick={splitRight} title="Split editor right"><Columns2 size={13} /></button>
            <button className="btn btn-sm btn-primary" onClick={doQuickRun} title="Run JS preview (sandboxed)"><Play size={13} /> Run</button>
            <button className="btn btn-sm" onClick={() => { void doSaveActive(); }} title="Save (writes to disk in a workspace)"><Save size={13} /> Save</button>
          </div>
          <div className="crumbs" style={{ padding: 0 }}>
            <span>{workspaceRoot || folderName || "src"}</span><ChevronRight size={12} /><b>{active.label}</b>
            <span className="badge" style={{ marginLeft: 6 }}>{active.language}</span>
            {active.dirty && <span className="badge badge-warn">unsaved</span>}
          </div>
          <div className="ide-main-row">
            <div className="ide-editor-col">
              {groups.length === 1 ? (
                <MonacoEditor value={active.content} language={active.language} fontSize={fontSize} wordWrap={wordWrap} onChange={(v) => updateContent(activeId, v)} onCursor={(l, c) => setCursor({ line: l, col: c })} onProblems={setProblems} gotoLine={gotoLine} onGotoDone={() => setGotoLine(null)} findSignal={findSignal} editSignal={editSignal} />
              ) : (
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {splitPanes.map((p) => (
                    <div key={p.id} onMouseDown={() => focusGroup(p.id)}
                      style={{ flex: 1, minHeight: 120, display: "flex", flexDirection: "column", minWidth: 0, padding: 4, borderRadius: 10, border: "1px solid " + (p.id === focusedGroupId ? "var(--gold, #e9c46a)" : "var(--border, rgba(255,255,255,0.12))") }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <EditorTabs tabs={p.tabs} activeId={p.activeId ?? ""} onChange={(id) => setActiveId(id, p.id)} onClose={(id) => close(id, p.id)} />
                        <button className="icon-btn" style={{ width: 22, height: 22, flexShrink: 0 }} title="Close this pane" onClick={() => closeGroup(p.id)}><X size={12} /></button>
                      </div>
                      {p.tab ? (
                        <MonacoEditor value={p.tab.content} language={p.tab.language} fontSize={fontSize} wordWrap={wordWrap} onChange={(v) => updateContent(p.tab!.id, v)} onCursor={p.id === focusedGroupId ? (l, c) => setCursor({ line: l, col: c }) : () => {}} onProblems={p.id === focusedGroupId ? setProblems : () => {}} gotoLine={p.id === focusedGroupId ? gotoLine : null} onGotoDone={() => setGotoLine(null)} findSignal={p.id === focusedGroupId ? findSignal : 0} editSignal={p.id === focusedGroupId ? editSignal : null} />
                      ) : (
                        <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--text-2)", fontSize: 12 }}>Open a file in this pane</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <BottomDock dock={dock} setDock={setDock} code={active.content} file={active.label} problems={problems} onGotoProblem={(l) => setGotoLine(l)} output={output} onToast={toast} onPlan={showPlan} />
            </div>
            <div className="ide-right">
              <AIChatSidebar code={active.content} file={active.label} onToast={toast} onPlan={showPlan} />
              <SemanticSearchPanel files={tabs} onOpen={setActiveId} />
              <AIRefactorPanel code={active.content} onToast={toast} />
              <DebugAssistant code={active.content} logs={output} onToast={toast} />
              <ProjectRefactorEngine files={tabs} />
              <div className="glass">
                <div className="panel-header">
                  <span>AI agent · writes the files for you</span>
                  <span className={"badge" + (planApplied ? " badge-ok" : pendingCount ? " badge-accent" : "")}>{planApplied ? "applied" : pendingCount ? pendingCount + " ready" : "idle"}</span>
                </div>
                <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <AIAgentPanel busy={aiBusy} onImplement={runImplement} pending={pendingCount} applied={planApplied} onReview={() => setPlanOpen(true)} onUndo={undoApply} />
                  <AICodeActions code={active.content} file={active.label} onPlan={showPlan} onApply={(c) => { updateContent(activeId, c); toast("Applied AI result"); }} onToast={toast} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StatusBar language={active.language} problems={problems.length} toasts={toasts} onDismiss={dismiss} onOpenProblems={() => setDock("problems")} onOpenSettings={() => openSettings("llm")} line={cursor.line} col={cursor.col} />
      <AICommandPalette open={palette} onClose={() => setPalette(false)} tabs={tabs} onOpenFile={setActiveId} onRun={onPaletteRun} onToast={toast} />
      <QuickOpen open={quickOpen} onClose={() => setQuickOpen(false)} tabs={tabs} onOpenFile={(id) => setActiveId(id)} />
      <SettingsModal open={settings} onClose={() => setSettings(false)} fontSize={fontSize} setFontSize={setFontSize} onToast={toast} initialTab={settingsTab} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <LlmSetupGuide open={llmGuideOpen} onClose={() => setLlmGuideOpen(false)} onDone={() => { setLlmGuideOpen(false); toast("LLM is online", "Ask anything in AI Chat."); }} />
      <RepoModal open={repoOpen} onClose={() => setRepoOpen(false)} onImport={doImportRepo} busy={repoBusy} />
      <AIApplyModal plan={planOpen ? plan : null} applied={planApplied} onClose={() => setPlanOpen(false)} onApply={applyItems} onUndo={undoApply} />
    </div></div>
  );
}






