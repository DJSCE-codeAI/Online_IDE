"use client";

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  compileStderr?: string;
  error?: string;
  status?: string;
  time?: string | null;
  memory?: number | null;
}

interface OutputPanelProps {
  running: boolean;
  result: RunResult | null;
  stdin: string;
  onStdinChange: (value: string) => void;
}

export default function OutputPanel({ running, result, stdin, onStdinChange }: OutputPanelProps) {
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
      {result && !result.error && (
        <div className="flex gap-3 px-3 py-2 border-b border-white/10 text-[11px] text-neutral-500">
          <span>{result.status ?? status.label}</span>
          {result.time && <span>{result.time}s</span>}
          {result.memory != null && <span>{result.memory} KB</span>}
        </div>
      )}
      <div className="border-b border-white/10 p-2 shrink-0">
        <label className="block text-[10px] uppercase tracking-wide text-neutral-500 mb-1">Stdin</label>
        <textarea
          value={stdin}
          onChange={(event) => onStdinChange(event.target.value)}
          placeholder="Input passed to the next run"
          rows={2}
          className="w-full resize-y rounded border border-white/10 bg-black/20 px-2 py-1.5 text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-(--accent)"
        />
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
