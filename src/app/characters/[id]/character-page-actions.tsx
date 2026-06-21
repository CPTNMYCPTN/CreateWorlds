"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteCharacter } from "../create/actions";

export function CharacterPageActions({
  characterId,
  characterName,
}: {
  characterId: string;
  characterName: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);

    const result = await deleteCharacter(characterId);

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDialogOpen(false);
    router.push("/");
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/characters/${characterId}/edit`}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
      >
        <Pencil className="h-4 w-4" />
        Edit
      </Link>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/[0.03] px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete this character?"
        description={`This permanently deletes "${characterName}" and removes it from any worlds it's been added to. This can't be undone.`}
        pending={pending}
        error={error}
        onConfirm={handleDelete}
      />
    </div>
  );
}
