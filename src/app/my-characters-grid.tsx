"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserCircle2 } from "lucide-react";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteCharacter } from "./characters/create/actions";

export type MyCharacterCard = {
  id: string;
  name: string;
  avatar_url: string | null;
  importedWorlds: { id: string; name: string; slug: string }[];
};

function CharacterCard({
  character,
  onDeleted,
}: {
  character: MyCharacterCard;
  onDeleted: (characterId: string) => void;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);

    const result = await deleteCharacter(character.id);

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDialogOpen(false);
    onDeleted(character.id);
  }

  return (
    <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
      <div className="absolute right-2 top-2">
        <ActionMenu
          items={[
            {
              key: "edit",
              label: "Edit",
              icon: Pencil,
              onSelect: () => router.push(`/characters/${character.id}/edit`),
            },
            {
              key: "delete",
              label: "Delete",
              icon: Trash2,
              danger: true,
              onSelect: () => setDialogOpen(true),
            },
          ]}
        />
      </div>

      <Link href={`/characters/${character.id}`} className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
          {character.avatar_url ? (
            <Image
              src={character.avatar_url}
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserCircle2 className="h-full w-full text-zinc-600" />
          )}
        </div>
        <span className="truncate text-sm font-medium text-zinc-200">
          {character.name}
        </span>
      </Link>

      {character.importedWorlds.length === 0 ? (
        <span className="text-xs text-zinc-500">Not in any worlds yet</span>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {character.importedWorlds.map((world) => (
            <Link
              key={world.id}
              href={`/worlds/${world.slug}`}
              className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
            >
              {world.name}
            </Link>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete this character?"
        description={`This permanently deletes "${character.name}" and removes it from any worlds it's been added to. This can't be undone.`}
        pending={pending}
        error={error}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function MyCharactersGrid({
  characters: initialCharacters,
}: {
  characters: MyCharacterCard[];
}) {
  const [characters, setCharacters] = useState(initialCharacters);

  function handleDeleted(characterId: string) {
    setCharacters((current) => current.filter((character) => character.id !== characterId));
  }

  if (characters.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {characters.map((character) => (
        <CharacterCard key={character.id} character={character} onDeleted={handleDeleted} />
      ))}
    </div>
  );
}
