"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export interface TerminalRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

interface TerminalPanelProps {
  socketUrl?: string;
  filename?: string;
  content?: string;
  running?: boolean;
  result?: TerminalRunResult | null;
  onRun?: () => void;
}

export default function TerminalPanel({
  socketUrl,
  filename,
  content,
  running,
  result,
  onRun,
}: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const commandRef = useRef("");
  const promptRef = useRef<(() => void) | null>(null);
  const filenameRef = useRef(filename);
  const contentRef = useRef(content);
  const onRunRef = useRef(onRun);

  useEffect(() => {
    filenameRef.current = filename;
    contentRef.current = content;
    onRunRef.current = onRun;
  }, [filename, content, onRun]);

  useEffect(() => {
    if (!terminalRef.current) return;
    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 12,
      theme: { background: "#1e1e1e", foreground: "#d4d4d4" },
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(terminalRef.current);
    fit.fit();
    terminalInstance.current = terminal;

    if (!socketUrl) {
      const writePrompt = () => terminal.write("\r\n$ ");
      promptRef.current = writePrompt;
      terminal.writeln("IDE terminal ready.");
      terminal.writeln("Type run to execute the active file, or help for commands.");
      writePrompt();

      const input = terminal.onData((data) => {
        if (data === "\r") {
          const command = commandRef.current.trim();
          commandRef.current = "";
          terminal.write("\r\n");
          if (command === "run") {
            if (filenameRef.current && contentRef.current !== undefined && onRunRef.current) {
              onRunRef.current();
            }
            else terminal.writeln("No runnable file is selected.");
          } else if (command === "clear") {
            terminal.clear();
          } else if (command === "help") {
            terminal.writeln("run   Execute the active file");
            terminal.writeln("clear Clear terminal output");
            terminal.writeln("help  Show this message");
          } else if (command) {
            terminal.writeln(`Command not available: ${command}`);
          }
          writePrompt();
          return;
        }
        if (data === "\u007f") {
          if (commandRef.current) {
            commandRef.current = commandRef.current.slice(0, -1);
            terminal.write("\b \b");
          }
          return;
        }
        if (data >= " ") {
          commandRef.current += data;
          terminal.write(data);
        }
      });
      const resize = () => fit.fit();
      window.addEventListener("resize", resize);

      return () => {
        input.dispose();
        window.removeEventListener("resize", resize);
        terminalInstance.current = null;
        promptRef.current = null;
        terminal.dispose();
      };
    }

    const socket = new WebSocket(socketUrl);
    socket.onopen = () => terminal.writeln("Connected to the sandbox terminal.");
    socket.onmessage = (event) => terminal.write(String(event.data));
    socket.onerror = () => terminal.writeln("\r\nTerminal connection failed.");
    socket.onclose = () => terminal.writeln("\r\nTerminal disconnected.");
    const input = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(data);
    });
    const resize = () => fit.fit();
    window.addEventListener("resize", resize);

    return () => {
      input.dispose();
      socket.close();
      window.removeEventListener("resize", resize);
      terminal.dispose();
    };
  }, [socketUrl]);

  useEffect(() => {
    const terminal = terminalInstance.current;
    if (!terminal || !result || running) return;

    terminal.write("\r\n");
    if (result.error) terminal.writeln(result.error);
    if (result.stdout) terminal.write(result.stdout.replace(/\n/g, "\r\n"));
    if (result.stderr) terminal.write(result.stderr.replace(/\n/g, "\r\n"));
    terminal.writeln(`\r\nProcess exited with code ${result.exitCode}.`);
    if (!socketUrl) promptRef.current?.();
  }, [result, running, socketUrl]);

  return <div ref={terminalRef} className="h-full w-full bg-(--surface-editor) p-2" />;
}
