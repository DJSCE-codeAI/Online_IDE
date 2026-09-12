const JUDGE0_BASE = process.env.JUDGE0_BASE_URL || "https://ce.judge0.com";
const ACCEPTED_STATUS_ID = 3;

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileStderr?: string;
  status?: string;
  time?: string | null;
  memory?: number | null;
}

export async function executeCode(languageId: number, sourceCode: string, stdin = ""): Promise<ExecuteResult> {
  const res = await fetch(`${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.JUDGE0_API_KEY ? { "X-Auth-Token": process.env.JUDGE0_API_KEY } : {}),
    },
    body: JSON.stringify({ source_code: sourceCode, language_id: languageId, stdin }),
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
    status: data.status?.description,
    time: data.time ?? null,
    memory: data.memory ?? null,
  };
}
