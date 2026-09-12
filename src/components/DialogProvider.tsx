"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Modal from "@/components/Modal";

interface PromptOptions {
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

interface DialogContextValue {
  prompt: (opts: PromptOptions) => Promise<string | null>;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

type DialogState =
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void }
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | null;

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setValue(opts.defaultValue ?? "");
      setState({ kind: "prompt", opts, resolve });
    });
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", opts, resolve });
    });
  }, []);

  useEffect(() => {
    if (state?.kind === "prompt") {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [state]);

  const closePrompt = (result: string | null) => {
    if (state?.kind !== "prompt") return;
    state.resolve(result);
    setState(null);
  };

  const closeConfirm = (result: boolean) => {
    if (state?.kind !== "confirm") return;
    state.resolve(result);
    setState(null);
  };

  return (
    <DialogContext.Provider value={{ prompt, confirm }}>
      {children}

      {state?.kind === "prompt" && (
        <Modal title={state.opts.title} onClose={() => closePrompt(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              closePrompt(value.trim() || null);
            }}
          >
            {state.opts.label && (
              <label className="block text-[12px] text-(--text-secondary) mb-1.5">{state.opts.label}</label>
            )}
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={state.opts.placeholder}
              className="w-full bg-white dark:bg-white/[.06] border border-(--border-hairline-strong) rounded-md px-3 h-9 text-[13px] outline-none focus-visible:border-(--accent) text-(--text-primary)"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => closePrompt(null)}
                className="h-8 px-3.5 rounded-md text-[13px] text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-8 px-3.5 rounded-md text-[13px] font-medium bg-(--accent) text-white hover:brightness-110"
              >
                {state.opts.confirmLabel ?? "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {state?.kind === "confirm" && (
        <Modal title={state.opts.title} onClose={() => closeConfirm(false)}>
          {state.opts.message && (
            <p className="text-[13px] text-(--text-secondary) leading-relaxed mb-4">{state.opts.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => closeConfirm(false)}
              className="h-8 px-3.5 rounded-md text-[13px] text-(--text-primary) hover:bg-black/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={() => closeConfirm(true)}
              className={`h-8 px-3.5 rounded-md text-[13px] font-medium text-white hover:brightness-110 ${
                state.opts.destructive ? "bg-(--accent-stop)" : "bg-(--accent)"
              }`}
            >
              {state.opts.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}
