"use client";

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileStderr?: string;
  error?: string;
}

interface OutputPanelProps {
  running: boolean;
  result: RunResult | null;
}

export default function OutputPanel({ running, result }: OutputPanelProps) {
  const status = running
    ? { color: "bg-amber-400", label: "Running" }
    : result?.error || (result && result.exitCode !== 0)
      ? { color: "bg-(--accent-stop)", label: `Exit ${result?.exitCode ?? "—"}` }
      : result
        ? { color: "bg-(--accent-run)", label: "Succeeded" }
        : { color: "bg-(--text-tertiary)", label: "Idle" };

  return (
    <div className="h-full flex flex-col bg-(--surface-editor) text-neutral-200 font-(family-name:--font-mono) text-[12.5px]">
      <div className="flex items-center gap-2 px-3 h-8 border-b border-white/10 text-neutral-400 uppercase tracking-wide text-[10px] shrink-0 font-(family-name:--font-ui)">
        <span className={`w-2 h-2 rounded-full ${status.color}`} />
        <span>Console</span>
        <span className="ml-auto normal-case tracking-normal text-neutral-500">{status.label}</span>
      </div>
      <div className="flex-1 overflow-auto p-3 whitespace-pre-wrap leading-relaxed">
        {running && <div className="text-neutral-500">Running…</div>}

        {!running && !result && (
          <div className="text-neutral-600 font-(family-name:--font-ui)">Run a file to see output here.</div>
        )}

        {!running && result?.error && <div className="text-red-400">{result.error}</div>}

        {!running && result && !result.error && (
          <>
            {result.compileStderr && (
              <div className="text-yellow-400 mb-2">{result.compileStderr}</div>
            )}
            {result.stdout && <div className="text-neutral-200">{result.stdout}</div>}
            {result.stderr && <div className="text-red-400">{result.stderr}</div>}
            {!result.stdout && !result.stderr && !result.compileStderr && (
              <div className="text-neutral-500 font-(family-name:--font-ui)">(no output)</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
