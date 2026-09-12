export type LangKey =
  | "javascript"
  | "typescript"
  | "python"
  | "cpp"
  | "c"
  | "java"
  | "go"
  | "rust"
  | "php"
  | "csharp"
  | "kotlin"
  | "scala"
  | "dart"
  | "ruby"
  | "shell"
  | "perl"
  | "r"
  | "haskell"
  | "lua"
  | "swift";

interface LangConfig {
  cmLanguage: LangKey;
  judge0Id: number;
  label: string;
}

// Judge0 language ids from https://ce.judge0.com/languages — picked recent, stable versions.
const extensionMap: Record<string, LangConfig> = {
  js: { cmLanguage: "javascript", judge0Id: 102, label: "JavaScript (Node.js 22)" },
  jsx: { cmLanguage: "javascript", judge0Id: 102, label: "JavaScript (Node.js 22)" },
  ts: { cmLanguage: "typescript", judge0Id: 101, label: "TypeScript 5.6" },
  tsx: { cmLanguage: "typescript", judge0Id: 101, label: "TypeScript 5.6" },
  py: { cmLanguage: "python", judge0Id: 109, label: "Python 3.13" },
  cpp: { cmLanguage: "cpp", judge0Id: 105, label: "C++ (GCC 14)" },
  cc: { cmLanguage: "cpp", judge0Id: 105, label: "C++ (GCC 14)" },
  c: { cmLanguage: "c", judge0Id: 103, label: "C (GCC 14)" },
  java: { cmLanguage: "java", judge0Id: 91, label: "Java (JDK 17)" },
  go: { cmLanguage: "go", judge0Id: 107, label: "Go 1.23" },
  rs: { cmLanguage: "rust", judge0Id: 108, label: "Rust 1.85" },
  php: { cmLanguage: "php", judge0Id: 98, label: "PHP 8.3" },
  cs: { cmLanguage: "csharp", judge0Id: 51, label: "C# (Mono)" },
  kt: { cmLanguage: "kotlin", judge0Id: 111, label: "Kotlin 2.1" },
  scala: { cmLanguage: "scala", judge0Id: 112, label: "Scala 3.4" },
  dart: { cmLanguage: "dart", judge0Id: 90, label: "Dart 2.19" },
  rb: { cmLanguage: "ruby", judge0Id: 72, label: "Ruby 2.7" },
  sh: { cmLanguage: "shell", judge0Id: 46, label: "Bash 5.0" },
  bash: { cmLanguage: "shell", judge0Id: 46, label: "Bash 5.0" },
  pl: { cmLanguage: "perl", judge0Id: 85, label: "Perl 5.28" },
  r: { cmLanguage: "r", judge0Id: 99, label: "R 4.4" },
  hs: { cmLanguage: "haskell", judge0Id: 61, label: "Haskell (GHC 8.8)" },
  lua: { cmLanguage: "lua", judge0Id: 64, label: "Lua 5.3" },
  swift: { cmLanguage: "swift", judge0Id: 83, label: "Swift 5.2" },
};

export function getLangConfig(filename: string): LangConfig | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return extensionMap[ext] ?? null;
}

export function isRunnable(filename: string): boolean {
  return getLangConfig(filename) !== null;
}
