"use client";

import { useState } from "react";
import type { WorkspaceNode } from "@/lib/types";
import { IconChevron, IconFolder, IconFile, IconPlus, IconFolderPlus, IconTrash } from "@/components/icons";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import { fileIconColor } from "@/lib/fileIcons";

export interface OpResult {
  ok: boolean;
  error?: string;
}

interface FileTreeProps {
  tree: WorkspaceNode[];
  activeFileId: string | null;
  onOpenFile: (file: WorkspaceNode) => void;
  onCreateNode: (parentId: string | null, name: string, type: "file" | "folder") => Promise<OpResult>;
  onRenameNode: (id: string, name: string) => Promise<OpResult>;
  onDeleteNode: (id: string) => Promise<OpResult>;
}

export default function FileTree({
  tree,
  activeFileId,
  onOpenFile,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
}: FileTreeProps) {
  const dialog = useDialog();
  const toast = useToast();

  const handleCreate = async (parentId: string | null, type: "file" | "folder") => {
    const name = await dialog.prompt({
      title: type === "file" ? "New File" : "New Folder",
      label: "Name",
      placeholder: type === "file" ? "main.py" : "src",
      confirmLabel: "Create",
    });
    if (!name) return;
    const result = await onCreateNode(parentId, name, type);
    if (!result.ok) toast.show(result.error ?? "Couldn't create it.", "error");
  };

  return (
    <div className="text-[13px] select-none h-full flex flex-col">
      <div className="flex items-center justify-between px-3 h-8 shrink-0">
        <span className="text-[11px] font-semibold text-(--text-tertiary) uppercase tracking-wide">
          Files
        </span>
        <div className="flex gap-1 text-(--text-secondary)">
          <button
            title="New File"
            aria-label="New File"
            className="p-1 rounded hover:bg-black/[.06] dark:hover:bg-white/[.08] hover:text-(--text-primary)"
            onClick={() => handleCreate(null, "file")}
          >
            <IconPlus className="w-3.5 h-3.5" />
          </button>
          <button
            title="New Folder"
            aria-label="New Folder"
            className="p-1 rounded hover:bg-black/[.06] dark:hover:bg-white/[.08] hover:text-(--text-primary)"
            onClick={() => handleCreate(null, "folder")}
          >
            <IconFolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {tree.length === 0 && (
          <div className="px-3 py-6 text-center text-(--text-tertiary) text-xs leading-relaxed">
            No files yet.
            <br />
            Use the buttons above to add one.
          </div>
        )}
        {tree.map((node) => (
          <FileTreeItem
            key={node.id}
            node={node}
            depth={0}
            activeFileId={activeFileId}
            onOpenFile={onOpenFile}
            onCreate={handleCreate}
            onRenameNode={onRenameNode}
            onDeleteNode={onDeleteNode}
          />
        ))}
      </div>
    </div>
  );
}

function FileTreeItem({
  node,
  depth,
  activeFileId,
  onOpenFile,
  onCreate,
  onRenameNode,
  onDeleteNode,
}: {
  node: WorkspaceNode;
  depth: number;
  activeFileId: string | null;
  onOpenFile: (file: WorkspaceNode) => void;
  onCreate: (parentId: string | null, type: "file" | "folder") => void;
  onRenameNode: (id: string, name: string) => Promise<OpResult>;
  onDeleteNode: (id: string) => Promise<OpResult>;
}) {
  const dialog = useDialog();
  const toast = useToast();

  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);

  const isFolder = node.type === "folder";
  const isActive = node.id === activeFileId;

  const commitRename = async () => {
    setRenaming(false);
    if (renameValue.trim() && renameValue !== node.name) {
      const result = await onRenameNode(node.id, renameValue.trim());
      if (!result.ok) {
        toast.show(result.error ?? "Couldn't rename it.", "error");
        setRenameValue(node.name);
      }
    } else {
      setRenameValue(node.name);
    }
  };

  const handleDelete = async () => {
    const ok = await dialog.confirm({
      title: `Delete "${node.name}"?`,
      message: isFolder
        ? "This will permanently delete the folder and everything inside it."
        : "This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const result = await onDeleteNode(node.id);
    if (!result.ok) toast.show(result.error ?? "Couldn't delete it.", "error");
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={`group flex items-center gap-1.5 h-[26px] px-2 mx-1.5 rounded-md cursor-default ${
          isActive
            ? "bg-(--accent) text-white"
            : "text-(--text-primary) hover:bg-black/[.05] dark:hover:bg-white/[.06]"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={() => (isFolder ? setExpanded((e) => !e) : onOpenFile(node))}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          if (isFolder) setExpanded((v) => !v);
          else onOpenFile(node);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setRenaming(true);
        }}
      >
        <span className={isActive ? "text-white/80" : "text-(--text-tertiary)"}>
          {isFolder ? <IconChevron open={expanded} className="w-3 h-3" /> : <span className="inline-block w-3" />}
        </span>
        <span className={isActive ? "text-white/90" : isFolder ? "text-(--accent)" : fileIconColor(node.name)}>
          {isFolder ? <IconFolder className="w-3.5 h-3.5" /> : <IconFile className="w-3.5 h-3.5" />}
        </span>

        {renaming ? (
          <input
            autoFocus
            className="bg-white dark:bg-black/40 border border-(--border-hairline-strong) rounded px-1 text-(--text-primary) flex-1 min-w-0"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setRenameValue(node.name);
                setRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{node.name}</span>
        )}

        <div className={`hidden group-hover:flex gap-0.5 ${isActive ? "text-white/80" : "text-(--text-tertiary)"}`}>
          {isFolder && (
            <>
              <button
                title="New File"
                aria-label="New File"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                  onCreate(node.id, "file");
                }}
                className="p-0.5 rounded hover:bg-black/10"
              >
                <IconPlus className="w-3 h-3" />
              </button>
              <button
                title="New Folder"
                aria-label="New Folder"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                  onCreate(node.id, "folder");
                }}
                className="p-0.5 rounded hover:bg-black/10"
              >
                <IconFolderPlus className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            title="Delete"
            aria-label={`Delete ${node.name}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-0.5 rounded hover:bg-black/10 hover:text-(--accent-stop)"
          >
            <IconTrash className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isFolder && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFileId={activeFileId}
              onOpenFile={onOpenFile}
              onCreate={onCreate}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
