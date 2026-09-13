import type { Runner } from "@/lib/languageMap";

const EXECUTOR_URL = process.env.EXECUTOR_URL || "http://localhost:4000";

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileStderr?: string;
  status: string;
  time: string | null;
  memory: number | null;
}

export async function executeCode(
  language: Runner,
  sourceCode: string,
  stdin = ""
): Promise<ExecuteResult> {
  const response = await fetch(`${EXECUTOR_URL}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, source: sourceCode, stdin }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Executor failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}