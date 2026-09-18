import { useState } from 'react';
import MonacoEditor from './components/MonacoEditor';
import FileExplorer from './components/FileExplorer';
import TerminalPanel from './components/TerminalPanel';
import AIRefactorPanel from './components/AIRefactorPanel';
import EditorTabs from './components/EditorTabs';
import AICommandPalette from './components/AICommandPalette';
import { FloatingPanel } from './components/FloatingPanel';
import SemanticSearchPanel from './components/SemanticSearchPanel';
import AICodeActions from './components/AICodeActions';
import DebugAssistant from './components/DebugAssistant';
import AIChatSidebar from './components/AIChatSidebar';
import ProjectRefactorEngine from './components/ProjectRefactorEngine';

export default function App() {
  const [content, setContent] = useState('// Modern IDE Ready');
  const [language, setLanguage] = useState('typescript');
  const [activeTab, setActiveTab] = useState('main');
  const [logs, setLogs] = useState('No logs yet.');

  const tabs = [
    { id: 'main', label: 'main.tsx' },
    { id: 'app', label: 'App.tsx' },
    { id: 'config', label: 'config.json' },
  ];

  const files = [
    { path: 'src/App.tsx', content },
    { path: 'src/main.tsx', content: '// main entry (mocked)' },
  ];

  return (
    <div className='ambient-bg h-screen w-screen flex'>
      <div className='w-72 p-3 flex flex-col gap-3'>
        <FileExplorer onOpen={(path) => setActiveTab(path)} />
        <SemanticSearchPanel files={files} />
            {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      <div className='flex-1 flex flex-col p-3 gap-3'>
        <EditorTabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id)} />
        <div className='flex-1 flex gap-3'>
          <div className='flex-1 flex flex-col gap-3'>
            <MonacoEditor value={content} language={language} onChange={(v) => setContent(v || '')} />
            <AICodeActions code={content} />
                {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
          <div className='w-80'>
            <TerminalPanel />
                {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
              {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
            {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      <div className='w-96 p-3 flex flex-col gap-3'>
        <AIRefactorPanel code={content} />
        <DebugAssistant code={content} logs={logs} />
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      <FloatingPanel>
        <h2 className='text-xl mb-2'>AI Suggestions</h2>
        <p className='text-sm opacity-70'>Inline hints, smells, and refactor ideas appear here.</p>
      </FloatingPanel>

      <AICommandPalette />
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
          {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
  );
}
import AIChatSidebar from './components/AIChatSidebar';
import ProjectRefactorEngine from './components/ProjectRefactorEngine';

Add-Content -Encoding utf8 .\src\App.tsx @"

      {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className='fixed top-10 right-10 w-80 h-[60vh]'>
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className='fixed bottom-10 right-10 w-96 h-[40vh]'>
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
            {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
      {/* AI Chat Sidebar */}
      <div className="fixed top-10 right-10 w-80 h-[60vh]">
        <AIChatSidebar />
      </div>

      {/* Project-wide Refactor Engine */}
      <div className="fixed bottom-10 right-10 w-96 h-[40vh]">
        <ProjectRefactorEngine files={files} />
      </div>
</div>
"

Write-Host "
=== 10) Launch IDE ===
"
npm run tauri dev
# ==========================================
# UNIFIED AI IDE UPGRADE SCRIPT
# ==========================================

Write-Host "
=== 1) Install dependencies ===
"
npm install --force monaco-editor @monaco-editor/react
npm install lucide-react @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-scroll-area
npm install @vitejs/plugin-react

Write-Host "
=== 2) Fix Vite port ===
"
@"
import { defineConfig } from 'vite';
import React
import AIChatSidebar from './components/AIChatSidebar';
import ProjectRefactorEngine from './components/ProjectRefactorEngine';
import AIChatSidebar from './components/AIChatSidebar';
import ProjectRefactorEngine from './components/ProjectRefactorEngine';
import AIChatSidebar from './components/AIChatSidebar';
import ProjectRefactorEngine from './components/ProjectRefactorEngine';
import AIChatSidebar from './components/AIChatSidebar';
import ProjectRefactorEngine from './components/ProjectRefactorEngine'; from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    host: false,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 1422
    },
    watch: {
      ignored: ['**/src-tauri/**']
    }
  }
});
