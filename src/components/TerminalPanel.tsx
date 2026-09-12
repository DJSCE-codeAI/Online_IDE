"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  socketUrl?: string;
}

export default function TerminalPanel({ socketUrl }: TerminalPanelProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

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

    if (!socketUrl) {
      terminal.writeln("Browser terminal is disabled.");
      terminal.writeln("Set NEXT_PUBLIC_TERMINAL_WS_URL to a sandboxed WebSocket service.");
      return () => terminal.dispose();
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

  return <div ref={terminalRef} className="h-full w-full bg-(--surface-editor) p-2" />;
}
