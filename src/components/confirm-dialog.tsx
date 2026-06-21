"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  pendingLabel = "Deleting...",
  cancelLabel = "Cancel",
  destructive = true,
  requireText,
  requireTextLabel,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireText?: string;
  requireTextLabel?: string;
  pending: boolean;
  error?: string | null;
  onConfirm: () => void;
}) {
  const [typedText, setTypedText] = useState("");
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setTypedText("");
    }
  }

  const confirmDisabled = pending || (!!requireText && typedText !== requireText);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          onClick={(e) => e.stopPropagation()}
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-zinc-50">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description className="mt-3 text-sm text-zinc-400">
              {description}
            </Dialog.Description>
          )}

          {requireText && (
            <div className="mt-4">
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {requireTextLabel ?? `Type "${requireText}" to confirm`}
              </label>
              <input
                autoFocus
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={requireText}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-red-400/50"
              />
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
              >
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={confirmDisabled}
              onClick={onConfirm}
              className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                destructive
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-[var(--world-accent,#a78bfa)] hover:opacity-90"
              }`}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
