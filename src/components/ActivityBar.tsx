import { Combine, Files, GitBranch, Hammer, ListChecks, ListTree, Search } from "lucide-react";
import type { Activity } from "../store";
import { showContextMenu } from "../lib/contextMenu";
export default function ActivityBar({ active, onPick }: { active: Activity; onPick: (a: Activity) => void }) {
  // Workspace/navigation tools only — every AI tool lives in the right-hand
  // "AI side bar" (collapsible + removable sections) so nothing is duplicated.
  const items: { id: Activity; icon: any; tip: string }[] = [
    { id: "explorer", icon: Files, tip: "Explorer" },
    { id: "search", icon: Search, tip: "Search (Ctrl+Shift+F)" },
    { id: "source-control", icon: GitBranch, tip: "Source control (git)" },
    { id: "outline", icon: ListTree, tip: "Outline" },
    { id: "tasks", icon: ListChecks, tip: "Run tasks (tasks.json)" },
    { id: "build", icon: Hammer, tip: "Build — Idea → Plan → Build (Ctrl+Shift+B)" },
    { id: "fusion", icon: Combine, tip: "Project fusion — combine two projects into one offline tool" },
  ];
  return (
    <div className="glass activity-bar" onContextMenu={(e) => showContextMenu(e, [
      { label: "Explorer", command: "activity-explorer" },
      { label: "Search in Files", command: "activity-search" },
      { label: "Source Control", command: "activity-source-control" },
      { label: "Outline", command: "activity-outline" },
      { label: "Tasks", command: "activity-tasks" },
      { label: "Build", command: "activity-build" },
      { label: "Project Fusion", command: "activity-fusion" },
      { sep: true },
      { label: "Toggle Side Bar", command: "toggle-sidebar" },
      { label: "Toggle AI Side Bar", command: "toggle-rightbar" },
      { label: "Project Launcher…", command: "splash" },
    ], "Activity bar")}>
      {items.map((it) => {
        const Icon = it.icon;
        return <button key={it.id} title={it.tip} className={"activity-btn" + (active === it.id ? " active" : "")} onClick={() => onPick(it.id)}><Icon size={17} /></button>;
      })}
    </div>
  );
}
