const COLOR_BY_EXT: Record<string, string> = {
  js: "text-yellow-400",
  jsx: "text-yellow-400",
  ts: "text-blue-400",
  tsx: "text-blue-400",
  py: "text-sky-300",
  html: "text-orange-400",
  htm: "text-orange-400",
  css: "text-sky-400",
  json: "text-yellow-300",
  md: "text-neutral-300",
  c: "text-blue-500",
  cpp: "text-blue-500",
  cc: "text-blue-500",
  cs: "text-purple-400",
  java: "text-red-400",
  go: "text-cyan-400",
  rs: "text-orange-500",
  php: "text-indigo-400",
  rb: "text-red-500",
  sh: "text-green-400",
  bash: "text-green-400",
  kt: "text-purple-300",
  scala: "text-red-400",
  dart: "text-teal-400",
  swift: "text-orange-400",
  pl: "text-sky-300",
  r: "text-blue-400",
  hs: "text-purple-500",
  lua: "text-blue-300",
};

export function fileIconColor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return (ext && COLOR_BY_EXT[ext]) || "text-(--text-secondary)";
}

// Display-only language labels for file types that are not executable.
const DISPLAY_LABEL_BY_EXT: Record<string, string> = {
  html: "HTML",
  htm: "HTML",
  css: "CSS",
  json: "JSON",
  md: "Markdown",
  yml: "YAML",
  yaml: "YAML",
  xml: "XML",
  svg: "SVG",
  txt: "Plain Text",
};

export function displayLanguage(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return (ext && DISPLAY_LABEL_BY_EXT[ext]) ?? null;
}
