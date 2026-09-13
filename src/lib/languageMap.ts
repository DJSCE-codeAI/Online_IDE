export type LangKey =
  | "javascript"
  | "typescript"
  | "python"
  | "cpp"
  | "c";

export type Runner = "javascript" | "jsx" | "tsx" | "python" | "c" | "cpp" | "preview";

export interface LangConfig {
  cmLanguage: LangKey;
  runner: Runner;
  label: string;
}

const extensionMap: Record<string, LangConfig> = {
  js: { cmLanguage: "javascript", runner: "javascript", label: "JavaScript (Node.js)" },
  jsx: { cmLanguage: "javascript", runner: "jsx", label: "JSX (Node.js)" },
  tsx: { cmLanguage: "typescript", runner: "tsx", label: "TSX (Node.js)" },
  py: { cmLanguage: "python", runner: "python", label: "Python 3" },
  c: { cmLanguage: "c", runner: "c", label: "C (GCC)" },
  cpp: { cmLanguage: "cpp", runner: "cpp", label: "C++ (G++)" },
  cc: { cmLanguage: "cpp", runner: "cpp", label: "C++ (G++)" },
  html: { cmLanguage: "javascript", runner: "preview", label: "HTML (Preview)" },
  htm: { cmLanguage: "javascript", runner: "preview", label: "HTML (Preview)" },
  css: { cmLanguage: "javascript", runner: "preview", label: "CSS (Preview)" },
};

export function getLangConfig(filename: string): LangConfig | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return extensionMap[ext] ?? null;
}

export function isRunnable(filename: string): boolean {
  return getLangConfig(filename) !== null;
}
