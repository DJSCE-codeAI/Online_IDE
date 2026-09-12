"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import FileTree, { type OpResult } from "@/components/FileTree";
import Tabs, { type OpenTab } from "@/components/Tabs";
import Editor, { type CursorPosition } from "@/components/Editor";
import OutputPanel, { type RunResult } from "@/components/OutputPanel";
import PreviewPanel from "@/components/PreviewPanel";
import StatusBar from "@/components/StatusBar";
import { findNode, type WorkspaceNode } from "@/lib/types";
import { isRunnable } from "@/lib/languageMap";
import { IconBack, IconPlay, IconFolder } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { useDialog } from "@/components/DialogProvider";
import { useResizableWidth } from "@/lib/useResizableWidth";
import { flattenTreeWithPaths, hasHtmlEntry, isPreviewableFile, pickPreviewEntry } from "@/lib/previewFiles";
import {
  buildLocalTree,
  createLocalEntry,
  deleteLocalEntry,
  isFileSystemAccessSupported,
  readLocalFile,
  renameLocalFile,
  writeLocalFile,
  type LocalEntry,
} from "@/lib/localFs";
import {
  loadDirectoryHandle,
  saveDirectoryHandle,
  ensureReadWritePermission,
} from "@/lib/localHandleStore";
import { takePendingDirectoryHandle } from "@/lib/pendingLocalHandle";

const AUTOSAVE_DELAY_MS = 900;

type Status = "loading" | "no-folder" | "needs-permission" | "ready" | "unsupported" | "error";

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

