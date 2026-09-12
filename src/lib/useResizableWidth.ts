"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A draggable panel width, persisted per-browser in localStorage.
 * `grow` controls which mouse direction increases width: "right" for a
 * left-hand panel (sidebar), "left" for a right-hand panel (console).
 */
export function useResizableWidth(
  storageKey: string,
  initial: number,
  min: number,
  max: number,
  grow: "left" | "right"
) {
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const n = Number(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a per-viewer stored preference on mount
        if (Number.isFinite(n)) setWidth(Math.min(max, Math.max(min, n)));
      }
    } catch {
      // localStorage unavailable (private mode, etc) — fall back to initial width
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only read the stored width once, on mount
  }, []);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: MouseEvent) => {
        const delta = grow === "right" ? ev.clientX - startX : startX - ev.clientX;
        setWidth(Math.min(max, Math.max(min, startWidth + delta)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setWidth((w) => {
          try {
            localStorage.setItem(storageKey, String(w));
          } catch {
            // ignore — persistence is a nicety, not required for the drag itself
          }
          return w;
        });
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width, grow, min, max, storageKey]
  );

  return { width, startDrag };
}
