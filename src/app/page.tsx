"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";
import { parseErrorBody } from "@/lib/http";
import { IconFolder, IconTrash } from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { useDialog } from "@/components/DialogProvider";
import { isFileSystemAccessSupported } from "@/lib/localFs";
import { saveDirectoryHandle } from "@/lib/localHandleStore";
import { setPendingDirectoryHandle } from "@/lib/pendingLocalHandle";

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const dialog = useDialog();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localFsSupported, setLocalFsSupported] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run client-side to avoid an SSR/hydration mismatch
    setLocalFsSupported(isFileSystemAccessSupported());
  }, []);

  const load = async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error(await parseErrorBody(res));
      setProjects(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- simple fetch-on-mount, no external data lib in this learning project
    void load();
  }, []);

  const createProject = async () => {
    if (creating) return;
    const name = newName.trim() || "Untitled Project";
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.show(await parseErrorBody(res), "error");
        return;
      }
      const project = await res.json();
      setNewName("");
      router.push(`/project/${project.id}`);
    } catch {
      toast.show("Couldn't create project — check your connection.", "error");
    } finally {
      setCreating(false);
    }
  };

  const openLocalFolder = async () => {
    if (!localFsSupported) {
      toast.show("Local folder editing needs Chrome or Edge — not supported in this browser.", "error");
      return;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      await saveDirectoryHandle(handle);
      setPendingDirectoryHandle(handle);
      router.push("/local");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      toast.show("Couldn't open that folder.", "error");
    }
  };

  const deleteProject = async (p: Project) => {
    const ok = await dialog.confirm({
      title: `Delete "${p.name}"?`,
      message: "This permanently deletes the project and every file in it. This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;

    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.show(await parseErrorBody(res), "error");
        return;
      }
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      toast.show("Couldn't delete project — check your connection.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center bg-(--surface-panel) text-(--text-primary) min-h-screen px-6 py-20">
      <div className="w-full max-w-xl">
        <h1 className="text-[28px] font-semibold tracking-tight mb-1">Online IDE</h1>
        <p className="text-(--text-secondary) text-[13px] mb-8">
          A multi-language, browser-based code editor with a file tree and one-click execution.
        </p>

        {error && (
          <div className="mb-6 rounded-lg border border-(--accent-stop)/30 bg-(--accent-stop)/10 px-3.5 py-3 text-[13px] text-(--accent-stop) leading-relaxed">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-10">
          <input
            className="flex-1 bg-white dark:bg-white/[.06] border border-(--border-hairline-strong) rounded-md px-3 h-9 text-[13px] outline-none focus-visible:border-(--accent) placeholder:text-(--text-tertiary) disabled:opacity-60"
            placeholder="New project name"
            value={newName}
            disabled={creating}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createProject()}
          />
          <button
            onClick={createProject}
            disabled={creating}
            className="bg-(--accent) hover:brightness-110 disabled:opacity-60 text-white px-4 h-9 rounded-md text-[13px] font-medium transition min-w-[76px]"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>

        <button
          onClick={openLocalFolder}
          title={localFsSupported ? undefined : "Needs Chrome or Edge"}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-(--border-hairline-strong) hover:border-(--accent) hover:text-(--accent) text-(--text-secondary) rounded-lg h-11 text-[13px] font-medium transition-colors mb-10"
        >
          <IconFolder className="w-4 h-4" />
          Open a Local Folder
        </button>

        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-tertiary) mb-3">
          Your Projects
        </h2>

        {loading && (
          <div className="flex flex-col gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[52px] rounded-lg bg-black/[.04] dark:bg-white/[.05] animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-(--text-tertiary) text-[13px] border border-dashed border-(--border-hairline-strong) rounded-lg px-4 py-8 text-center">
            No projects yet — create one above to get started.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {projects.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-3 bg-white dark:bg-white/[.04] hover:bg-black/[.03] dark:hover:bg-white/[.07] border border-(--border-hairline) rounded-lg px-3.5 py-2.5 text-[13px] transition-colors"
            >
              <button
                onClick={() => router.push(`/project/${p.id}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <span className="text-(--accent)">
                  <IconFolder className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-(--text-tertiary) text-[11px] mt-0.5">
                    {new Date(p.created_at).toLocaleString()}
                  </div>
                </span>
              </button>
              <button
                title="Delete project"
                aria-label={`Delete ${p.name}`}
                onClick={() => deleteProject(p)}
                disabled={deletingId === p.id}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 rounded-md text-(--text-tertiary) hover:text-(--accent-stop) hover:bg-(--accent-stop)/10 transition disabled:opacity-60"
              >
                <IconTrash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
