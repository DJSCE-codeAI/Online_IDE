"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FileTree, { type OpResult } from "@/components/FileTree";
import Tabs, { type OpenTab } from "@/components/Tabs";
import Editor, { type CursorPosition } from "@/components/Editor";
import OutputPanel, { type RunResult } from "@/components/OutputPanel";
import PreviewPanel from "@/components/PreviewPanel";
import TerminalPanel from "@/components/TerminalPanel";
import StatusBar from "@/components/StatusBar";
import { findNode, type Project, type TreeNode, type WorkspaceNode } from "@/lib/types";
import { isRunnable } from "@/lib/languageMap";
import { parseErrorBody } from "@/lib/http";
import { IconBack, IconPlay } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { useDialog } from "@/components/DialogProvider";
import { useResizableWidth } from "@/lib/useResizableWidth";
import { flattenTreeWithPaths, hasHtmlEntry, isPreviewableFile, pickPreviewEntry } from "@/lib/previewFiles";
import { cacheProject, getCachedProject } from "@/lib/localDb";

const AUTOSAVE_DELAY_MS = 900;

function TrafficLights() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
      <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
      <span className="w-3 h-3 rounded-full bg-[#28c840]" />
    </div>
  );
}

interface OpenFileState extends OpenTab {
  content: string;
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const toast = useToast();
  const dialog = useDialog();

  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openFiles, setOpenFiles] = useState<OpenFileState[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const openFilesRef = useRef(openFiles);
  useEffect(() => {
    openFilesRef.current = openFiles;
  });

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [stdin, setStdin] = useState("");
  const [saving, setSaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [rightPanel, setRightPanel] = useState<"console" | "terminal" | "preview">("console");
  const [cursor, setCursor] = useState<CursorPosition | null>(null);

  const sidebarResize = useResizableWidth("ide.sidebarWidth", 240, 160, 480, "right");
  const consoleResize = useResizableWidth("ide.consoleWidth", 384, 240, 640, "left");

  const filePaths = useMemo(() => flattenTreeWithPaths(tree), [tree]);

  const previewManifest = useMemo(() => {
    const manifest: Record<string, string> = {};
    for (const { path, node } of filePaths) {
      if (!isPreviewableFile(path)) continue;
      const open = openFiles.find((f) => f.id === node.id);
      manifest[path] = open ? open.content : (node.content ?? "");
    }
    return manifest;
  }, [filePaths, openFiles]);

  const activeFilePath = useMemo(
    () => filePaths.find((f) => f.node.id === activeId)?.path ?? null,
    [filePaths, activeId]
  );

  const previewEntryPath = useMemo(
    () => pickPreviewEntry(Object.keys(previewManifest), activeFilePath),
    [previewManifest, activeFilePath]
  );

  const canPreview = useMemo(() => hasHtmlEntry(tree), [tree]);

  // Requests can resolve out of order (e.g. two tree refreshes fired close
  // together). Track a sequence number so only the most recent response is
  // ever applied to state — otherwise a slower, older response can silently
  // overwrite newer data.
  const loadSeq = useRef(0);

  const loadTree = useCallback(async () => {
    const seq = ++loadSeq.current;
    const cached = await getCachedProject(projectId);
    if (cached && seq === loadSeq.current) {
      setProject(cached.project);
      setTree(cached.tree);
    }
    const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    if (seq !== loadSeq.current) return;
    if (!res.ok) {
      setError(await parseErrorBody(res));
      return;
    }
    const data = await res.json();
    if (seq !== loadSeq.current) return;
    setProject(data.project);
    setTree(data.tree);
    await cacheProject(data.project, data.tree);
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- simple fetch-on-mount, no external data lib in this learning project
    loadTree().finally(() => setLoading(false));
  }, [loadTree]);

  // Keep open tabs in sync with the tree: drop tabs whose file was deleted
  // elsewhere (e.g. from the tree), and pick up renames for non-dirty tabs.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reconciling local tab state against the server-fetched tree, not a plain prop mirror
    setOpenFiles((prev) => {
      let changed = false;
      const next = prev.flatMap((f) => {
        const node = findNode(tree, f.id);
        if (!node) {
          changed = true;
          return [];
        }
        if (node.name !== f.name) {
          changed = true;
          return [{ ...f, name: node.name }];
        }
        return [f];
      });
      return changed ? next : prev;
    });
  }, [tree]);

  useEffect(() => {
    if (activeId && !openFiles.some((f) => f.id === activeId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- picking a fallback active tab after the active one closed/was removed
      setActiveId(openFiles.length > 0 ? openFiles[openFiles.length - 1].id : null);
    }
  }, [openFiles, activeId]);

  // Native unload guard — the one place a browser-native prompt is the right call,
  // since only the browser itself can intercept a tab close or refresh.
  useEffect(() => {
    const hasUnsaved = openFiles.some((f) => f.dirty);
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsaved) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [openFiles]);

  const openFile = (node: WorkspaceNode) => {
    if (node.type !== "file") return;
    const full = findNode(tree, node.id);
    setActiveId(node.id);
    setOpenFiles((prev) => {
      if (prev.some((f) => f.id === node.id)) return prev;
      return [...prev, { id: node.id, name: node.name, content: full?.content ?? "", dirty: false }];
    });
  };

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAutoSaveTimer = () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
  };

  // Saves a specific file by id (not "whatever is active now") so a debounced
  // auto-save scheduled while editing one tab can't accidentally save a
  // different file the user has since switched to.
  const saveFile = useCallback(
    async (id: string) => {
      const file = openFilesRef.current.find((f) => f.id === id);
      if (!file || !file.dirty) return;
      setSaving(true);
      try {
        const res = await fetch("/api/files", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: file.id, content: file.content }),
        });
        if (!res.ok) {
          toast.show(await parseErrorBody(res), "error");
          return;
        }
        setOpenFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, dirty: false } : f)));
        await loadTree();
      } catch {
        toast.show("Couldn't save — check your connection.", "error");
      } finally {
        setSaving(false);
      }
    },
    [toast, loadTree]
  );

  const saveActive = useCallback(async () => {
    if (!activeId) return;
    clearAutoSaveTimer();
    await saveFile(activeId);
  }, [activeId, saveFile]);

  const closeTab = useCallback(
    async (id: string) => {
      const file = openFilesRef.current.find((f) => f.id === id);
      if (file?.dirty) {
        const ok = await dialog.confirm({
          title: `Close "${file.name}" without saving?`,
          message: "Your changes will be lost. Press ⌘S / Ctrl+S first if you want to keep them.",
          confirmLabel: "Close Without Saving",
          destructive: true,
        });
        if (!ok) return;
      }
      clearAutoSaveTimer();
      setOpenFiles((prev) => prev.filter((f) => f.id !== id));
    },
    [dialog]
  );

  const updateContent = (content: string) => {
    if (!activeId) return;
    const fileId = activeId;
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content, dirty: true } : f))
    );
    clearAutoSaveTimer();
    autoSaveTimer.current = setTimeout(() => saveFile(fileId), AUTOSAVE_DELAY_MS);
  };

  useEffect(() => clearAutoSaveTimer, []);

  const createNode = useCallback(
    async (parentId: string | null, name: string, type: "file" | "folder"): Promise<OpResult> => {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, parent_id: parentId, name, type }),
      });
      if (!res.ok) return { ok: false, error: await parseErrorBody(res) };
      await loadTree();
      return { ok: true };
    },
    [projectId, loadTree]
  );

  const renameNode = useCallback(async (id: string, name: string): Promise<OpResult> => {
    const res = await fetch("/api/files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    if (!res.ok) return { ok: false, error: await parseErrorBody(res) };
    await loadTree();
    return { ok: true };
  }, [loadTree]);

  const deleteNode = useCallback(async (id: string): Promise<OpResult> => {
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) return { ok: false, error: await parseErrorBody(res) };
    await loadTree();
    return { ok: true };
  }, [loadTree]);

  const createFileAtRoot = useCallback(async () => {
    const name = await dialog.prompt({
      title: "New File",
      label: "Name",
      placeholder: "main.py",
      confirmLabel: "Create",
    });
    if (!name) return;
    const result = await createNode(null, name, "file");
    if (!result.ok) toast.show(result.error ?? "Couldn't create it.", "error");
  }, [dialog, createNode, toast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd+S is safe to override — browsers let pages claim it (and
      // users expect "save" there). Ctrl/Cmd+W, +N, and (in Firefox) +B are
      // reserved by the browser itself (close tab, new window, bookmarks
      // sidebar) and can't be intercepted from a page — binding them here
      // would silently close the user's real tab instead of our editor tab.
      // Alt+<letter> isn't reserved by any major browser, so that's what
      // carries the rest of these shortcuts.
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveActive();
        return;
      }
      if (!e.altKey) return;
      if (e.key === "w") {
        if (activeId) {
          e.preventDefault();
          closeTab(activeId);
        }
      } else if (e.key === "n") {
        e.preventDefault();
        createFileAtRoot();
      } else if (e.key === "b") {
        e.preventDefault();
        setSidebarVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeId, saveActive, closeTab, createFileAtRoot]);

  const runActive = async () => {
    const file = openFiles.find((f) => f.id === activeId);
    if (!file) return;
    await saveActive();
    setRunning(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content: file.content, stdin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunResult({ stdout: "", stderr: "", exitCode: -1, error: data.error });
      } else {
        setRunResult(data);
      }
    } catch (e) {
      setRunResult({
        stdout: "",
        stderr: "",
        exitCode: -1,
        error: e instanceof Error ? e.message : "Run failed — check your connection.",
      });
    } finally {
      setRunning(false);
    }
  };

  const activeFile = openFiles.find((f) => f.id === activeId) ?? null;

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-(--surface-panel)">
        <div className="h-11 flex items-center px-3 border-b border-(--border-hairline) bg-(--surface-toolbar) shrink-0">
          <TrafficLights />
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="w-60 border-r border-(--border-hairline) bg-(--surface-sidebar) p-3 space-y-2">
            {[85, 60, 70, 45, 65].map((w, i) => (
              <div key={i} className="h-3 rounded bg-black/[.06] dark:bg-white/[.08] animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="flex-1 bg-(--surface-editor)" />
          <div className="w-96 border-l border-(--border-hairline) bg-(--surface-editor)" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-(--surface-panel) text-(--text-primary) p-6 text-sm">
        <div className="max-w-md">
          <p className="text-(--accent-stop) mb-3">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-(--accent) hover:underline text-sm"
          >
            <IconBack className="w-3 h-3" /> Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-(--surface-panel) text-(--text-primary)">
      <div className="h-11 grid grid-cols-3 items-center px-3 border-b border-(--border-hairline) bg-(--surface-toolbar) shrink-0">
        <div className="flex items-center gap-3">
          <TrafficLights />
          <Link
            href="/"
            title="Back to Projects"
            aria-label="Back to Projects"
            className="text-(--text-tertiary) hover:text-(--text-primary) p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
          >
            <IconBack className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="text-center text-[13px] font-medium text-(--text-secondary) truncate">
          {project?.name}
          {saving && <span className="text-(--text-tertiary) font-normal"> · Saving…</span>}
        </div>

        <div className="flex justify-end">
          <button
            onClick={runActive}
            disabled={!activeFile || !isRunnable(activeFile.name) || running}
            className="flex items-center gap-1.5 bg-(--accent-run) hover:bg-(--accent-run-hover) disabled:bg-black/[.06] disabled:dark:bg-white/[.08] disabled:text-(--text-tertiary) text-white text-[12.5px] font-medium h-7 px-3 rounded-md transition-colors"
          >
            <IconPlay className="w-3 h-3" />
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {sidebarVisible && (
          <>
            <div
              style={{ width: sidebarResize.width }}
              className="border-r border-(--border-hairline) overflow-y-auto shrink-0 bg-(--surface-sidebar)"
            >
              <FileTree
                tree={tree}
                activeFileId={activeId}
                onOpenFile={openFile}
                onCreateNode={createNode}
                onRenameNode={renameNode}
                onDeleteNode={deleteNode}
              />
            </div>
            <div
              onMouseDown={sidebarResize.startDrag}
              title="Drag to resize"
              className="w-2 -mx-0.5 shrink-0 cursor-col-resize group relative z-10"
            >
              <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-transparent group-hover:bg-(--accent)/50 group-active:bg-(--accent)" />
            </div>
          </>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <Tabs
            tabs={openFiles.map(({ id, name, dirty }) => ({ id, name, dirty }))}
            activeId={activeId}
            onSelect={setActiveId}
            onClose={closeTab}
          />
          <div className="flex-1 min-h-0">
            {activeFile ? (
              <Editor
                key={activeFile.id}
                filename={activeFile.name}
                value={activeFile.content}
                onChange={updateContent}
                onCursorChange={setCursor}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-(--surface-editor) text-neutral-600 text-sm">
                {openFiles.length === 0 && tree.length === 0
                  ? "Add a file to get started"
                  : "Select a file to start editing"}
              </div>
            )}
          </div>
          <StatusBar filename={activeFile?.name ?? null} cursor={activeFile ? cursor : null} />
        </div>

        <div
          onMouseDown={consoleResize.startDrag}
          title="Drag to resize"
          className="w-2 -mx-0.5 shrink-0 cursor-col-resize group relative z-10"
        >
          <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-transparent group-hover:bg-(--accent)/50 group-active:bg-(--accent)" />
        </div>
        <div style={{ width: consoleResize.width }} className="shrink-0 flex flex-col">
          <div className="flex items-center h-8 border-b border-(--border-hairline) bg-(--surface-panel) shrink-0 text-[11px] font-semibold uppercase tracking-wide">
            <button
              onClick={() => setRightPanel("terminal")}
              className={`px-3 h-full ${rightPanel === "terminal" ? "text-(--text-primary) border-b-2 border-(--accent) -mb-px" : "text-(--text-tertiary)"}`}
            >
              Terminal
            </button>
            <button
              onClick={() => setRightPanel("console")}
              className={`px-3 h-full ${rightPanel === "console" ? "text-(--text-primary) border-b-2 border-(--accent) -mb-px" : "text-(--text-tertiary)"}`}
            >
              Console
            </button>
            <button
              onClick={() => canPreview && setRightPanel("preview")}
              disabled={!canPreview}
              title={canPreview ? undefined : "Add an .html file to enable preview"}
              className={`px-3 h-full disabled:opacity-40 ${rightPanel === "preview" ? "text-(--text-primary) border-b-2 border-(--accent) -mb-px" : "text-(--text-tertiary)"}`}
            >
              Preview
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {rightPanel === "console" ? (
              <OutputPanel running={running} result={runResult} stdin={stdin} onStdinChange={setStdin} />
            ) : rightPanel === "terminal" ? (
              <TerminalPanel socketUrl={process.env.NEXT_PUBLIC_TERMINAL_WS_URL} />
            ) : (
              <PreviewPanel manifest={previewManifest} entryPath={previewEntryPath} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
