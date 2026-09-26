import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import MonacoEditor from "./components/MonacoEditor";
import FileExplorer from "./components/FileExplorer";
import EditorTabs from "./components/EditorTabs";
import AICommandPalette from "./components/AICommandPalette";
import SemanticSearchPanel from "./components/SemanticSearchPanel";
import DebugAssistant from "./components/DebugAssistant";
import RightRail, { loadRail, saveRail, type RailSection, type RailState } from "./components/RightRail";
import AIChatSidebar from "./components/AIChatSidebar";
import AIAgentPanel from "./components/AIAgentPanel";
import AIApplyModal, { type ApplyPlan } from "./components/AIApplyModal";
import ProjectRefactorEngine from "./components/ProjectRefactorEngine";
import AIRefactorPanel from "./components/AIRefactorPanel";
import BuildPanel from "./components/BuildPanel";
import FusionPanel from "./components/FusionPanel";
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
import { readTextFile, rename } from "@tauri-apps/plugin-fs";
import RepoModal from "./components/RepoModal";
import DebugConsole from "./components/DebugConsole";
import LlmSetupGuide from "./components/LlmSetupGuide";
import ShortcutsModal from "./components/ShortcutsModal";
import AboutModal from "./components/AboutModal";
import SplashScreen from "./components/SplashScreen";
import ProjectHealth from "./components/ProjectHealth";
import AccountsModal from "./components/AccountsModal";
import { Breadcrumbs, GoToSymbol } from "./components/Breadcrumbs";
import ContextMenuHost, { showContextMenu } from "./lib/contextMenu";
import { useCmdBus } from "./lib/cmdBus";
import { commandForEvent } from "./lib/commands";
import { cleanupSummary, runCleanup, type CleanupReport } from "./lib/housekeeping";
import { providerOf, useAccounts } from "./lib/accounts";
import { forgetProject, getAutoResume, getHousekeeping, loadRecent, rememberProject, type RecentProject } from "./lib/recentProjects";
import type { Problem } from "./components/ProblemsPanel";
import { langFromName, useTabs, useTheme, useToasts, STARTER_FILES } from "./store";
import type { Activity, AgentMode, ApprovalMode, DockTab, MenuAction, TabDef } from "./store";
import { describeParseFailure, planEdits, runAgentEdit, summarizePlan, type AiEdit, type EditPlanItem } from "./lib/aiEdits";
import { downloadTab, importRepoFromGitHub, openFilePicker, openFolderPicker, runJsPreview } from "./lib/fs";
import { revealInFolder } from "./lib/runner";
import { autoDetectLLM, activateFreeCloud, checkLLM, getAgentMode, setAgentMode, useLLMCall } from "./lib/aiClient";
import { absPathFor, closeWorkspace, createProjectFolder, currentRoot, currentRoots, isDesktop, openWorkspaceAt, pickWorkspace, readWorkspaceTree, removeWorkspaceFile, removeWorkspaceRoot, writeWorkspaceFile } from "./lib/workspace";
import { Bug, Columns2, FolderKanban, Gauge, MessageSquare, Play, Save, Search, Sparkles, Target, Wand2, X } from "lucide-react";

// ---- tiny localStorage helpers for the persisted layout --------------------
const lsNum = (k: string, d: number) => { try { const v = Number(localStorage.getItem(k)); return Number.isFinite(v) && v > 0 ? v : d; } catch { return d; } };
const lsBool = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v === null ? d : v === "1"; } catch { return d; } };
const lsSet = (k: string, v: string | number | boolean) => { try { localStorage.setItem(k, String(v)); } catch { /* storage may be blocked */ } };

