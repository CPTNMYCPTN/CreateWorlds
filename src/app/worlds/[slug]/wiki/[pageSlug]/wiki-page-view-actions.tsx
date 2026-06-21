"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteWikiPage } from "../actions";

export function WikiPageViewActions({
  worldId,
  worldSlug,
  pageId,
  pageSlug,
  pageTitle,
  parentSlug,
  childCount,
}: {
  worldId: string;
  worldSlug: string;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  parentSlug: string | null;
  childCount: number;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setPending(true);
    setError(null);

    const result = await deleteWikiPage(pageId, worldId, worldSlug);

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDialogOpen(false);
    router.push(
      parentSlug ? `/worlds/${worldSlug}/wiki/${parentSlug}` : `/worlds/${worldSlug}/wiki`,
    );
  }

  return (
    <>
      <ActionMenu
        items={[
          {
            key: "edit",
            label: "Edit",
            icon: Pencil,
            onSelect: () => router.push(`/worlds/${worldSlug}/wiki/${pageSlug}/edit`),
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

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Delete this page?"
        description={
          childCount > 0
            ? `This permanently deletes "${pageTitle}". ${childCount} child page${childCount === 1 ? "" : "s"} will move to the top level. This can't be undone.`
            : `This permanently deletes "${pageTitle}". This can't be undone.`
        }
        pending={pending}
        error={error}
        onConfirm={handleDelete}
      />
    </>
  );
}
