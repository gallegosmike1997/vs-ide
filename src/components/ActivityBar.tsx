import { Bug, Files, GitBranch, ListChecks, ListTree, MessageSquare, Search, Wand2, FolderKanban } from "lucide-react";
import type { Activity } from "../store";
export default function ActivityBar({ active, onPick }: { active: Activity; onPick: (a: Activity) => void }) {
  const items: { id: Activity; icon: any; tip: string }[] = [
    { id: "explorer", icon: Files, tip: "Explorer" },
    { id: "search", icon: Search, tip: "Search (Ctrl+Shift+F)" },
    { id: "source-control", icon: GitBranch, tip: "Source control (git)" },
    { id: "outline", icon: ListTree, tip: "Outline" },
    { id: "tasks", icon: ListChecks, tip: "Run tasks (tasks.json)" },
    { id: "chat", icon: MessageSquare, tip: "AI chat" },
    { id: "refactor", icon: Wand2, tip: "Refactor" },
    { id: "debug", icon: Bug, tip: "Debug" },
    { id: "project", icon: FolderKanban, tip: "Project" },
  ];
  return (
    <div className="glass activity-bar">
      {items.map((it) => {
        const Icon = it.icon;
        return <button key={it.id} title={it.tip} className={"activity-btn" + (active === it.id ? " active" : "")} onClick={() => onPick(it.id)}><Icon size={17} /></button>;
      })}
    </div>
  );
}
