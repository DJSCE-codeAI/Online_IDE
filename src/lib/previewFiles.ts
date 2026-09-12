import type { WorkspaceNode } from "@/lib/types";

// Text-based web assets the preview can serve. Binary assets (images, fonts)
// aren't supported yet — the manifest is a plain path->string map.
const MIME_BY_EXT: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  json: "application/json",
  svg: "image/svg+xml",
  txt: "text/plain",
  xml: "application/xml",
  map: "application/json",
};

export function previewMime(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext ? (MIME_BY_EXT[ext] ?? null) : null;
}

export function isPreviewableFile(path: string): boolean {
  return previewMime(path) !== null;
}

export function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path);
}

export function hasHtmlEntry(tree: WorkspaceNode[]): boolean {
  return tree.some((n) => (n.type === "file" ? isHtmlPath(n.name) : hasHtmlEntry(n.children ?? [])));
}

// Walks a tree, returning every file leaf paired with its slash-joined path
// from the root. Generic over T so callers keep whatever extra fields their
// node type carries (e.g. a cloud TreeNode's `content`).
export function flattenTreeWithPaths<T extends WorkspaceNode>(
  tree: T[],
  prefix = ""
): { path: string; node: T }[] {
  const out: { path: string; node: T }[] = [];
  for (const node of tree) {
    const path = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === "file") {
      out.push({ path, node });
    } else if (node.children) {
      out.push(...flattenTreeWithPaths(node.children as T[], path));
    }
  }
  return out;
}

// Which file the preview should open: the currently active file if it's
// HTML, else the root index.html, else the first HTML file found anywhere.
export function pickPreviewEntry(paths: string[], preferredPath: string | null): string | null {
  if (preferredPath && isHtmlPath(preferredPath) && paths.includes(preferredPath)) return preferredPath;
  if (paths.includes("index.html")) return "index.html";
  return paths.find(isHtmlPath) ?? null;
}

function resolveManifestPath(
  manifest: Record<string, string>,
  entryDir: string,
  href: string
): string | null {
  const clean = href.replace(/^\.\//, "");
  const candidates = entryDir ? [clean, `${entryDir}/${clean}`] : [clean];
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(manifest, candidate)) return candidate;
  }
  // Last resort: match by filename alone, in case of a folder layout we didn't guess right.
  const base = clean.split("/").pop();
  return Object.keys(manifest).find((k) => k.split("/").pop() === base) ?? null;
}

// Builds one self-contained HTML document for the sandboxed iframe's srcdoc:
// every local <link rel="stylesheet"> and <script src> is inlined from the
// manifest. This sidesteps needing a Service Worker (or any other
// interception mechanism) to resolve relative resource requests — srcdoc
// just needs one finished string. External (http/https) references are left
// alone so CDN-hosted libraries still load normally.
export function buildSelfContainedHtml(manifest: Record<string, string>, entryPath: string): string {
  const html = manifest[entryPath] ?? "";
  const entryDir = entryPath.includes("/") ? entryPath.slice(0, entryPath.lastIndexOf("/")) : "";

  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || /^([a-z]+:)?\/\//i.test(href)) return;
    const key = resolveManifestPath(manifest, entryDir, href);
    if (key) {
      const style = doc.createElement("style");
      style.textContent = manifest[key];
      link.replaceWith(style);
    }
  });

  doc.querySelectorAll("script[src]").forEach((script) => {
    const src = script.getAttribute("src");
    if (!src || /^([a-z]+:)?\/\//i.test(src)) return;
    const key = resolveManifestPath(manifest, entryDir, src);
    if (key) {
      const inline = doc.createElement("script");
      inline.textContent = manifest[key];
      script.replaceWith(inline);
    }
  });

  return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
}
