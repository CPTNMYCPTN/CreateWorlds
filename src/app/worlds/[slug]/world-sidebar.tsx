"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Lock,
  MessageSquare,
  Pin,
  Plus,
  X,
} from "lucide-react";
import { createFolder, createThread, type CreateFolderState, type CreateThreadState } from "./actions";
import type { WorldFolder, WorldThread } from "./types";

const initialFolderState: CreateFolderState = { error: null };
const initialThreadState: CreateThreadState = { error: null };

function AddThreadDialog({
  worldId,
  worldSlug,
  folderId,
  onThreadCreated,
}: {
  worldId: string;
  worldSlug: string;
  folderId: string;
  onThreadCreated: (thread: WorldThread) => void;
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createThread(worldId, folderId, worldSlug, initialThreadState, formData);
    setPending(false);

    if (result.error || !result.thread) {
      setError(result.error ?? "Something went wrong.");
    } else {
      setError(null);
      setOpenDialog(false);
      onThreadCreated(result.thread);
    }
  }

  return (
    <Dialog.Root open={openDialog} onOpenChange={setOpenDialog}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 pl-9 text-left text-xs font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          Add Thread
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-zinc-50">
              New thread
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

          <form action={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div>
              <label
                htmlFor="thread-title"
                className="text-sm font-medium text-zinc-300"
              >
                Thread title
              </label>
              <input
                id="thread-title"
                name="title"
                required
                autoFocus
                placeholder="A new beginning"
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Creating..." : "Create thread"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FolderItem({
  folder,
  worldId,
  worldSlug,
  isOwner,
  selectedThreadId,
  onSelectThread,
  onThreadCreated,
}: {
  folder: WorldFolder;
  worldId: string;
  worldSlug: string;
  isOwner: boolean;
  selectedThreadId: string | null;
  onSelectThread: (thread: WorldThread) => void;
  onThreadCreated: (folderId: string, thread: WorldThread) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        )}
        <Folder className="h-4 w-4 shrink-0 text-zinc-500" />
        <span className="truncate">{folder.name}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-0.5">
          {folder.threads.length === 0 ? (
            <p className="px-2 py-1.5 pl-9 text-xs text-zinc-500">
              No threads yet
            </p>
          ) : (
            folder.threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 pl-9 text-left text-sm transition-colors ${
                  selectedThreadId === thread.id
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span className="truncate">{thread.title}</span>
                {thread.is_pinned && (
                  <Pin className="h-3 w-3 shrink-0 text-violet-400" />
                )}
                {thread.is_locked && (
                  <Lock className="h-3 w-3 shrink-0 text-zinc-500" />
                )}
              </button>
            ))
          )}

          {isOwner && (
            <AddThreadDialog
              worldId={worldId}
              worldSlug={worldSlug}
              folderId={folder.id}
              onThreadCreated={(thread) => onThreadCreated(folder.id, thread)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AddFolderDialog({
  worldId,
  worldSlug,
  onFolderCreated,
}: {
  worldId: string;
  worldSlug: string;
  onFolderCreated: (folder: WorldFolder) => void;
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createFolder(worldId, worldSlug, initialFolderState, formData);
    setPending(false);

    if (result.error || !result.folder) {
      setError(result.error ?? "Something went wrong.");
    } else {
      setError(null);
      setOpenDialog(false);
      onFolderCreated({ ...result.folder, threads: [] });
    }
  }

  return (
    <Dialog.Root open={openDialog} onOpenChange={setOpenDialog}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
        >
          <FolderPlus className="h-4 w-4" />
          Add Folder
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-zinc-50">
              New folder
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

          <form action={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div>
              <label
                htmlFor="folder-name"
                className="text-sm font-medium text-zinc-300"
              >
                Folder name
              </label>
              <input
                id="folder-name"
                name="name"
                required
                autoFocus
                placeholder="Characters"
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Creating..." : "Create folder"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function WorldSidebar({
  worldId,
  worldSlug,
  folders: initialFolders,
  isOwner,
  selectedThreadId,
  onSelectThread,
}: {
  worldId: string;
  worldSlug: string;
  folders: WorldFolder[];
  isOwner: boolean;
  selectedThreadId: string | null;
  onSelectThread: (thread: WorldThread) => void;
}) {
  const [folders, setFolders] = useState(initialFolders);

  function handleThreadCreated(folderId: string, thread: WorldThread) {
    setFolders((current) =>
      current.map((folder) =>
        folder.id === folderId
          ? { ...folder, threads: [...folder.threads, thread] }
          : folder,
      ),
    );
  }

  return (
    <aside className="w-64 shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {isOwner && (
        <div className="mb-3">
          <AddFolderDialog
            worldId={worldId}
            worldSlug={worldSlug}
            onFolderCreated={(folder) =>
              setFolders((current) => [...current, folder])
            }
          />
        </div>
      )}

      {folders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
          <Folder className="h-6 w-6 text-zinc-600" />
          <p className="text-sm text-zinc-500">No folders yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              worldId={worldId}
              worldSlug={worldSlug}
              isOwner={isOwner}
              selectedThreadId={selectedThreadId}
              onSelectThread={onSelectThread}
              onThreadCreated={handleThreadCreated}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