export default function LocalFolderPage() {
  const toast = useToast();
  const dialog = useDialog();

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState("");
  const [tree, setTree] = useState<WorkspaceNode[]>([]);
  const entriesRef = useRef<Map<string, LocalEntry>>(new Map());

  const [openFiles, setOpenFiles] = useState<OpenFileState[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const openFilesRef = useRef(openFiles);
  useEffect(() => {
    openFilesRef.current = openFiles;
  });

  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [rightPanel, setRightPanel] = useState<"console" | "preview">("console");
  const [previewManifest, setPreviewManifest] = useState<Record<string, string> | null>(null);
  const [cursor, setCursor] = useState<CursorPosition | null>(null);

  const sidebarResize = useResizableWidth("ide.sidebarWidth", 240, 160, 480, "right");
  const consoleResize = useResizableWidth("ide.consoleWidth", 384, 240, 640, "left");

  // Local content isn't all in memory like the cloud tree, so building the
  // manifest means reading every previewable file from disk (skipping ones
  // already open, which use their live — possibly unsaved — content).
  const buildPreviewManifest = useCallback(async () => {
    const manifest: Record<string, string> = {};
    for (const { path, node } of flattenTreeWithPaths(tree)) {
      if (!isPreviewableFile(path)) continue;
      const open = openFilesRef.current.find((f) => f.id === node.id);
      if (open) {
        manifest[path] = open.content;
        continue;
      }
      const entry = entriesRef.current.get(path);
      if (entry && entry.handle.kind === "file") {
        try {
          manifest[path] = await readLocalFile(entry.handle);
        } catch {
          // skip a file that can't be read rather than failing the whole preview
        }
      }
    }
    setPreviewManifest(manifest);
  }, [tree]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rebuilding the preview manifest from disk when the tab is switched to, not a plain data fetch
    if (rightPanel === "preview") buildPreviewManifest();
  }, [rightPanel, buildPreviewManifest]);

  const previewEntryPath = useMemo(
    () => (previewManifest ? pickPreviewEntry(Object.keys(previewManifest), activeId) : null),
    [previewManifest, activeId]
  );

  const canPreview = useMemo(() => hasHtmlEntry(tree), [tree]);

  const refreshTree = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      try {
        const { tree: nextTree, entries } = await buildLocalTree(handle);
        entriesRef.current = entries;
        setTree(nextTree);
      } catch {
        toast.show("Couldn't read the folder contents.", "error");
      }
    },
    [toast]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isFileSystemAccessSupported()) {
          if (!cancelled) setStatus("unsupported");
          return;
        }
        let handle = takePendingDirectoryHandle();
        if (!handle) {
          handle = await loadDirectoryHandle();
        }
        if (!handle) {
          if (!cancelled) setStatus("no-folder");
          return;
        }
        if (cancelled) return;
        setDirHandle(handle);
        setFolderName(handle.name);
        const perm = await handle.queryPermission({ mode: "readwrite" });
        if (cancelled) return;
        if (perm === "granted") {
          await refreshTree(handle);
          if (!cancelled) setStatus("ready");
        } else {
          setStatus("needs-permission");
        }
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Couldn't open the stored folder.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshTree]);

  const grantAccess = async () => {
    if (!dirHandle) return;
    try {
      const result = await ensureReadWritePermission(dirHandle);
      if (result === "granted") {
        await refreshTree(dirHandle);
        setStatus("ready");
      } else {
        toast.show("Access wasn't granted, so this folder can't be opened.", "error");
      }
    } catch {
      toast.show("Couldn't request folder access.", "error");
    }
  };

  const pickFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await saveDirectoryHandle(handle);
      setDirHandle(handle);
      setFolderName(handle.name);
      await refreshTree(handle);
      setStatus("ready");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.show("Couldn't open that folder.", "error");
    }
  };

  // Keep open tabs in sync with the tree: drop tabs whose file was deleted
  // elsewhere, and pick up renames for non-dirty tabs.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reconciling local tab state against the freshly-walked directory tree
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

  const openFile = async (node: WorkspaceNode) => {
    if (node.type !== "file") return;
    if (openFilesRef.current.some((f) => f.id === node.id)) {
      setActiveId(node.id);
      return;
    }
    const entry = entriesRef.current.get(node.id);
    if (!entry || entry.handle.kind !== "file") {
      toast.show("Couldn't find that file.", "error");
      return;
    }
    try {
      const content = await readLocalFile(entry.handle);
      setActiveId(node.id);
      setOpenFiles((prev) => [...prev, { id: node.id, name: node.name, content, dirty: false }]);
    } catch {
      toast.show("Couldn't read that file.", "error");
    }
  };

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAutoSaveTimer = () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
  };

  const saveFile = useCallback(
    async (id: string) => {
      const file = openFilesRef.current.find((f) => f.id === id);
      if (!file || !file.dirty) return;
      const entry = entriesRef.current.get(id);
      if (!entry || entry.handle.kind !== "file") {
        toast.show("Couldn't find that file on disk.", "error");
        return;
      }
      setSaving(true);
      try {
        await writeLocalFile(entry.handle, file.content);
        setOpenFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, dirty: false } : f)));
        if (rightPanel === "preview") buildPreviewManifest();
      } catch {
        toast.show("Couldn't save — check the folder's permissions.", "error");
      } finally {
        setSaving(false);
      }
    },
    [toast, rightPanel, buildPreviewManifest]
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
    setOpenFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, content, dirty: true } : f)));
    clearAutoSaveTimer();
    autoSaveTimer.current = setTimeout(() => saveFile(fileId), AUTOSAVE_DELAY_MS);
  };

  useEffect(() => clearAutoSaveTimer, []);

  const createNode = useCallback(
    async (parentId: string | null, name: string, type: "file" | "folder"): Promise<OpResult> => {
      const parentHandle = parentId ? entriesRef.current.get(parentId)?.handle : dirHandle;
      if (!parentHandle || parentHandle.kind !== "directory") {
        return { ok: false, error: "Couldn't find that folder." };
      }
      try {
        await createLocalEntry(parentHandle, name, type);
        await refreshTree(dirHandle!);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Couldn't create it." };
      }
    },
    [dirHandle, refreshTree]
  );

  const renameNode = useCallback(
    async (id: string, name: string): Promise<OpResult> => {
      const entry = entriesRef.current.get(id);
      if (!entry) return { ok: false, error: "Couldn't find that item." };
      if (entry.handle.kind === "directory") {
        return { ok: false, error: "Renaming folders isn't supported in local mode yet — only files." };
      }
      const node = findNode(tree, id);
      if (!node) return { ok: false, error: "Couldn't find that item." };
      try {
        await renameLocalFile(entry.parentHandle, node.name, name);
        await refreshTree(dirHandle!);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Couldn't rename it." };
      }
    },
    [dirHandle, tree, refreshTree]
  );

  const deleteNode = useCallback(
    async (id: string): Promise<OpResult> => {
      const entry = entriesRef.current.get(id);
      const node = findNode(tree, id);
      if (!entry || !node) return { ok: false, error: "Couldn't find that item." };
      try {
        await deleteLocalEntry(entry.parentHandle, node.name, node.type === "folder");
        await refreshTree(dirHandle!);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Couldn't delete it." };
      }
    },
    [dirHandle, tree, refreshTree]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
      } else if (e.key === "b") {
        e.preventDefault();
        setSidebarVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeId, saveActive, closeTab]);

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
        body: JSON.stringify({ filename: file.name, content: file.content }),
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

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-(--surface-panel) text-(--text-secondary) p-6 text-sm">
        Loading…
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <CenteredMessage
        title="Not supported in this browser"
        message="Local folder editing uses the File System Access API, which only Chrome and Edge support right now — not Firefox or Safari."
      />
    );
  }

  if (status === "error") {
    return <CenteredMessage title="Something went wrong" message={errorMsg ?? "Unknown error."} />;
  }

  if (status === "no-folder") {
    return (
      <CenteredMessage title="No folder open" message="Pick a folder from your computer to start editing.">
        <button
          onClick={pickFolder}
          className="mt-4 bg-(--accent) hover:brightness-110 text-white px-4 h-9 rounded-md text-[13px] font-medium transition"
        >
          Choose Folder
        </button>
      </CenteredMessage>
    );
  }

  if (status === "needs-permission") {
    return (
      <CenteredMessage
        title={`Reopen "${folderName}"?`}
        message="Your browser needs you to re-grant access to this folder after a reload."
      >
        <button
          onClick={grantAccess}
          className="mt-4 bg-(--accent) hover:brightness-110 text-white px-4 h-9 rounded-md text-[13px] font-medium transition"
        >
          Grant Access
        </button>
      </CenteredMessage>
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

        <div className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-(--text-secondary) truncate">
          <IconFolder className="w-3.5 h-3.5 text-(--accent) shrink-0" />
          {folderName}
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
                  ? "This folder is empty"
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
              <OutputPanel running={running} result={runResult} />
            ) : (
              <PreviewPanel manifest={previewManifest} entryPath={previewEntryPath} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CenteredMessage({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-(--surface-panel) text-(--text-primary) p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-[17px] font-semibold mb-2">{title}</h1>
        <p className="text-(--text-secondary) text-[13px] leading-relaxed">{message}</p>
        {children}
        <div className="mt-4">
          <Link href="/" className="inline-flex items-center gap-1 text-(--accent) hover:underline text-[13px]">
            <IconBack className="w-3 h-3" /> Back to Projects
          </Link>
        </div>
      </div>
    </div>
  );
}
