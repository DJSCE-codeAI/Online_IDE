"use client";

import { useState } from "react";
import { IconClose, IconDot } from "@/components/icons";

export interface OpenTab {
  id: string;
  name: string;
  dirty: boolean;
}

interface TabsProps {
  tabs: OpenTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export default function Tabs({ tabs, activeId, onSelect, onClose }: TabsProps) {
  if (tabs.length === 0) {
    return (
      <div className="h-9 flex items-center px-3 text-xs text-(--text-tertiary) border-b border-(--border-hairline) bg-(--surface-panel) shrink-0">
        No file open
      </div>
    );
  }

  return (
    <div className="h-9 flex items-stretch border-b border-(--border-hairline) overflow-x-auto bg-(--surface-panel) shrink-0">
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeId}
          onSelect={() => onSelect(tab.id)}
          onClose={() => onClose(tab.id)}
        />
      ))}
    </div>
  );
}

function Tab({
  tab,
  isActive,
  onSelect,
  onClose,
}: {
  tab: OpenTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}) {
  const [hoveringClose, setHoveringClose] = useState(false);

  return (
    <div
      onClick={onSelect}
      role="tab"
      aria-selected={isActive}
      className={`relative flex items-center gap-2 px-3 text-[13px] border-r border-(--border-hairline) cursor-default whitespace-nowrap ${
        isActive
          ? "bg-(--surface-editor) text-neutral-100"
          : "text-(--text-secondary) hover:bg-black/[.03] dark:hover:bg-white/[.03]"
      }`}
    >
      {isActive && <span className="absolute left-0 right-0 top-0 h-[2px] bg-(--accent)" />}
      <span className="truncate max-w-[160px]">{tab.name}</span>

      {/* Mac document-proxy convention: a dot for unsaved changes that becomes
          the close control on hover, instead of a permanent x + separate dot. */}
      <button
        title={tab.dirty ? "Unsaved — click to close without saving" : "Close"}
        aria-label={`Close ${tab.name}`}
        onMouseEnter={() => setHoveringClose(true)}
        onMouseLeave={() => setHoveringClose(false)}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`flex items-center justify-center w-4 h-4 rounded-full shrink-0 ${
          isActive ? "hover:bg-white/15" : "hover:bg-black/10 dark:hover:bg-white/10"
        }`}
      >
        {tab.dirty && !hoveringClose ? (
          <IconDot className="w-2.5 h-2.5" />
        ) : (
          <IconClose className="w-2.5 h-2.5" />
        )}
      </button>
    </div>
  );
}
