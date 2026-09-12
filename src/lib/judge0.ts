const JUDGE0_BASE = "https://ce.judge0.com";
const ACCEPTED_STATUS_ID = 3;

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileStderr?: string;
}

export async function executeCode(languageId: number, sourceCode: string): Promise<ExecuteResult> {
  const res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_code: sourceCode, language_id: languageId }),
  });

  if (!res.ok) {
    throw new Error(`Judge0 execute failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const accepted = data.status?.id === ACCEPTED_STATUS_ID;
  const stderr: string = data.stderr ?? "";

  return {
    stdout: data.stdout ?? "",
    stderr: accepted ? stderr : stderr || data.status?.description || "Execution failed",
    exitCode: accepted ? 0 : 1,
    compileStderr: data.compile_output || undefined,
  };
}
