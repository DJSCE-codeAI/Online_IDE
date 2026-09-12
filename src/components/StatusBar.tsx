"use client";

import type { CursorPosition } from "@/components/Editor";
import { getLangConfig } from "@/lib/languageMap";
import { displayLanguage } from "@/lib/fileIcons";

interface StatusBarProps {
  filename: string | null;
  cursor: CursorPosition | null;
}

export default function StatusBar({ filename, cursor }: StatusBarProps) {
  const lang = filename ? (getLangConfig(filename)?.label ?? displayLanguage(filename)) : null;

  return (
    <div className="h-6 flex items-center justify-between px-3 border-t border-(--border-hairline) bg-(--surface-toolbar) text-(--text-tertiary) text-[11px] shrink-0 select-none">
      <span>{lang ?? (filename ? "Plain Text" : "")}</span>
      {filename && cursor && (
        <span>
          Ln {cursor.line}, Col {cursor.col} · UTF-8
        </span>
      )}
    </div>
  );
}