/** Commands that are executed by Monaco (via the editSignal prop), not by App. */
const EDIT_CMDS = new Set<MenuAction>([
  "undo", "redo", "cut", "copy", "paste", "find-replace", "find-next", "find-previous",
  "format", "comment", "comment-block", "duplicate-line", "delete-line",
  "move-line-up", "move-line-down", "indent", "outdent", "join-lines", "trim-whitespace",
  "sort-lines-up", "sort-lines-down", "transform-upper", "transform-lower",
  "select-all", "select-line", "expand-selection", "shrink-selection",
  "add-cursor-next", "add-cursor-below", "add-cursor-above", "fold", "unfold",
]);

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
  const [workspaceRoots, setWorkspaceRoots] = useState<string[]>([]);
  const [fontSize, setFontSize] = useState(() => { const v = Number(localStorage.getItem("vs-ide-font-size")); return Number.isFinite(v) && v >= 10 && v <= 40 ? v : 14; });
  const [settingsTab, setSettingsTab] = useState<"llm" | "editor" | "keys">("llm");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [llmGuideOpen, setLlmGuideOpen] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  // ---- Splash / project launcher + startup housekeeping -------------------
  const [splash, setSplash] = useState(false);
  const [recent, setRecent] = useState<RecentProject[]>(loadRecent);
  const [opening, setOpening] = useState(false);
  const [cleanup, setCleanup] = useState<CleanupReport | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [minimap, setMinimap] = useState(() => lsBool("vs-ide-minimap", true));
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  useEffect(() => { lsSet("vs-ide-minimap", minimap); }, [minimap]);
  // ---- Layout: resizable/toggleable side bars + bottom panel (persisted) ----
  const [leftW, setLeftW] = useState(() => lsNum("vs-ide-left-width", 292));
  const [leftVisible, setLeftVisible] = useState(() => lsBool("vs-ide-left-visible", true));
  const [dockH, setDockH] = useState(() => lsNum("vs-ide-dock-height", 220));
  const [dockVisible, setDockVisible] = useState(() => lsBool("vs-ide-dock-visible", true));
  const [zen, setZen] = useState(false);
  const [rail, setRail] = useState<RailState>(loadRail);
  const patchRail = (p: Partial<RailState>) => setRail((r) => { const n = { ...r, ...p }; saveRail(n); return n; });
  useEffect(() => { lsSet("vs-ide-left-width", leftW); }, [leftW]);
  useEffect(() => { lsSet("vs-ide-left-visible", leftVisible); }, [leftVisible]);
  useEffect(() => { lsSet("vs-ide-dock-height", dockH); }, [dockH]);
  useEffect(() => { lsSet("vs-ide-dock-visible", dockVisible); }, [dockVisible]);
  useEffect(() => { lsSet("vs-ide-font-size", fontSize); }, [fontSize]);
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

  // ---- Reopen closed tabs (Ctrl+Shift+T): remember what the user closes ----
  const closedRecent = useRef<TabDef[]>([]);
  function closeTab(id: string, gid?: string) {
    const t = tabs.find((x) => x.id === id);
    if (t) closedRecent.current = [t, ...closedRecent.current].slice(0, 20);
    close(id, gid);
  }
  function closeAllTabs() {
    const keep = tabs.find((t) => t.id === activeId);
    const gone = tabs.filter((t) => t.id !== keep?.id);
    if (gone.length) closedRecent.current = [...gone.reverse(), ...closedRecent.current].slice(0, 20);
    closeAll();
  }
  function reopenClosed() {
    const t = closedRecent.current.shift();
    if (!t) { toast("Nothing to reopen", "Tabs you close come back here — Ctrl+Shift+T."); return; }
    if (tabs.some((x) => x.id === t.id)) { setActiveId(t.id); return; }
    setTabs((ts) => [...ts, t]);
    setActiveId(t.id);
    toast("Reopened " + t.label, t.dirty ? "Unsaved changes restored too." : undefined);
  }

  // ---- Agent modes: Idea (plan only) / Think (read-only) / Do (acts) + script-run approval ----
  const [agentMode, setAgentModeUi] = useState<AgentMode>(() => getAgentMode());
  const [approvalMode, setApprovalModeUi] = useState<ApprovalMode>(() => {
    try { return (localStorage.getItem("vs-ide-approval") as ApprovalMode) || "each"; } catch { return "each"; }
  });
  // Reflect the mode on <html> so index.css can retheme (royal blue / royal purple / maroon).
  useEffect(() => { document.documentElement.setAttribute("data-mode", agentMode); }, [agentMode]);
  function changeAgentMode(m: AgentMode) {
    setAgentModeUi(m);
    setAgentMode(m); // sync the module copy read by callLLM (also persists to localStorage)
    toast(m === "idea" ? "Idea mode" : m === "think" ? "Think mode" : "Do mode",
      m === "idea" ? "Brainstorm and plan only — no code changes."
        : m === "think" ? "The AI analyses code — explains and suggests, but writes nothing."
        : "The AI can edit files and run commands (per your approval setting).");
  }
  function changeApprovalMode(m: ApprovalMode) {
    setApprovalModeUi(m);
    try { localStorage.setItem("vs-ide-approval", m); } catch { /* storage may be blocked */ }
  }

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
    if (agentMode !== "do") {
      toast(agentMode === "idea" ? "Idea mode" : "Think mode",
        agentMode === "idea"
          ? "Idea mode plans only — switch to Do (top toolbar) to let the AI write changes."
          : "Switch to Do mode (top toolbar) to let the AI write changes.");
      return;
    }
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
      if (usable && auto) {
        // Verification gate: never write before the pre-save checks run in the dialog.
        toast("Review & verify", "The diff is open — Apply unlocks once pre-save verification passes.");
      }
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

  // ---- Startup: project launcher, then housekeeping ------------------------
  // The launcher is the first thing the user sees unless they asked us to go
  // straight into their last project. In a plain browser (npm run dev without
  // Tauri) there is no project to pick, so we skip it.
  useEffect(() => {
    if (!isDesktop()) return;
    const last = loadRecent()[0]?.path;
    if (getAutoResume() && last) { void openProjectAt(last); return; }
    setSplash(true);
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
  /** Load the (already granted) workspace roots into tabs. Shared by the folder
   *  picker, the launcher's "continue / open recent" and a freshly created project. */
  async function loadWorkspaceIntoTabs(root: string, added: boolean) {
    const rootsNow = currentRoots();
    setWorkspaceRoots(rootsNow);
    const files = await readWorkspaceTree();
    const stamp = Date.now();
    const next: TabDef[] = files.map((f, n) => ({ id: "disk-" + stamp + "-" + n, label: f.label, language: langFromName(f.label), content: f.content, dirty: false, path: f.path, absPath: f.absPath }));
    setTabs(next);
    if (next.length) setActiveId(next[0].id);
    setFolderName(root.split(/[\\/]/).filter(Boolean).pop() || root);
    setActivity("explorer");
    setDock("output");
    setOutput(
      (added ? "Workspace folder added: " + root + "\n" : "Workspace: " + root + "\n") +
      rootsNow.length + " folder(s) open: " + rootsNow.join(" + ") + "\n" +
      files.length + " file(s) loaded.\nAI edits and Ctrl+S now write to disk inside these folders."
    );
    toast(
      added ? "Folder added to workspace" : (files.length ? "Workspace open" : "Empty workspace"),
      root + (files.length ? " · " + files.length + " file(s)" : " · no text files found") + (rootsNow.length > 1 ? " · " + rootsNow.length + " roots" : "")
    );
  }

  /** Housekeeping for a folder (safe to call repeatedly; it is a no-op when the
   *  user turned it off or we are not in the desktop app). */
  async function maybeClean(root?: string | null, opts: { manual?: boolean; dryRun?: boolean } = {}) {
    const target = root || currentRoot();
    if (!opts.manual && !getHousekeeping()) return;
    if (!isDesktop()) { if (opts.manual) toastErr("Housekeeping needs the desktop app"); return; }
    if (!target) { if (opts.manual) toastErr("No project open", "Open a folder first, then run housekeeping."); return; }
    setCleaning(true);
    // Automatic runs stay in "quick" mode (warm caches survive); a manual run
    // from the menu is a full sweep, and the preview is a full sweep that
    // deletes nothing.
    const report = await runCleanup({ target, quick: !opts.manual, dryRun: opts.dryRun });
    setCleaning(false);
    setCleanup(report);
    const summary = cleanupSummary(report);
    if (opts.manual) {
      (report?.freed_bytes || report?.notes.length ? toast : toastErr)(summary, target);
    } else if (report?.freed_bytes) {
      toast("Housekeeping", summary);
    }
  }

  /** Open a project the launcher knows about (recent list, "continue", a
   *  folder we just created). Replaces the workspace and remembers it. */
  async function openProjectAt(path: string) {
    setOpening(true);
    try {
      const root = await openWorkspaceAt(path);
      if (!root) { setSplash(false); return; }
      setRecent(rememberProject(root));
      await loadWorkspaceIntoTabs(root, false);
      setSplash(false);
      void maybeClean(root);
    } catch (e: any) {
      toastErr("Could not open that folder", String(e?.message || e).slice(0, 200));
    } finally {
      setOpening(false);
    }
  }

  /** "New Project…" in the launcher: create the folder, then open it. */
  async function createAndOpen(parent: string, name: string, template: string) {
    setOpening(true);
    try {
      const created = await createProjectFolder(parent, name, template);
      await openProjectAt(created);
      toast("Project created", created);
    } catch (e: any) {
      toastErr("Could not create the project", String(e?.message || e).slice(0, 200));
    } finally {
      setOpening(false);
    }
  }

  /** Native folder picker for the launcher's parent-folder field. */
  async function pickParentFolder(): Promise<string | null> {
    try {
      const root = await pickWorkspace();
      if (root) rememberProject(root);
      return root;
    } catch {
      return null;
    }
  }

  async function doAddFolder() {
    // Desktop: a real workspace folder (native dialog + fs scope). The first
    // pick opens the workspace; later picks ADD another root so two projects
    // can be edited side by side (multi-root workspace).
    if (isDesktop()) {
      try {
        const hadRoots = workspaceRoots.length > 0;
        const root = await pickWorkspace();
        if (!root) return;
        setRecent(rememberProject(root));
        await loadWorkspaceIntoTabs(root, hadRoots);
        void maybeClean(root);
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
    const gone = currentRoots();
    await closeWorkspace();
    // Drop the closed project(s) from the launcher's recent list.
    for (const p of gone) forgetProject(p);
    setRecent(loadRecent());
    setWorkspaceRoots([]);
    setFolderName(null);
    setTabs([...STARTER_FILES]);
    setActiveId("app");
    setActivity("explorer");
    setDock("output");
    setOutput("Workspace closed.\nBack to in-memory mode — files are no longer saved to disk.");
    toast("Workspace closed", "Back to in-memory mode");
  }
  /** Explorer ✕ — close ONE folder while keeping the other root(s) open. */
  async function doRemoveRoot(path: string) {
    const next = await removeWorkspaceRoot(path);
    setWorkspaceRoots(next);
    const nr = path.replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "") + "/";
    const keep = tabs.filter((t) => !(t.absPath && t.absPath.replace(/\\/g, "/").toLowerCase().startsWith(nr)));
    if (!keep.length) { setTabs([...STARTER_FILES]); setActiveId("app"); }
    else {
      setTabs(keep);
      if (!keep.some((t) => t.id === activeId)) setActiveId(keep[0].id);
    }
    if (!next.length) setFolderName(null);
    const name = path.split(/[\\/]/).filter(Boolean).pop() || path;
    toast("Folder closed", name + (next.length ? " — " + next.length + " folder(s) remain" : " — workspace empty"));
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
      (t.absPath && (norm(t.absPath) === nf || norm(t.absPath).endsWith("/" + nf))));
    if (hit) { setActiveId(hit.id); setGotoLine(line); return; }
    // Absolute hit (multi-root tasks join their own root) → open it directly.
    if (/^[a-z]:[\\/]|^\//i.test(file)) {
      if (isDesktop()) void openAbsFile(file).then(() => setGotoLine(line));
      return;
    }
    // Relative path: probe EVERY open root until the file is found (multi-root).
    if (isDesktop() && workspaceRoots.length) {
      const rel = file.replace(/^\.?\//, "");
      void (async () => {
        for (const r of workspaceRoots) {
          const abs = r.replace(/[\\/]+$/, "") + "/" + rel;
          try { await readTextFile(abs); await openAbsFile(abs); setGotoLine(line); return; }
          catch { /* try the next root */ }
        }
        toastErr("Open failed", file + " — not found in any open folder.");
      })();
    }
  }
  function gotoLinePrompt() {
    const raw = window.prompt("Go to line:", String(cursor.line));
    const n = raw ? parseInt(raw, 10) : NaN;
    if (!isNaN(n) && n > 0) setGotoLine(n);
  }
  // ---- Selection-aware features (right-click "Ask AI about selection") -----
  const [selection, setSelection] = useState("");
  /** Prompt text for the AI, with the current selection appended when there is one. */
  function promptWithSelection(base: string): string {
    return selection.trim() ? base + "\n\nSelected code:\n```\n" + selection.slice(0, 4000) + "\n```" : base;
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
  /** Zen mode: hide every side bar + the bottom panel for a distraction-free editor. */
  function toggleZen() {
    const next = !zen;
    setZen(next);
    toast(next ? "Zen Mode" : "Zen Mode off",
      next ? "Side bars and the bottom panel are hidden — press F11 to exit." : "Layout restored.");
  }
  /** Drag the vertical splitters between the side bars and the editor. */
  function startSplitDrag(e: ReactPointerEvent, side: "left" | "right") {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === "left" ? leftW : rail.width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (side === "left") setLeftW(Math.min(520, Math.max(200, startW + dx)));
      else patchRail({ width: Math.min(560, Math.max(260, startW - dx)) });
    };
    const up = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  /** Drag the handle above the bottom panel to resize it. */
  function startDockDrag(e: ReactPointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = dockH;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      const cap = Math.max(200, window.innerHeight - 320);
      setDockH(Math.min(cap, Math.max(120, startH - (ev.clientY - startY))));
    };
    const up = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  // ---- Small helpers used by the menus and the right-click menus -----------
  /** Run a raw Monaco action through the editor signal ("monaco:<actionId>"). */
  function fireEditorCommand(action: string) { fireEdit("monaco:" + action); }
  function fireEditQuickFix() { fireEditorCommand("editor.action.quickFix"); }

  function closeOtherTabs() {
    const keep = tabs.find((t) => t.id === activeId);
    if (!keep) return;
    const gone = tabs.filter((t) => t.id !== keep.id);
    if (gone.length) closedRecent.current = [...gone.reverse(), ...closedRecent.current].slice(0, 20);
    setTabs([keep]);
    toast("Closed " + gone.length + " tab(s)", "Ctrl+Shift+T reopens the last one.");
  }

  async function copyPath() {
    const path = active.absPath || active.label;
    try {
      await navigator.clipboard.writeText(path);
      toast("Path copied", path);
    } catch {
      toastErr("Could not copy the path", path);
    }
  }

  async function doReveal() {
    const path = active.absPath || currentRoot();
    if (!path) { toastErr("Nothing to reveal", "Open a project folder first."); return; }
    if (await revealInFolder(path)) toast("Shown in File Explorer", path);
    else toastErr("Could not open File Explorer", "This needs the desktop app on Windows.");
  }

  /** Explorer right-click → Rename (renames on disk too when it is a real file). */
  async function doRenameFile(t: TabDef) {
    const current = t.label.split("/").pop() || t.label;
    const next = (window.prompt("Rename to:", current) || "").trim();
    if (!next || next === current) return;
    if (/[\\/:*?"<>|]/.test(next)) { toastErr("Bad file name", "Use letters, numbers, spaces, - and _ only."); return; }
    const label = t.label.replace(/[^/]+$/, next);
    if (!t.absPath) { setTabs((ts) => ts.map((x) => (x.id === t.id ? { ...x, label, path: label } : x))); toast("Renamed", label); return; }
    try {
      const dest = t.absPath.replace(/[^/\\]+$/, next);
      await rename(t.absPath, dest);
      setTabs((ts) => ts.map((x) => (x.id === t.id ? { ...x, label, path: label, absPath: dest } : x)));
      toast("Renamed", label);
    } catch (e: any) { toastErr("Rename failed", String(e?.message || e).slice(0, 160)); }
  }

  /** Explorer right-click → Delete (removes the file on disk and the tab). */
  async function doDeleteFile(t: TabDef) {
    if (!window.confirm("Delete " + t.label + "?" + (t.absPath ? "\n\nThis removes it from disk." : ""))) return;
    try {
      if (t.absPath) await removeWorkspaceFile(t.absPath);
      setTabs((ts) => ts.filter((x) => x.id !== t.id));
      toast("Deleted", t.label);
    } catch (e: any) { toastErr("Delete failed", String(e?.message || e).slice(0, 160)); }
  }

  /** Ask the AI about whatever is selected in the editor (output → panel). */
  async function aiOnSelection(question: string) {
    if (!selection.trim()) { toastErr("Nothing selected", "Select some code first, then right-click it."); return; }
    const ok = await ensureOnline();
    if (!ok) return;
    setDock("output");
    setOutput("selection → " + active.label + "\n\n" + question);
    const ans = await runAI(promptWithSelection(question));
    setOutput("selection → " + active.label + "\n\n" + question + "\n\n" + ans);
  }

  /** File → New Folder…: create the folder inside the open workspace root. */
  async function doNewFolder() {
    if (!isDesktop() || !currentRoot()) { toastErr("Open a folder first", "New Folder works inside an open workspace."); return; }
    const raw = window.prompt("New folder name:", "src");
    const name = (raw || "").trim();
    if (!name) return;
    if (/[\\/:*?"<>|]/.test(name)) { toastErr("Bad folder name", "Use letters, numbers, spaces, - and _ only."); return; }
    try {
      const abs = absPathFor(name);
      await writeWorkspaceFile(abs.endsWith("/") ? abs + ".gitkeep" : abs + "/.gitkeep", "");
      toast("Folder created", abs);
    } catch (e: any) { toastErr("Could not create the folder", String(e?.message || e).slice(0, 160)); }
  }

  /** Right-click menu for the editor surface: everything here is an app
   *  command, so the same keys and labels as the menu bar apply. */
  function editorContextMenu(e: ReactMouseEvent) {
    showContextMenu(e, [
      { label: "Cut", command: "cut" },
      { label: "Copy", command: "copy" },
      { label: "Paste", command: "paste" },
      { sep: true },
      { label: "Copy Full Path", command: "copy-path" },
      { label: "Reveal in File Explorer", command: "reveal-file" },
      { sep: true },
      { label: "Go to Line…", command: "goto-line" },
      { label: "Find in File", command: "find" },
      { label: "Replace in File", command: "find-replace" },
      { label: "Format Document", command: "format" },
      { label: "Toggle Line Comment", command: "comment" },
      { sep: true },
      { label: "Quick Fix…", hint: "Ctrl+.", run: () => fireEditQuickFix() },
      { label: "Rename Symbol", run: () => fireEditorCommand("editor.action.rename") },
      { label: "Go to Definition", run: () => fireEditorCommand("editor.action.revealDefinition") },
      { label: "Format Selection", run: () => fireEditorCommand("editor.action.formatSelection") },
      { sep: true },
      { label: "Explain File (AI)", command: "explain" },
      { label: "Fix File (AI)", command: "fix" },
      { label: "Write Tests (AI)", command: "tests" },
      { label: "Explain Selection (AI)", disabled: !selection.trim(), run: () => void aiOnSelection("Explain the selected code. What does it do, and is it correct?") },
      { label: "Review Selection (AI)", disabled: !selection.trim(), run: () => void aiOnSelection("Review the selected code for bugs, edge cases and readability. Be concrete.") },
      { label: "Document Selection (AI)", disabled: !selection.trim(), run: () => void aiOnSelection("Write a short doc comment for the selected code. Return only the comment.") },
      { sep: true },
      { label: "Split Editor Right", command: "split-right" },
      { label: "Save", command: "save" },
      { label: "Close Tab", command: "close-tab" },
    ], active.label);
  }

  function onMenu(a: MenuAction) {
    if (a === "new-file") { addFile(); setActivity("explorer"); }
    else if (a === "new-folder") doNewFolder();
    else if (a === "open-file") doAddFile();
    else if (a === "open-folder") doAddFolder();
    else if (a === "open-repo") setRepoOpen(true);
    else if (a === "close-workspace") void doCloseWorkspace();
    else if (a === "fusion") setActivity("fusion");
    else if (a === "splash") setSplash(true);
    else if (a === "save") doSaveActive();
    else if (a === "save-all") doSaveAll();
    else if (a === "close-tab") closeTab(activeId);
    else if (a === "close-others") closeOtherTabs();
    else if (a === "close-all") closeAllTabs();
    else if (a === "reopen-tab") reopenClosed();
    else if (a === "copy-path") void copyPath();
    else if (a === "reveal-file") void doReveal();
    else if (a === "palette") setPalette(true);
    else if (a === "quick-open") setQuickOpen(true);
    else if (a === "goto-symbol") setSymbolOpen((v) => !v);
    else if (a === "goto-line") gotoLinePrompt();
    else if (a === "find") setFindSignal((n) => n + 1);
    else if (a === "run-file") doQuickRun();
    else if (a === "toggle-theme") toggle();
    else if (a === "toggle-minimap") { const next = !minimap; setMinimap(next); toast("Minimap " + (next ? "on" : "off")); }
    else if (a === "toggle-line-numbers") fireEditorCommand("editor.action.toggleLineNumbers");
    else if (a === "split-right") splitRight();
    else if (a === "close-group") closeGroup(focusedGroupId);
    else if (a === "toggle-terminal") setDock("terminal");
    else if (a === "toggle-problems") setDock("problems");
    else if (a === "toggle-output") setDock("output");
    else if (a === "toggle-actions") setDock("actions");
    else if (a === "toggle-debug") setDock("debug");
    else if (EDIT_CMDS.has(a)) fireEdit(a);
    else if (a === "wordwrap") { const next = !wordWrap; setWordWrap(next); toast("Word wrap " + (next ? "on" : "off")); }
    else if (a === "toggle-sidebar") setLeftVisible((v) => !v);
    else if (a === "toggle-rightbar") patchRail({ visible: !rail.visible });
    else if (a === "toggle-dock") setDockVisible((v) => !v);
    else if (a === "zen") toggleZen();
    else if (a === "zoom-in") setFontSize((f) => Math.min(32, f + 1));
    else if (a === "zoom-out") setFontSize((f) => Math.max(10, f - 1));
    else if (a === "zoom-reset") setFontSize(14);
    else if (a === "explain") aiHelp("explain");
    else if (a === "fix") aiHelp("fix");
    else if (a === "tests") aiHelp("tests");
    else if (a === "run-cleanup") void maybeClean(null, { manual: true });
    else if (a === "clean-preview") void maybeClean(null, { manual: true, dryRun: true });
    else if (a === "settings") openSettings("llm");
    else if (a === "accounts") setAccountsOpen(true);
    else if (a === "shortcuts") setShortcutsOpen(true);
    else if (a === "about") setAboutOpen(true);
    else if (a.startsWith("activity-")) {
      setActivity(a.slice(9) as Activity);
      if (!leftVisible) setLeftVisible(true);
    }
  }

  // ---- Global keyboard: everything comes from the command registry, so a
  // ---- rebound shortcut in Keyboard Shortcuts… takes effect immediately. ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = commandForEvent(e);
      if (!cmd) return;
      // Inside a Monaco editor the editor itself owns the editing commands -
      // running them here too would apply every shortcut twice.
      const inEditor = !!(e.target as HTMLElement | null)?.closest?.(".monaco-editor");
      if (inEditor && EDIT_CMDS.has(cmd)) return;
      e.preventDefault();
      onMenu(cmd);
    };
    const onSave = () => { void doSaveActive(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("vs-ide:save", onSave as any);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("vs-ide:save", onSave as any); };
  });
  // ---- Signed-in account (title-bar chip + Accounts sheet) ---------------
  const accounts = useAccounts();
  const primaryAccount = useMemo(() => {
    const a = accounts[accounts.length - 1];
    return a
      ? { name: a.name, email: a.email, avatar: a.avatar, label: providerOf(a.provider).label }
      : null;
  }, [accounts]);

  // Right-click menus in the panels dispatch through the bus; route them
  // through the same dispatcher the menu bar and the keyboard use.
  useCmdBus((id) => onMenu(id));

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
  const leftPanel = activity === "search"
    ? <SearchPanel
        currentFiles={tabs.map((t) => ({ label: t.label, content: t.content }))}
        onOpenHit={(label, abs) => {
          if (abs) void openAbsFile(abs);
          else { const t = tabs.find((x) => x.label === label); if (t) setActiveId(t.id); }
        }}
      />
    : activity === "source-control"
    ? <SourceControl open={activity === "source-control"} roots={workspaceRoots} onOpenFile={(p) => void openAbsFile(p)} onToast={toast} />
    : activity === "outline"
    ? <OutlinePanel code={active.content} onGoto={(l) => setGotoLine(l)} />
    : activity === "tasks"
    ? <TasksPanel onToast={toast} onOutput={(s) => { setDock("output"); setOutput((o) => o + (o ? "\n" : "") + s); }} onGoto={(f, l) => openTaskHit(f, l)} />
    : activity === "build"
    ? <BuildPanel tabs={tabs} agentMode={agentMode} onToast={toast} onPlan={showPlan} ensureOnline={ensureOnline} />
    : activity === "fusion"
    ? <FusionPanel roots={workspaceRoots} tabs={tabs} agentMode={agentMode} onToast={toast} onPlan={showPlan} ensureOnline={ensureOnline} onAddRoot={() => void doAddFolder()} />
    : <FileExplorer tabs={tabs} activeId={activeId} onOpen={setActiveId} onNew={() => addFile()} onNewFolder={doNewFolder} onDelete={doDeleteFile} onRename={doRenameFile} onAddFile={doAddFile} onAddFolder={doAddFolder} onAddRepo={() => setRepoOpen(true)} onClean={() => void maybeClean(null, { manual: true })} folderName={folderName} roots={workspaceRoots} onRemoveRoot={(p) => void doRemoveRoot(p)} />;
  // ---- AI side bar (right rail): one collapsible + removable card per tool ----
  const railSections: RailSection[] = [
    { id: "chat", label: "AI Chat", icon: MessageSquare, node: <AIChatSidebar code={active.content} file={active.label} tabs={tabs} onToast={toast} onPlan={showPlan} agentMode={agentMode} approvalMode={approvalMode} onApprovalMode={changeApprovalMode} embedded /> },
    { id: "search", label: "Semantic search", icon: Search, node: <SemanticSearchPanel files={tabs} onOpen={setActiveId} embedded /> },
    { id: "refactor", label: "Refactor", icon: Wand2, node: <AIRefactorPanel code={active.content} onToast={toast} embedded /> },
    { id: "debug", label: "Debug", icon: Bug, node: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <DebugConsole code={active.content} onToast={toast} onLog={(s) => setOutput((o) => o + "\n" + s)} embedded />
          <DebugAssistant code={active.content} logs={output} onToast={toast} embedded />
        </div>
      ) },
    { id: "project", label: "Project refactor", icon: FolderKanban, node: <ProjectRefactorEngine files={tabs} /> },
    { id: "health", label: "Project health", icon: Gauge, node: (
        <ProjectHealth
          root={currentRoot()}
          cleanup={cleanup}
          cleaning={cleaning}
          onClean={() => void maybeClean(null, { manual: true })}
          onPreview={() => void maybeClean(null, { manual: true, dryRun: true })}
          onToast={toast}
        />
      ) },
    { id: "agent", label: "AI agent", icon: Sparkles,
      badge: <span className={"badge" + (planApplied ? " badge-ok" : pendingCount ? " badge-accent" : "")}>{planApplied ? "applied" : pendingCount ? pendingCount + " ready" : "idle"}</span>,
      node: <AIAgentPanel busy={aiBusy} onImplement={runImplement} pending={pendingCount} applied={planApplied} onReview={() => setPlanOpen(true)} onUndo={undoApply} mode={agentMode} /> },
  ];

  return (
    <div className="ambient-bg"><div className="ide-shell">
      <TitleBar onPalette={() => setPalette(true)} onSettings={() => openSettings("llm")} theme={theme} onTheme={toggle} dirty={dirty} onMenu={onMenu} dock={dock} wordWrap={wordWrap} mode={agentMode} onMode={changeAgentMode} leftVisible={leftVisible} rightVisible={rail.visible} dockVisible={dockVisible} zen={zen} minimap={minimap} account={primaryAccount} onAccounts={() => setAccountsOpen(true)} />
      <div className="ide-body">
        {!zen && <ActivityBar active={activity} onPick={setActivity} />}
        {!zen && leftVisible && <div className="ide-left" style={{ width: leftW }}>{leftPanel}</div>}
        {!zen && leftVisible && <div className="splitter-v splitter-left" onPointerDown={(e) => startSplitDrag(e, "left")} />}
        <div className="ide-center">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><EditorTabs tabs={tabs} activeId={activeId} onChange={setActiveId} onClose={closeTab} /></div>
            <button className="btn btn-sm" onClick={splitRight} title="Split editor right"><Columns2 size={13} /></button>
            <button className="btn btn-sm" onClick={() => setSymbolOpen(true)} title="Go to symbol (Ctrl+Shift+O)"><Target size={13} /></button>
            <button className="btn btn-sm btn-primary" onClick={doQuickRun} title="Run JS preview (sandboxed)"><Play size={13} /> Run</button>
            <button className="btn btn-sm" onClick={() => { void doSaveActive(); }} title="Save (writes to disk in a workspace)"><Save size={13} /> Save</button>
          </div>
          <Breadcrumbs
            root={workspaceRoots.length > 1 ? workspaceRoots.map((r) => r.split(/[\\/]/).filter(Boolean).pop()).join(" + ") : workspaceRoots[0] || folderName}
            label={active.label}
            code={active.content}
            language={active.language}
            line={cursor.line}
            dirty={active.dirty}
            onGoto={(l) => setGotoLine(l)}
            onReveal={() => void doReveal()}
            onGotoSymbol={() => setSymbolOpen(true)}
          />
          <div className="ide-main-row">
            <div className="ide-editor-col">
              {groups.length === 1 ? (
                <MonacoEditor value={active.content} language={active.language} fontSize={fontSize} wordWrap={wordWrap} mode={agentMode} minimap={minimap} onContextMenu={editorContextMenu} onSelection={setSelection} onChange={(v) => updateContent(activeId, v)} onCursor={(l, c) => setCursor({ line: l, col: c })} onProblems={setProblems} gotoLine={gotoLine} onGotoDone={() => setGotoLine(null)} findSignal={findSignal} editSignal={editSignal} />
              ) : (
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {splitPanes.map((p) => (
                    <div key={p.id} onMouseDown={() => focusGroup(p.id)}
                      style={{ flex: 1, minHeight: 120, display: "flex", flexDirection: "column", minWidth: 0, padding: 4, borderRadius: 10, border: "1px solid " + (p.id === focusedGroupId ? "var(--gold, #e9c46a)" : "var(--border, rgba(255,255,255,0.12))") }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <EditorTabs tabs={p.tabs} activeId={p.activeId ?? ""} onChange={(id) => setActiveId(id, p.id)} onClose={(id) => closeTab(id, p.id)} />
                        <button className="icon-btn" style={{ width: 22, height: 22, flexShrink: 0 }} title="Close this pane" onClick={() => closeGroup(p.id)}><X size={12} /></button>
                      </div>
                      {p.tab ? (
                        <MonacoEditor value={p.tab.content} language={p.tab.language} fontSize={fontSize} wordWrap={wordWrap} mode={agentMode} minimap={minimap} onContextMenu={editorContextMenu} onChange={(v) => updateContent(p.tab!.id, v)} onCursor={p.id === focusedGroupId ? (l, c) => setCursor({ line: l, col: c }) : () => {}} onProblems={p.id === focusedGroupId ? setProblems : () => {}} gotoLine={p.id === focusedGroupId ? gotoLine : null} onGotoDone={() => setGotoLine(null)} findSignal={p.id === focusedGroupId ? findSignal : 0} editSignal={p.id === focusedGroupId ? editSignal : null} />
                      ) : (
                        <div style={{ flex: 1, display: "grid", placeItems: "center", color: "var(--text-2)", fontSize: 12 }}>Open a file in this pane</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!zen && dockVisible && (
                <>
                  <div className="splitter-h" onPointerDown={startDockDrag} title="Drag to resize the bottom panel" />
                  <BottomDock height={dockH} dock={dock} setDock={setDock} code={active.content} file={active.label} problems={problems} onGotoProblem={(l) => setGotoLine(l)} output={output} onClearOutput={() => setOutput("")} onToast={toast} onPlan={showPlan} />
                </>
              )}
            </div>
            {!zen && rail.visible && (
              <div className="splitter-v splitter-right" onPointerDown={(e) => startSplitDrag(e, "right")} />
            )}
            {!zen && rail.visible && (
              <RightRail state={rail} sections={railSections} onChange={patchRail}
                onHide={() => { patchRail({ visible: false }); toast("AI side bar hidden", "Press Ctrl+Alt+B (or View → AI Side Bar) to bring it back."); }} />
            )}
          </div>
        </div>
      </div>
      <StatusBar language={active.language} problems={problems.length} toasts={toasts} onDismiss={dismiss} onOpenProblems={() => setDock("problems")} onOpenSettings={() => openSettings("llm")} line={cursor.line} col={cursor.col} />
      <ContextMenuHost />
      {splash && (
      <SplashScreen
        recent={recent}
        desktop={isDesktop()}
        busy={opening || cleaning}
        status={cleaning ? "Cleaning up build junk…" : undefined}
        cleanupReport={cleanup}
        onOpen={(p) => void openProjectAt(p)}
        onBrowse={() => { setSplash(false); void doAddFolder(); }}
        onCreate={(parent, name, tpl) => void createAndOpen(parent, name, tpl)}
        onPickParent={pickParentFolder}
        onSkip={() => setSplash(false)}
        onForget={(p) => setRecent(forgetProject(p))}
        onCleanupNow={() => void maybeClean(null, { manual: true })}
      />)}
      <AICommandPalette open={palette} onClose={() => setPalette(false)} tabs={tabs} onOpenFile={setActiveId}
        onCommand={(id) => onMenu(id)} onRun={onPaletteRun} onToast={toast} />
      <QuickOpen open={quickOpen} onClose={() => setQuickOpen(false)} tabs={tabs} onOpenFile={(id) => setActiveId(id)} />
      <GoToSymbol open={symbolOpen} code={active.content} language={active.language}
        onClose={() => setSymbolOpen(false)} onGoto={(l) => setGotoLine(l)} />
      <SettingsModal open={settings} onClose={() => setSettings(false)} fontSize={fontSize} setFontSize={setFontSize} onToast={toast} onOpenShortcuts={() => setShortcutsOpen(true)} initialTab={settingsTab} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <AccountsModal open={accountsOpen} onClose={() => setAccountsOpen(false)} onToast={toast} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <LlmSetupGuide open={llmGuideOpen} onClose={() => setLlmGuideOpen(false)} onDone={() => { setLlmGuideOpen(false); toast("LLM is online", "Ask anything in AI Chat."); }} />
      <RepoModal open={repoOpen} onClose={() => setRepoOpen(false)} onImport={doImportRepo} busy={repoBusy} />
      <AIApplyModal plan={planOpen ? plan : null} applied={planApplied} onClose={() => setPlanOpen(false)} onApply={applyItems} onUndo={undoApply} />
    </div></div>
  );
}






