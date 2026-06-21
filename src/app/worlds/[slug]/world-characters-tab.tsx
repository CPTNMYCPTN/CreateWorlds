"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, Trash2, UserCircle2, X } from "lucide-react";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteCharacter } from "../../characters/create/actions";
import { getMyCharacters, importCharacter } from "./actions";
import type { OwnedCharacter, WorldCharacter } from "./types";

function AddCharacterDialog({
  worldId,
  worldSlug,
  existingCharacterIds,
  onImported,
  onClose,
}: {
  worldId: string;
  worldSlug: string;
  existingCharacterIds: Set<string>;
  onImported: (worldCharacter: WorldCharacter) => void;
  onClose: () => void;
}) {
  const [characters, setCharacters] = useState<OwnedCharacter[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getMyCharacters()
      .then((result) => {
        setCharacters(result);
      })
      .catch(() => {
        setError("Failed to load your characters.");
        setCharacters([]);
      });
  }, []);

  async function handleImport(characterId: string) {
    setImportingId(characterId);
    setError(null);

    const result = await importCharacter(worldId, worldSlug, characterId);

    setImportingId(null);

    if (result.error || !result.worldCharacter) {
      setError(result.error ?? "Something went wrong.");
    } else {
      onImported(result.worldCharacter);
    }
  }

  const availableCharacters = (characters ?? []).filter(
    (character) => !existingCharacterIds.has(character.id),
  );

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-zinc-50">
              Add character
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

          <div className="mt-4 flex max-h-80 flex-col gap-1 overflow-y-auto">
            {characters === null ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                Loading your characters...
              </p>
            ) : availableCharacters.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                {characters.length === 0
                  ? "You don't have any characters yet."
                  : "All your characters are already in this world."}
              </p>
            ) : (
              <>
                {availableCharacters.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    disabled={importingId !== null}
                    onClick={() => handleImport(character.id)}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                      {character.avatar_url ? (
                        <Image
                          src={character.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircle2 className="h-full w-full text-zinc-600" />
                      )}
                    </div>
                    <span className="truncate text-sm font-medium text-zinc-200">
                      {character.name}
                    </span>
                    {importingId === character.id && (
                      <span className="ml-auto text-xs text-zinc-500">
                        Adding...
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => router.push(`/characters/create?world=${worldId}`)}
                  className="mt-2 flex items-center justify-center rounded-lg border border-dashed border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
                >
                  + Create a character
                </button>
              </>
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CharacterCard({
  worldCharacter,
  currentUserId,
}: {
  worldCharacter: WorldCharacter;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const character = worldCharacter.character;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  if (!character || deleted) {
    return null;
  }

  const isCharacterOwner = currentUserId === character.owner_id;
  const characterId = character.id;

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
    setDeleted(true);
  }

  return (
    <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center transition-colors hover:border-white/20 hover:bg-white/5">
      {isCharacterOwner && (
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
      )}

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

export function WorldCharactersTab({
  worldId,
  worldSlug,
  characters: initialCharacters,
  canAddCharacter,
  currentUserId,
}: {
  worldId: string;
  worldSlug: string;
  characters: WorldCharacter[];
  canAddCharacter: boolean;
  currentUserId: string | null;
}) {
  const [characters, setCharacters] = useState(initialCharacters);
  const [dialogOpen, setDialogOpen] = useState(false);

  const existingCharacterIds = new Set(
    characters
      .map((wc) => wc.character?.id)
      .filter((id): id is string => Boolean(id)),
  );

  return (
    <div>
      {canAddCharacter && (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            Add Character
          </button>
        </div>
      )}

      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <UserCircle2 className="h-10 w-10 text-zinc-600" />
          <p className="text-sm">No characters have been added to this world yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {characters.map((wc) => (
            <CharacterCard key={wc.id} worldCharacter={wc} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      {dialogOpen && (
        <AddCharacterDialog
          worldId={worldId}
          worldSlug={worldSlug}
          existingCharacterIds={existingCharacterIds}
          onImported={(worldCharacter) => {
            setCharacters((current) => [...current, worldCharacter]);
            setDialogOpen(false);
          }}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
