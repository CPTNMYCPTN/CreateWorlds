"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, Plus, Trash2, X } from "lucide-react";
import { createWorldInvite, deleteWorldInvite, type WorldInvite } from "./actions";

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never" },
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];

const MAX_USES_OPTIONS = [
  { value: "unlimited", label: "Unlimited" },
  { value: "1", label: "1 use" },
  { value: "5", label: "5 uses" },
  { value: "25", label: "25 uses" },
];

export function WorldInviteDialog({
  worldId,
  worldSlug,
  invites,
  siteUrl,
}: {
  worldId: string;
  worldSlug: string;
  invites: WorldInvite[];
  siteUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [expiryOption, setExpiryOption] = useState("never");
  const [maxUsesOption, setMaxUsesOption] = useState("unlimited");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteList, setInviteList] = useState(invites);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const inviteUrl = `${siteUrl}/invite`;

  async function handleCreate() {
    setPending(true);
    setError(null);

    const result = await createWorldInvite(
      worldId,
      worldSlug,
      expiryOption,
      maxUsesOption,
    );

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.invite) {
      setInviteList((current) => [result.invite!, ...current]);
    }
  }

  async function handleDelete(inviteId: string) {
    const result = await deleteWorldInvite(worldId, worldSlug, inviteId);

    if (result.error) {
      setError(result.error);
      return;
    }

    setInviteList((current) => current.filter((invite) => invite.id !== inviteId));
  }

  async function handleCopy(code: string) {
    const url = `${inviteUrl}/${code}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setError("Unable to copy invite link.");
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          Invite
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-zinc-50">
                Invite members
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">
                Create and manage invite links for this world.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-50"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-300">Expiry</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EXPIRY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setExpiryOption(option.value)}
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                          expiryOption === option.value
                            ? "bg-violet-500 text-white"
                            : "bg-white/5 text-zinc-300 hover:bg-white/10"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-300">Max uses</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MAX_USES_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMaxUsesOption(option.value)}
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                          maxUsesOption === option.value
                            ? "bg-violet-500 text-white"
                            : "bg-white/5 text-zinc-300 hover:bg-white/10"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={pending}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {pending ? "Creating..." : "Generate invite link"}
              </button>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div>
              <h3 className="text-sm font-semibold text-zinc-200">Active invite links</h3>
              <div className="mt-3 space-y-3">
                {inviteList.length === 0 && (
                  <p className="text-sm text-zinc-500">No active invite links yet.</p>
                )}
                {inviteList.map((invite) => {
                  const isExpired =
                    invite.expires_at && new Date(invite.expires_at) <= new Date();
                  const isMaxedOut =
                    invite.max_uses !== null && invite.uses >= invite.max_uses;

                  return (
                    <div
                      key={invite.id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono text-sm text-zinc-100">
                          {`${inviteUrl}/${invite.code}`}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {isExpired
                            ? "Expired"
                            : isMaxedOut
                              ? "Max uses reached"
                              : invite.max_uses === null
                                ? "Unlimited uses"
                                : `${invite.max_uses - invite.uses} uses left`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(invite.code)}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-white/5"
                        >
                          <Copy className="h-4 w-4" />
                          {copiedCode === invite.code ? "Copied" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(invite.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/15"
                        >
                          <Trash2 className="h-4 w-4" />
                          Revoke
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
