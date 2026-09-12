import Dexie, { type Table } from "dexie";
import type { Project, TreeNode } from "@/lib/types";

interface ProjectSnapshot {
  id: string;
  project: Project;
  tree: TreeNode[];
  updatedAt: number;
}

class IdeDatabase extends Dexie {
  snapshots!: Table<ProjectSnapshot, string>;

  constructor() {
    super("browser-ide");
    this.version(1).stores({ snapshots: "id, updatedAt" });
  }
}

const db = new IdeDatabase();

export async function cacheProject(project: Project, tree: TreeNode[]): Promise<void> {
  await db.snapshots.put({ id: project.id, project, tree, updatedAt: Date.now() });
}

export async function getCachedProject(id: string): Promise<ProjectSnapshot | undefined> {
  return db.snapshots.get(id);
}

export async function removeCachedProject(id: string): Promise<void> {
  await db.snapshots.delete(id);
}
