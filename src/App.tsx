import { useEffect, useMemo, useState } from "react";
import MonacoEditor from "./components/MonacoEditor";
import FileExplorer from "./components/FileExplorer";
import EditorTabs from "./components/EditorTabs";
import AICommandPalette from "./components/AICommandPalette";
import SemanticSearchPanel from "./components/SemanticSearchPanel";
import AICodeActions from "./components/AICodeActions";
import DebugAssistant from "./components/DebugAssistant";
import AIChatSidebar from "./components/AIChatSidebar";
import ProjectRefactorEngine from "./components/ProjectRefactorEngine";
import AIRefactorPanel from "./components/AIRefactorPanel";
import TitleBar from "./components/TitleBar";
import ActivityBar from "./components/ActivityBar";
import StatusBar from "./components/StatusBar";
import SettingsModal from "./components/SettingsModal";
import BottomDock from "./components/BottomDock";
import RepoModal from "./components/RepoModal";
import DebugConsole from "./components/DebugConsole";
import type { Problem } from "./components/ProblemsPanel";
import { useTabs, useTheme, useToasts } from "./store";
import type { Activity, DockTab, MenuAction } from "./store";
import { downloadTab, importRepoFromGitHub, openFilePicker, openFolderPicker, runJsPreview } from "./fs";
import { useLLMCall } from "./aiClient";
import { ChevronRight, Play, Save } from "lucide-react";

