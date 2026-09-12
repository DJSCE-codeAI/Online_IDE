"use client";

import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import { getLangConfig } from "@/lib/languageMap";

export interface CursorPosition {
  line: number;
  col: number;
}

interface EditorProps {
  filename: string;
  value: string;
  onChange: (value: string) => void;
  onCursorChange?: (pos: CursorPosition) => void;
}

const MONACO_LANGUAGES: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  cpp: "cpp",
  c: "c",
  java: "java",
  html: "html",
  css: "css",
};

export default function Editor({ filename, value, onChange, onCursorChange }: EditorProps) {
  const language = getLangConfig(filename);
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const languageId = language ? MONACO_LANGUAGES[language.cmLanguage] : undefined;

  const handleMount: OnMount = (editor) => {
    onCursorChange?.({ line: editor.getPosition()?.lineNumber ?? 1, col: editor.getPosition()?.column ?? 1 });
    editor.onDidChangeCursorPosition((event) => {
      onCursorChange?.({ line: event.position.lineNumber, col: event.position.column });
    });
  };

  return (
    <div className="h-full bg-(--surface-editor)">
      <MonacoEditor
        value={value}
        theme="dark"
        language={languageId ?? (extension === "jsx" ? "javascript" : extension)}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        onMount={handleMount}
        height="100%"
        options={{
          automaticLayout: true,
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          minimap: { enabled: false },
          padding: { top: 8 },
          tabSize: 2,
          wordWrap: "on",
        }}
      />
    </div>
  );
}
