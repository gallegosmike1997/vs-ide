import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
export default function TerminalPanel() {
  const ref = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  useEffect(() => {
    if (!ref.current || termRef.current) return;
    const term = new Terminal({
      fontSize: 12.5,
      fontFamily: "JetBrains Mono, Cascadia Code, Menlo, monospace",
      theme: { background: "#07090f", foreground: "#d7deef", cursor: "#4f8cff", selectionBackground: "rgba(79,140,255,0.3)" },
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);
    fit.fit();
    termRef.current = term;
    term.writeln("\x1b[1;34mVS-IDE\x1b[0m integrated terminal");
    term.writeln("\x1b[2mType help for demo commands\x1b[0m");
    term.write("\r\n$ ");
    let buf = "";
    term.onData((d) => {
      if (d === "\r") {
        term.writeln("");
        const cmd = buf.trim(); buf = "";
        if (!cmd) { term.write("$ "); return; }
        if (cmd === "help") term.writeln("commands: help, clear, ls, echo <text>, ai <question>");
        else if (cmd === "clear") term.clear();
        else if (cmd === "ls") term.writeln("App.tsx  main.tsx  api.ts  package.json");
        else if (cmd.startsWith("echo ")) term.writeln(cmd.slice(5));
        else if (cmd.startsWith("ai ")) term.writeln("\x1b[2m(sending to AI — see AI Chat for full answer)\x1b[0m");
        else term.writeln(`command not found: ${cmd}`);
        term.write("$ ");
      } else if (d === "\u007f") {
        if (buf.length) { buf = buf.slice(0, -1); term.write("\b \b"); }
      } else if (d === "\u0003") { buf = ""; term.writeln("^C"); term.write("$ "); }
      else { buf += d; term.write(d); }
    });
    const onResize = () => { try { fit.fit(); } catch {} };
    const to = setTimeout(onResize, 60);
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(to); window.removeEventListener("resize", onResize); term.dispose(); termRef.current = null; };
  }, []);
  return <div ref={ref} className="xterm-host" style={{ height: "100%", width: "100%", padding: 6 }} />;
}
