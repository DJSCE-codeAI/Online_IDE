"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { go } from "@codemirror/lang-go";
import { rust } from "@codemirror/lang-rust";
import { php } from "@codemirror/lang-php";
import { StreamLanguage } from "@codemirror/language";
import { csharp, dart, kotlin, scala } from "@codemirror/legacy-modes/mode/clike";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { perl } from "@codemirror/legacy-modes/mode/perl";
import { r } from "@codemirror/legacy-modes/mode/r";
import { haskell } from "@codemirror/legacy-modes/mode/haskell";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { LangKey } from "@/lib/languageMap";
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

// Module-level (not per-render) so these are stable references across every
// render — @uiw/react-codemirror reconfigures the editor whenever it sees a
// new object identity here, which combined with onUpdate touching parent
// state was causing an infinite render loop.
const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
  autocompletion: true,
};
const EDITOR_STYLE = { height: "100%", fontSize: "13px", fontFamily: "var(--font-mono)" };

const langExtensions: Record<LangKey, () => Extension> = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  python: () => python(),
  cpp: () => cpp(),
  c: () => cpp(), // lang-cpp's grammar covers plain C well enough for highlighting
  java: () => java(),
  go: () => go(),
  rust: () => rust(),
  php: () => php(),
  csharp: () => StreamLanguage.define(csharp),
  kotlin: () => StreamLanguage.define(kotlin),
  scala: () => StreamLanguage.define(scala),
  dart: () => StreamLanguage.define(dart),
  ruby: () => StreamLanguage.define(ruby),
  shell: () => StreamLanguage.define(shell),
  perl: () => StreamLanguage.define(perl),
  r: () => StreamLanguage.define(r),
  haskell: () => StreamLanguage.define(haskell),
  lua: () => StreamLanguage.define(lua),
  swift: () => StreamLanguage.define(swift),
};

export default function Editor({ filename, value, onChange, onCursorChange }: EditorProps) {
  const extensions = useMemo(() => {
    const lang = getLangConfig(filename);
    const base = [EditorView.lineWrapping];
    if (lang && langExtensions[lang.cmLanguage]) {
      return [...base, langExtensions[lang.cmLanguage]()];
    }
    return base;
  }, [filename]);

  const handleUpdate = (update: ViewUpdate) => {
    if (!onCursorChange || !update.selectionSet) return;
    const pos = update.state.selection.main.head;
    const line = update.state.doc.lineAt(pos);
    onCursorChange({ line: line.number, col: pos - line.from + 1 });
  };

  return (
    <div className="h-full bg-(--surface-editor)">
      <CodeMirror
        value={value}
        height="100%"
        theme="dark"
        extensions={extensions}
        onChange={onChange}
        onUpdate={handleUpdate}
        basicSetup={BASIC_SETUP}
        style={EDITOR_STYLE}
      />
    </div>
  );
}
