"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteWorld } from "./actions";

export function WorldDangerZone({
  worldId,
  worldSlug,
  worldName,
}: {
  worldId: string;
  worldSlug: string;
  worldName: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);

    const result = await deleteWorld(worldId, worldSlug, worldName);

    setPending(false);

    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
      <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Deleting this world removes all of its folders, threads, posts, the
        map, and members. This action cannot be undone.
      </p>

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
      >
        <Trash2 className="h-4 w-4" />
        Delete world
      </button>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete this world?"
        description={`This permanently deletes "${worldName}" and everything inside it — folders, threads, posts, the map, and member access. This can't be undone.`}
        confirmLabel="Delete world"
        pendingLabel="Deleting..."
        requireText={worldName}
        requireTextLabel={`Type "${worldName}" to confirm`}
        pending={pending}
        error={error}
        onConfirm={handleDelete}
      />
    </section>
  );
}