export default function App() {
  const tabsApi = useTabs();
  const { tabs, active, activeId, setActiveId } = tabsApi;
  const { updateContent, close, save, saveAll, closeAll, openFiles, addFile } = tabsApi;
  const { theme, toggle } = useTheme();
  const { toasts, push, dismiss } = useToasts();
  const [activity, setActivity] = useState<Activity>("explorer");
  const [dock, setDock] = useState<DockTab>("terminal");
  const [palette, setPalette] = useState(false);
  const [settings, setSettings] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [repoBusy, setRepoBusy] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(14);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [gotoLine, setGotoLine] = useState<number | null>(null);
  const [findSignal, setFindSignal] = useState(0);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [output, setOutput] = useState("");
  const toast = (title: string, body?: string) => push({ title, body, kind: "ok" });
  const toastErr = (title: string, body?: string) => push({ title, body, kind: "error" });
  const dirty = useMemo(() => tabs.some((t) => t.dirty), [tabs]);
  const { run: runAI } = useLLMCall();

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
  async function doAddFolder() {
    try {
      const { tabs: files, folder } = await openFolderPicker();
      if (!files.length) { toast("No text files", "Folder had no importable text files."); return; }
      setFolderName(folder);
      openFiles(files);
      setActivity("explorer");
      toast("Added folder: " + folder, files.length + " file(s)");
    } catch (e: any) { toastErr("Add folder failed", String(e?.message || e)); }
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
  function gotoLinePrompt() {
    const raw = window.prompt("Go to line:", String(cursor.line));
    const n = raw ? parseInt(raw, 10) : NaN;
    if (!isNaN(n) && n > 0) setGotoLine(n);
  }
  async function aiHelp(kind: "explain" | "fix" | "tests") {
    setDock("output");
    setOutput(kind + "… asking " + active.label);
    const q = kind === "explain" ? "Explain this file briefly with key functions." : kind === "fix" ? "Find bugs and propose fixes with code." : "Generate concise unit tests for this file.";
    const ans = await runAI("File: " + active.label + "\n```\n" + active.content.slice(0, 6000) + "\n```\nTask: " + q);
    setOutput("> " + kind + " " + active.label + "\n\n" + ans);
  }
  function onMenu(a: MenuAction) {
    if (a === "new-file") { addFile(); setActivity("explorer"); }
    else if (a === "open-file") doAddFile();
    else if (a === "open-folder") doAddFolder();
    else if (a === "open-repo") setRepoOpen(true);
    else if (a === "save") { save(activeId); downloadTab(active); toast("Saved " + active.label); }
    else if (a === "save-all") { saveAll(); toast("All files saved"); }
    else if (a === "close-tab") close(activeId);
    else if (a === "close-all") closeAll();
    else if (a === "palette") setPalette(true);
    else if (a === "goto-line") gotoLinePrompt();
    else if (a === "find") setFindSignal((n) => n + 1);
    else if (a === "toggle-theme") toggle();
    else if (a === "toggle-terminal") setDock("terminal");
    else if (a === "toggle-debug") setDock("debug");
    else if (a === "explain") aiHelp("explain");
    else if (a === "fix") aiHelp("fix");
    else if (a === "tests") aiHelp("tests");
    else if (a === "settings") setSettings(true);
    else if (a === "shortcuts") setSettings(true);
    else if (a === "about") toast("VS-IDE", "Local-first AI IDE. LLM: Settings → LLM Connection.");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "k") { e.preventDefault(); setPalette(true); }
      else if (mod && k === "s") { e.preventDefault(); save(activeId); toast("Saved " + active.label); }
      else if (mod && k === "n") { e.preventDefault(); addFile(); }
      else if (mod && k === "o") { e.preventDefault(); doAddFile(); }
      else if (mod && k === "g") { e.preventDefault(); gotoLinePrompt(); }
      else if (mod && k === ",") { e.preventDefault(); setSettings(true); }
    };
    const onSave = () => { save(activeId); toast("Saved " + active.label); };
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
      if (c === "Save file") { save(activeId); toast("Saved"); }
      if (c === "Go to terminal") setDock("terminal");
      if (c === "Show problems") setDock("problems");
      if (c === "Run JS") doQuickRun();
    } else { setDock("output"); }
  }
  const leftPanel = activity === "chat"
    ? <AIChatSidebar code={active.content} onToast={toast} />
    : activity === "search"
    ? <SemanticSearchPanel files={tabs} onOpen={setActiveId} />
    : activity === "refactor"
    ? <AIRefactorPanel code={active.content} onToast={toast} />
    : activity === "debug"
    ? <><DebugConsole code={active.content} onToast={toast} onLog={(s) => setOutput((o) => o + "\n" + s)} /><DebugAssistant code={active.content} logs={output} onToast={toast} /></>
    : activity === "project"
    ? <ProjectRefactorEngine files={tabs} onToast={toast} />
    : <FileExplorer tabs={tabs} activeId={activeId} onOpen={setActiveId} onNew={() => addFile()} onAddFile={doAddFile} onAddFolder={doAddFolder} onAddRepo={() => setRepoOpen(true)} folderName={folderName} />;
  return (
    <div className="ambient-bg"><div className="ide-shell">
      <TitleBar onPalette={() => setPalette(true)} onSettings={() => setSettings(true)} theme={theme} onTheme={toggle} dirty={dirty} onMenu={onMenu} />
      <div className="ide-body">
        <ActivityBar active={activity} onPick={setActivity} />
        <div className="ide-left">{leftPanel}</div>
        <div className="ide-center">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><EditorTabs tabs={tabs} activeId={activeId} onChange={setActiveId} onClose={close} /></div>
            <button className="btn btn-sm btn-primary" onClick={doQuickRun} title="Run JS preview (sandboxed)"><Play size={13} /> Run</button>
            <button className="btn btn-sm" onClick={() => { save(activeId); downloadTab(active); toast("Saved " + active.label); }}><Save size={13} /> Save</button>
          </div>
          <div className="crumbs" style={{ padding: 0 }}>
            <span>{folderName || "src"}</span><ChevronRight size={12} /><b>{active.label}</b>
            <span className="badge" style={{ marginLeft: 6 }}>{active.language}</span>
            {active.dirty && <span className="badge badge-warn">unsaved</span>}
          </div>
          <div className="ide-main-row">
            <div className="ide-editor-col">
              <MonacoEditor value={active.content} language={active.language} fontSize={fontSize} onChange={(v) => updateContent(activeId, v)} onCursor={(l, c) => setCursor({ line: l, col: c })} onProblems={setProblems} gotoLine={gotoLine} onGotoDone={() => setGotoLine(null)} findSignal={findSignal} />
              <BottomDock dock={dock} setDock={setDock} code={active.content} problems={problems} onGotoProblem={(l) => setGotoLine(l)} output={output} onToast={toast} />
            </div>
            <div className="ide-right">
              <AIChatSidebar code={active.content} onToast={toast} />
              <SemanticSearchPanel files={tabs} onOpen={setActiveId} />
              <AIRefactorPanel code={active.content} onToast={toast} />
              <DebugAssistant code={active.content} logs={output} onToast={toast} />
              <ProjectRefactorEngine files={tabs} onToast={toast} />
              <div className="glass"><div className="panel-header"><span>Quick actions</span></div><div className="panel-body"><AICodeActions code={active.content} onApply={(c) => { updateContent(activeId, c); toast("Applied AI result"); }} onToast={toast} /></div></div>
            </div>
          </div>
        </div>
      </div>
      <StatusBar language={active.language} problems={problems.length} toasts={toasts} onDismiss={dismiss} onOpenProblems={() => setDock("problems")} line={cursor.line} col={cursor.col} />
      <AICommandPalette open={palette} onClose={() => setPalette(false)} tabs={tabs} onOpenFile={setActiveId} onRun={onPaletteRun} onToast={toast} />
      <SettingsModal open={settings} onClose={() => setSettings(false)} fontSize={fontSize} setFontSize={setFontSize} onToast={toast} />
      <RepoModal open={repoOpen} onClose={() => setRepoOpen(false)} onImport={doImportRepo} busy={repoBusy} />
    </div></div>
  );
}



