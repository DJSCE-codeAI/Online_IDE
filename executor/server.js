/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PORT = Number(process.env.PORT || 4000);
const IMAGE = process.env.EXECUTOR_IMAGE || "executor-sandbox:local";
const WORK_ROOT = process.env.WORK_ROOT || "/work";
const TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const LANGUAGES = new Set(["python", "c", "cpp", "javascript", "jsx", "tsx"]);

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function commandFor(language) {
  const commands = {
    python: "python3 /workspace/main.py",
    javascript: "node /workspace/main.js",
    jsx: "esbuild /workspace/main.jsx --loader:jsx --platform=node --format=cjs --log-level=error --outfile=/tmp/program.cjs && node -e 'global.React={createElement:(type,props,...children)=>({type,props:props||{},children})}; require(\"/tmp/program.cjs\")'",
    tsx: "esbuild /workspace/main.tsx --loader:tsx --platform=node --format=cjs --log-level=error --outfile=/tmp/program.cjs && node -e 'global.React={createElement:(type,props,...children)=>({type,props:props||{},children})}; require(\"/tmp/program.cjs\")'",
    c: "gcc -O2 -std=c17 /workspace/main.c -o /tmp/program && /tmp/program",
    cpp: "g++ -O2 -std=c++17 /workspace/main.cpp -o /tmp/program && /tmp/program",
  };
  return commands[language];
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2 * 1024 * 1024) throw new Error("Request is too large");
  }
  return JSON.parse(body);
}

async function execute(language, source, stdin) {
  const extension = { python: "py", javascript: "js", jsx: "jsx", tsx: "tsx", c: "c", cpp: "cpp" }[language];
  const directory = await fs.mkdtemp(path.join(WORK_ROOT, "ide-exec-"));
  const sourcePath = path.join(directory, `main.${extension}`);
  const containerSource = `/workspace/${path.basename(directory)}/main.${extension}`;
  try {
    await fs.chmod(directory, 0o755);
    await fs.writeFile(sourcePath, source, "utf8");
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  }

  const args = [
    "run", "--rm", "--init", "-i", "--network", "none", "--cpus", "0.5", "--memory", "128m",
    "--pids-limit", "64", "--read-only", "--tmpfs", "/tmp:rw,exec,nosuid,size=64m",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--user", "1000:1000",
    "--mount", "type=volume,source=executor-work,destination=/workspace,readonly", IMAGE, "sh", "-lc",
    commandFor(language).replaceAll(`/workspace/main.${extension}`, containerSource),
  ];

  const started = process.hrtime.bigint();
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let outputLimitReached = false;
  const collect = (target) => (chunk) => {
    if (stdout.length + stderr.length + chunk.length > MAX_OUTPUT_BYTES) {
      outputLimitReached = true;
      child.kill("SIGKILL");
      return;
    }
    if (target === "stdout") stdout += chunk.toString();
    else stderr += chunk.toString();
  };
  child.stdout.on("data", collect("stdout"));
  child.stderr.on("data", collect("stderr"));
  child.stdin.end(stdin);

  const result = await new Promise((resolve) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, TIMEOUT_MS);
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ error, timedOut, code: null });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ timedOut, code });
    });
  });

  await fs.rm(directory, { recursive: true, force: true });
  const time = Number(process.hrtime.bigint() - started) / 1e9;
  const exitCode = result.timedOut ? 124 : (result.code ?? 1);
  const status = result.error
    ? "executor_error"
    : result.timedOut
      ? "timeout"
      : outputLimitReached
        ? "output_limit"
        : exitCode === 0
          ? "accepted"
          : (language === "c" || language === "cpp") && stderr
            ? "compilation_error"
            : "runtime_error";

  return {
    stdout,
    stderr: result.error ? result.error.message : stderr,
    exitCode,
    compileStderr: status === "compilation_error" ? stderr : undefined,
    status,
    time: time.toFixed(3),
    memory: null,
  };
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") return json(response, 200, { ok: true });
  if (request.method !== "POST" || request.url !== "/execute") return json(response, 404, { error: "Not found" });

  try {
    const { language, source, stdin = "" } = await readJson(request);
    if (!LANGUAGES.has(language) || typeof source !== "string" || typeof stdin !== "string") {
      return json(response, 400, { error: "language, source, and stdin are invalid" });
    }
    return json(response, 200, await execute(language, source, stdin));
  } catch (error) {
    return json(response, 400, { error: error instanceof Error ? error.message : "Invalid request" });
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`executor listening on ${PORT}`));