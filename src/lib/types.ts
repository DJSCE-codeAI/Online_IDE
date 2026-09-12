export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface FileNode {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  type: "file" | "folder";
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreeNode extends FileNode {
  children?: TreeNode[];
}

// The minimal shape any workspace source (Supabase-backed cloud project, or a
// local folder via the File System Access API) needs to provide so the
// FileTree/Tabs/Editor components can stay agnostic of where files live.
export interface WorkspaceNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: WorkspaceNode[];
}

export function findNode<T extends WorkspaceNode>(nodes: T[], id: string): T | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children as T[], id);
      if (found) return found;
    }
  }
  return null;
}

export function buildTree(files: FileNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  files.forEach((f) => byId.set(f.id, { ...f, children: f.type === "folder" ? [] : undefined }));

  const roots: TreeNode[] = [];
  byId.forEach((node) => {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortTree(n.children));
  };
  sortTree(roots);

  return roots;
}
