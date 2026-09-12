import type { WorkspaceNode } from "@/lib/types";

// Directories that make a real project's tree unusable if we don't skip them
// (node_modules alone can be tens of thousands of entries).
const SKIP_NAMES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "__pycache__",
  ".venv",
  ".DS_Store",
]);

export interface LocalEntry {
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  parentHandle: FileSystemDirectoryHandle;
}

export interface LocalTreeResult {
  tree: WorkspaceNode[];
  entries: Map<string, LocalEntry>;
}

export async function buildLocalTree(rootHandle: FileSystemDirectoryHandle): Promise<LocalTreeResult> {
  const entries = new Map<string, LocalEntry>();

  async function walk(dirHandle: FileSystemDirectoryHandle, pathPrefix: string): Promise<WorkspaceNode[]> {
    const nodes: WorkspaceNode[] = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (SKIP_NAMES.has(name)) continue;
      const id = pathPrefix ? `${pathPrefix}/${name}` : name;
      entries.set(id, { handle, parentHandle: dirHandle });
      if (handle.kind === "directory") {
        const children = await walk(handle, id);
        nodes.push({ id, name, type: "folder", children });
      } else {
        nodes.push({ id, name, type: "file" });
      }
    }
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return nodes;
  }

  const tree = await walk(rootHandle, "");
  return { tree, entries };
}

export async function readLocalFile(handle: FileSystemFileHandle): Promise<string> {
  const file = await handle.getFile();
  return file.text();
}

export async function writeLocalFile(handle: FileSystemFileHandle, content: string): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function createLocalEntry(
  parentHandle: FileSystemDirectoryHandle,
  name: string,
  type: "file" | "folder"
): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
  if (type === "file") {
    return parentHandle.getFileHandle(name, { create: true });
  }
  return parentHandle.getDirectoryHandle(name, { create: true });
}

export async function deleteLocalEntry(
  parentHandle: FileSystemDirectoryHandle,
  name: string,
  recursive: boolean
): Promise<void> {
  await parentHandle.removeEntry(name, { recursive });
}

// The File System Access API has no rename primitive. For a file this
// recreates it under the new name and removes the old one; folder rename
// would need a recursive copy of every descendant and isn't supported yet.
export async function renameLocalFile(
  parentHandle: FileSystemDirectoryHandle,
  oldName: string,
  newName: string
): Promise<FileSystemFileHandle> {
  const oldHandle = await parentHandle.getFileHandle(oldName);
  const content = await readLocalFile(oldHandle);
  const newHandle = await parentHandle.getFileHandle(newName, { create: true });
  await writeLocalFile(newHandle, content);
  await parentHandle.removeEntry(oldName);
  return newHandle;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}
