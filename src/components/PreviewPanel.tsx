"use client";

import { useMemo, useState } from "react";
import { IconRefresh, IconPhone, IconTablet, IconLaptop } from "@/components/icons";
import { buildSelfContainedHtml } from "@/lib/previewFiles";

interface PreviewPanelProps {
  manifest: Record<string, string> | null;
  entryPath: string | null;
}

type DeviceKey = "phone" | "tablet" | "laptop";

const DEVICES: Record<DeviceKey, { width: number; height: number; label: string; Icon: typeof IconPhone }> = {
  phone: { width: 375, height: 667, label: "Phone", Icon: IconPhone },
  tablet: { width: 768, height: 1024, label: "Tablet", Icon: IconTablet },
  laptop: { width: 1280, height: 800, label: "Laptop", Icon: IconLaptop },
};

export default function PreviewPanel({ manifest, entryPath }: PreviewPanelProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [device, setDevice] = useState<DeviceKey>("laptop");

  const srcDoc = useMemo(() => {
    if (!manifest || !entryPath) return null;
    try {
      return buildSelfContainedHtml(manifest, entryPath);
    } catch {
      return null;
    }
  }, [manifest, entryPath]);

  if (!manifest) {
    return <Message>Setting up preview…</Message>;
  }

  if (!entryPath || srcDoc === null) {
    return <Message>No HTML file found to preview.</Message>;
  }

  const active = DEVICES[device];

  return (
    <div className="h-full flex flex-col bg-(--surface-panel)">
      <div className="flex items-center gap-1 px-3 h-8 border-b border-(--border-hairline) bg-(--surface-panel) text-(--text-tertiary) text-[11px] shrink-0">
        <span className="truncate flex-1">/{entryPath}</span>
        <div className="flex items-center gap-0.5 mr-1">
          {(Object.keys(DEVICES) as DeviceKey[]).map((key) => {
            const d = DEVICES[key];
            const isActive = device === key;
            return (
              <button
                key={key}
                title={`${d.label} (${d.width}×${d.height})`}
                aria-label={`Preview at ${d.label} size`}
                onClick={() => setDevice(key)}
                className={`p-1 rounded ${
                  isActive
                    ? "bg-(--accent) text-white"
                    : "hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
                }`}
              >
                <d.Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
        <button
          title="Reload preview"
          aria-label="Reload preview"
          onClick={() => setReloadKey((k) => k + 1)}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 hover:text-(--text-primary)"
        >
          <IconRefresh className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto flex justify-center bg-black/[.15] dark:bg-black/30 p-4">
        <div
          className="bg-white shrink-0 shadow-lg"
          style={{ width: active.width, height: active.height }}
        >
          <iframe
            key={`${entryPath}-${reloadKey}`}
            srcDoc={srcDoc}
            title="Preview"
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center bg-(--surface-editor) text-(--text-tertiary) text-[13px] text-center px-6">
      {children}
    </div>
  );
}
