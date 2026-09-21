import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { Play, Plus, X } from "lucide-react";
import "xterm/css/xterm.css";
import type { TabDef } from "../store";
import {
  canRunReal, detectAvailableLanguages, detectShells, runShell,
  RUNNERS, runWithLanguage, selectedShell, setSelectedShell, SHELLS, SHELL_LABEL,
  type RunResult, type ShellInfo,
} from "../lib/runner";

const DIM = "\x1b[2m", BOLD = "\x1b[1;33m", RED = "\x1b[1;31m", GREEN = "\x1b[1;32m", CYAN = "\x1b[1;36m", RESET = "\x1b[0m";

type Session = { id: string; label: string; shellId: string };
let seq = 1;
const newSession = (shellId: string): Session => ({ id: "term-" + seq++, label: "term " + seq, shellId });

export default function TerminalPanel({ active }: { active?: TabDef | null }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const activeRef = useRef<TabDef | null>(active ?? null);
  const busyRef = useRef(false);
  const [realMode] = useState(canRunReal());
  const [avail, setAvail] = useState<Record<string, boolean>>({});
  const [shells, setShells] = useState<ShellInfo[]>([]);
  const [shellChoice, setShellChoice] = useState(selectedShell());
  const shellChoiceRef = useRef(shellChoice);
  shellChoiceRef.current = shellChoice;
  const [langChoice, setLangChoice] = useState("auto");
  const [busy, setBusy] = useState(false);
  // multi-terminal sessions (labels + shell per session); scrollback is shared xterm
  const [sessions, setSessions] = useState<Session[]>(() => [newSession(selectedShell())]);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  activeRef.current = active ?? null;

  useEffect(() => {
    if (!realMode) return;
    detectAvailableLanguages().then(setAvail).catch(() => setAvail({}));
    detectShells().then(setShells).catch(() => setShells([]));
  }, [realMode]);

  useEffect(() => {
    if (!ref.current || termRef.current) return;
    const term = new Terminal({
      fontSize: 12.5,
      fontFamily: "JetBrains Mono, Cascadia Code, Menlo, monospace",
      theme: { background: "#150a0f", foreground: "#f4e9d8", cursor: "#f9e7a8", selectionBackground: "rgba(194,36,71,0.4)" },
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    fit.fit();
    termRef.current = term;
    const shellName = SHELL_LABEL(sessions[0]?.shellId ?? "cmd");

    const write = (s: string) => { for (const line of s.replace(/\r/g, "").split("\n")) term.writeln(line); };

    const printHelp = () => {
      term.writeln(`${BOLD}VS-IDE terminal${RESET} — real commands run in your workspace folder`);
      term.writeln(`${DIM}  run            run the active file with its language interpreter`);
      term.writeln("  run <lang>     force a language: " + Object.keys(RUNNERS).join(", "));
      term.writeln("  langs          show which toolchains are installed");
      term.writeln("  shells         list installed shells");
      term.writeln("  help / clear   this help / clear screen");
      term.writeln(`  anything else  executes for real: python main.py, git status, npm install…${RESET}`);
    };

    term.writeln(`${BOLD}VS-IDE terminal${RESET} ${DIM}(${shellName} — workspace as cwd)${RESET}`);
    printHelp();
    term.write("\r\n$ ");

    let buf = "";
    const history: string[] = [];
    let histIdx = -1;

    const printResult = (r: RunResult) => {
      if (r.output.trim()) write(r.output.trimEnd());
      if (r.timedOut) write(`${RED}⏱ Timed out — process killed.${RESET}`);
      else if (!r.ok) write(`${RED}✖ exited with code ${r.code ?? "?"}${RESET}`);
      else write(`${GREEN}✔ exited 0${RESET}`);
    };

    const runLanguage = async (override?: string) => {
      const tab = activeRef.current;
      if (!tab) { write(`${RED}No active file to run.${RESET}`); return; }
      const lang = override || tab.language;
      if (!RUNNERS[lang]) { write(`${RED}No runner for "${lang}".${RESET}`); return; }
      write(`${DIM}> run ${lang} — ${tab.label}${RESET}`);
      busyRef.current = true; setBusy(true);
      try {
        const { result, command, error } = await runWithLanguage(tab, lang);
        if (command) write(`${DIM}> ${command}${RESET}`);
        if (error) write(`${RED}${error}${RESET}`);
        if (result) printResult(result);
      } catch (e: any) { write(`${RED}${String(e?.message || e)}${RESET}`); }
      finally { busyRef.current = false; setBusy(false); }
    };

    const exec = async (cmd: string) => {
      if (cmd === "help") { printHelp(); return; }
      if (cmd === "clear") { term.clear(); return; }
      if (cmd === "langs") {
        const a = await detectAvailableLanguages();
        for (const [id, ok] of Object.entries(a)) write(`${ok ? GREEN + "✔" : RED + "✖"}${RESET} ${id}${ok ? "" : "  (not installed)"}`);
        return;
      }
      if (cmd === "shells") {
        const list = await detectShells().catch(() => [] as ShellInfo[]);
        for (const s of list) write(`${s.available ? GREEN + "✔" : RED + "✖"}${RESET} ${s.id}${s.version ? `  ${DIM}${s.version}${RESET}` : ""}`);
        return;
      }
      if (cmd === "run") { await runLanguage(); return; }
      if (cmd.startsWith("run ")) { await runLanguage(cmd.slice(4).trim()); return; }
      busyRef.current = true; setBusy(true);
      try { printResult(await runShell(cmd, 60000, shellChoiceRef.current)); }
      catch (e: any) { write(`${RED}${String(e?.message || e)}${RESET}`); }
      finally { busyRef.current = false; setBusy(false); }
    };

    term.onData((d) => {
      if (d === "\r") {
        const cmd = buf.trim();
        term.write("\r\n");
        buf = "";
        if (!cmd) { term.write("$ "); return; }
        history.push(cmd);
        histIdx = history.length;
        void exec(cmd).then(() => term.write("$ "));
      } else if (d === "\u007f") { if (buf.length) { buf = buf.slice(0, -1); term.write("\b \b"); } }
      else if (d === "\u0003") { term.write("^C\r\n$ "); buf = ""; }
      else if (d === "\u001b[A") { if (histIdx > 0) { histIdx--; buf = history[histIdx]; term.write(`\r$ ${" ".repeat(200)}\r$ ${buf}`); } }
      else if (d === "\u001b[B") { if (histIdx < history.length - 1) { histIdx++; buf = history[histIdx]; term.write(`\r$ ${" ".repeat(200)}\r$ ${buf}`); } else { histIdx = history.length; buf = ""; term.write(`\r$ ${" ".repeat(200)}\r$ `); } }
      else if (d === "\u001b[C" || d === "\u001b[D") { /* no cursor movement in this simple line editor */ }
      else { buf += d; term.write(d); }
    });

    const onResize = () => { try { fit.fit(); } catch {} };
    const to = setTimeout(onResize, 60);
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(to); window.removeEventListener("resize", onResize); term.dispose(); termRef.current = null; };
  }, [realMode]);


  /** Toolbar "Run" button — same as typing `run`. */
  async function runFromToolbar() {
    const term = termRef.current;
    if (!term || busyRef.current) return;
    const tab = activeRef.current;
    term.write(`\r\n${DIM}$ run${RESET}`);
    if (!tab) { term.writeln(`\r\n${RED}No active file to run.${RESET}`); term.write("$ "); return; }
    const lang = langChoice !== "auto" ? langChoice : tab.language;
    if (!RUNNERS[lang]) { term.writeln(`\r\n${RED}No runner for "${lang}".${RESET}`); term.write("$ "); return; }
    term.writeln(`${DIM} ${lang} — ${tab.label}${RESET}`);
    busyRef.current = true; setBusy(true);
    try {
      const { result, command, error } = await runWithLanguage(tab, lang);
      if (command) term.writeln(`${DIM}> ${command}${RESET}`);
      if (error) term.writeln(`${RED}${error}${RESET}`);
      if (result) {
        for (const line of result.output.replace(/\r/g, "").split("\n")) term.writeln(line);
        if (result.timedOut) term.writeln(`${RED}⏱ Timed out — process killed.${RESET}`);
        else term.writeln(result.ok ? `${GREEN}✔ exited 0${RESET}` : `${RED}✖ exited with code ${result.code ?? "?"}${RESET}`);
      }
    } catch (e: any) { term.writeln(`${RED}${String(e?.message || e)}${RESET}`); }
    finally { busyRef.current = false; setBusy(false); term.write("$ "); }
  }

  function addSession() {
    const s = newSession(shellChoice);
    setSessions((prev) => [...prev, s]);
    setActiveIdx(sessions.length);
    termRef.current?.writeln(`\r\n${CYAN}── new terminal (${SHELL_LABEL(s.shellId)}) ──${RESET}`);
    termRef.current?.write("$ ");
  }
  function killSession(idx: number) {
    if (sessions.length <= 1) return;
    termRef.current?.writeln(`\r\n${DIM}── killed ${sessions[idx].label} ──${RESET}`);
    setSessions((prev) => prev.filter((_, i) => i !== idx));
    setActiveIdx((cur) => (cur >= idx && cur > 0 ? cur - 1 : cur));
  }
  function pickShell(id: string) {
    setShellChoice(id);
    setSelectedShell(id);
    termRef.current?.writeln(`${DIM}── shell → ${SHELL_LABEL(id)} ──${RESET}`);
  }

  const sess = sessions[activeIdx];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
      {realMode && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
            {sessions.map((s, i) => (
              <span
                key={s.id}
                onClick={() => setActiveIdx(i)}
                title={`Terminal ${i + 1} — ${SHELL_LABEL(s.shellId)}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11,
                  padding: "2px 8px", borderRadius: 8,
                  background: i === activeIdx ? "var(--maroon, #2a1620)" : "transparent",
                  border: "1px solid " + (i === activeIdx ? "var(--gold, #e9c46a)" : "var(--border, #2a3040)"),
                  color: i === activeIdx ? "var(--gold, #e9c46a)" : "var(--text-2, #8b93a9)",
                }}
              >
                {s.label}
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); killSession(i); }}
                    title="Kill this terminal"
                    style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, display: "inline-flex" }}
                  ><X size={10} /></button>
                )}
              </span>
            ))}
            <button className="icon-btn" style={{ width: 22, height: 22 }} title="New terminal" onClick={addSession}><Plus size={13} /></button>
          </div>
          <select
            value={sess?.shellId ?? shellChoice}
            onChange={(e) => pickShell(e.target.value)}
            style={{ fontSize: 12, background: "var(--bg-2, #10131c)", color: "var(--text, #d7deef)", border: "1px solid var(--border, #2a3040)", borderRadius: 8, padding: "3px 8px" }}
            title="Shell used for typed commands"
          >
            {SHELLS.filter((s) => !s.windows || navigator.platform.toLowerCase().includes("win")).map((s) => {
              const info = shells.find((x) => x.id === s.id);
              return <option key={s.id} value={s.id}>{s.label}{info && !info.available ? " (not installed)" : ""}</option>;
            })}
          </select>
          <select
            value={langChoice}
            onChange={(e) => setLangChoice(e.target.value)}
            style={{ fontSize: 12, background: "var(--bg-2, #10131c)", color: "var(--text, #d7deef)", border: "1px solid var(--border, #2a3040)", borderRadius: 8, padding: "3px 8px" }}
            title="Language used by the Run button (auto = active file's language)"
          >
            <option value="auto">Auto ({active?.language || "none"})</option>
            {Object.entries(RUNNERS).map(([id, r]) => (
              <option key={id} value={id}>{r.label}{avail[id] === false ? " (not installed)" : ""}</option>
            ))}
          </select>
          <button className="btn btn-sm btn-primary" disabled={busy || !active} onClick={runFromToolbar} title="Run the active file">
            <Play size={12} /> {busy ? "Running…" : "Run active file"}
          </button>
          <span className="badge" style={{ fontSize: 11 }}>{busy ? "running" : "shell ready"}</span>
          <span style={{ fontSize: 11, color: "var(--text-2, #8b93a9)" }}>{active ? `${active.label} · ${active.language}` : "no file open"}</span>
        </div>
      )}
      <div ref={ref} className="xterm-host" style={{ flex: 1, minHeight: 0, width: "100%", padding: 6 }} />
    </div>
  );
}

