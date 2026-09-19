import { useMemo, useState } from "react";
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
import type { Problem } from "./components/ProblemsPanel";
import { useTabs, useTheme, useToasts, useKeyboard } from "./store";
import type { Activity, DockTab } from "./store";
import { ChevronRight, Save } from "lucide-react";

export default function App() {
  const tabsApi = useTabs();
  const { tabs, active, activeId, setActiveId } = tabsApi;
  const { updateContent, close, save, setTabs } = tabsApi;
  const { theme, toggle } = useTheme();
  const { toasts, push, dismiss } = useToasts();
  const [activity, setActivity] = useState<Activity>("explorer");
  const [dock, setDock] = useState<DockTab>("terminal");
  const [palette, setPalette] = useState(false);
  const [settings, setSettings] = useState(false);
  const [model, setModel] = useState("your-model-name");
  const [fontSize, setFontSize] = useState(14);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [gotoLine, setGotoLine] = useState<number | null>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [output, setOutput] = useState("");
  const toast = (title: string, body?: string) => push({ title, body, kind: "ok" });
  const dirty = useMemo(() => tabs.some((t) => t.dirty), [tabs]);
  useKeyboard({
    "mod+k": () => setPalette(true),
    "mod+s": () => { save(activeId); toast("Saved " + active.label); },
  });
  function newFile() {
    const id = "file" + Date.now();
    const n = tabs.length + 1;
    setTabs([...tabs, { id, label: "untitled-" + n + ".ts", language: "typescript", content: "// untitled-" + n + "\n", dirty: true }]);
    setActiveId(id);
  }
  function onPaletteRun(cmd: string, res: string) {
    setOutput("> " + cmd + "\n\n" + res);
    if (cmd.startsWith("cmd:")) {
      const c = cmd.slice(4);
      if (c === "New file") newFile();
      if (c === "Toggle theme") toggle();
      if (c === "Save file") { save(activeId); toast("Saved"); }
      if (c === "Go to terminal") setDock("terminal");
      if (c === "Show problems") setDock("problems");
    } else { setDock("output"); }
  }
  const leftPanel = activity === "chat"
    ? <AIChatSidebar code={active.content} onToast={toast} />
    : activity === "search"
    ? <SemanticSearchPanel files={tabs} onOpen={setActiveId} />
    : activity === "refactor"
    ? <AIRefactorPanel code={active.content} onToast={toast} />
    : activity === "debug"
    ? <DebugAssistant code={active.content} logs={output} onToast={toast} />
    : activity === "project"
    ? <ProjectRefactorEngine files={tabs} onToast={toast} />
    : <FileExplorer tabs={tabs} activeId={activeId} onOpen={setActiveId} onNew={newFile} />;
  return (
    <div className="ambient-bg"><div className="ide-shell">
      <TitleBar onPalette={() => setPalette(true)} onSettings={() => setSettings(true)} theme={theme} onTheme={toggle} dirty={dirty} />
      <div className="ide-body">
        <ActivityBar active={activity} onPick={setActivity} />
        <div className="ide-left">{leftPanel}</div>
        <div className="ide-center">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}><EditorTabs tabs={tabs} activeId={activeId} onChange={setActiveId} onClose={close} /></div>
            <button className="btn btn-sm" onClick={() => { save(activeId); toast("Saved " + active.label); }}><Save size={13} /> Save</button>
          </div>
          <div className="crumbs" style={{ padding: 0 }}>
            <span>src</span><ChevronRight size={12} /><b>{active.label}</b>
            <span className="badge" style={{ marginLeft: 6 }}>{active.language}</span>
            {active.dirty && <span className="badge badge-warn">unsaved</span>}
          </div>
          <div className="ide-main-row">
            <div className="ide-editor-col">
              <MonacoEditor value={active.content} language={active.language} fontSize={fontSize} onChange={(v) => updateContent(activeId, v)} onCursor={(l, c) => setCursor({ line: l, col: c })} onProblems={setProblems} gotoLine={gotoLine} onGotoDone={() => setGotoLine(null)} />
              <BottomDock dock={dock} setDock={setDock} code={active.content} problems={problems} onGotoProblem={(l) => setGotoLine(l)} output={output} />
            </div>
            <div className="ide-right">
              <AIChatSidebar code={active.content} onToast={toast} />
              <SemanticSearchPanel files={tabs} onOpen={setActiveId} />
              <AIRefactorPanel code={active.content} onToast={toast} />
              <DebugAssistant code={active.content} logs={output} onToast={toast} />
              <ProjectRefactorEngine files={tabs} onToast={toast} />
              <div className="glass"><div className="panel-header"><span>Quick actions</span></div><div className="panel-body"><AICodeActions code={active.content} onApply={(c) => { updateContent(activeId, c); toast("Applied AI result"); }} /></div></div>
            </div>
          </div>
        </div>
      </div>
      <StatusBar language={active.language} problems={problems.length} toasts={toasts} onDismiss={dismiss} onOpenProblems={() => setDock("problems")} line={cursor.line} col={cursor.col} />
      <AICommandPalette open={palette} onClose={() => setPalette(false)} tabs={tabs} onOpenFile={setActiveId} onRun={onPaletteRun} onToast={toast} />
      <SettingsModal open={settings} onClose={() => setSettings(false)} model={model} setModel={setModel} fontSize={fontSize} setFontSize={setFontSize} />
    </div></div>
  );
}



