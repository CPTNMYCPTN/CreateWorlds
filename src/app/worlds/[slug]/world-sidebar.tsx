"use client";

import { useEffect, useRef, useState } from "react";
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
import { createClient } from "@/utils/supabase/client";
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
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent)]/50"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-[var(--world-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
  selectedFolderId,
  newThreadIds,
  onSelectThread,
  onThreadCreated,
}: {
  folder: WorldFolder;
  worldId: string;
  worldSlug: string;
  isOwner: boolean;
  selectedThreadId: string | null;
  selectedFolderId: string | null;
  newThreadIds: Set<string>;
  onSelectThread: (thread: WorldThread) => void;
  onThreadCreated: (folderId: string, thread: WorldThread) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selectedFolderId === folder.id) {
      setOpen(true);
    }
  }, [folder.id, selectedFolderId]);

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
                    ? "bg-[var(--world-accent)]/15 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <span className="truncate">{thread.title}</span>
                {newThreadIds.has(thread.id) && (
                  <span className="shrink-0 rounded-full bg-[var(--world-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    New
                  </span>
                )}
                {thread.is_pinned && (
                  <Pin className="h-3 w-3 shrink-0 text-[var(--world-accent)]" />
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
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent)]/50"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-[var(--world-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
  selectedFolderId,
  onSelectThread,
}: {
  worldId: string;
  worldSlug: string;
  folders: WorldFolder[];
  isOwner: boolean;
  selectedThreadId: string | null;
  selectedFolderId: string | null;
  onSelectThread: (thread: WorldThread) => void;
}) {
  const [folders, setFolders] = useState(initialFolders);
  const [newThreadIds, setNewThreadIds] = useState<Set<string>>(new Set());
  const foldersRef = useRef(folders);

  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);

  useEffect(() => {
    const supabase = createClient();
    let threadsChannel: ReturnType<typeof supabase.channel> | null = null;
    let foldersChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function subscribe() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log(
        "[Realtime] session present:",
        !!session,
        session?.access_token?.slice(0, 20) ?? "none",
      );

      if (cancelled) return;

      if (session) {
        supabase.realtime.setAuth(session.access_token);
      }

      console.log(
        "[Realtime] world-threads: subscribing with filter",
        `world_id=eq.${worldId}`,
      );

      threadsChannel = supabase
        .channel(`world-threads:${worldId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "world_threads",
            filter: `world_id=eq.${worldId}`,
          },
          (payload) => {
            console.log("[Realtime] world_threads INSERT received", payload);
            const newThread = payload.new as {
              id: string;
              folder_id: string;
              title: string;
              is_pinned: boolean;
              is_locked: boolean;
            };

            const alreadyExists = foldersRef.current.some((folder) =>
              folder.threads.some((thread) => thread.id === newThread.id),
            );

            if (alreadyExists) {
              console.log("[Realtime] world_threads: skipping duplicate", newThread.id);
              return;
            }

            setFolders((current) =>
              current.map((folder) =>
                folder.id === newThread.folder_id
                  ? {
                      ...folder,
                      threads: [
                        ...folder.threads,
                        {
                          id: newThread.id,
                          folder_id: newThread.folder_id,
                          title: newThread.title,
                          is_pinned: newThread.is_pinned,
                          is_locked: newThread.is_locked,
                        },
                      ],
                    }
                  : folder,
              ),
            );

            setNewThreadIds((current) => new Set(current).add(newThread.id));
          },
        )
        .subscribe((status, err) => {
          console.log("[Realtime] world-threads channel status:", status, err ?? "");
        });

      console.log(
        "[Realtime] world-folders: subscribing with filter",
        `world_id=eq.${worldId}`,
      );

      foldersChannel = supabase
        .channel(`world-folders:${worldId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "world_folders",
            filter: `world_id=eq.${worldId}`,
          },
          (payload) => {
            console.log("[Realtime] world_folders INSERT fired — raw payload:", payload);
            const newFolder = payload.new as { id: string; name: string };

            const alreadyExists = foldersRef.current.some(
              (folder) => folder.id === newFolder.id,
            );

            if (alreadyExists) {
              console.log("[Realtime] world_folders: skipping duplicate", newFolder.id);
              return;
            }

            setFolders((current) => [
              ...current,
              { id: newFolder.id, name: newFolder.name, threads: [] },
            ]);
          },
        )
        .subscribe((status, err) => {
          console.log("[Realtime] world-folders channel status:", status, err ?? "");
        });
    }

    subscribe();

    return () => {
      cancelled = true;
      if (threadsChannel) supabase.removeChannel(threadsChannel);
      if (foldersChannel) supabase.removeChannel(foldersChannel);
    };
  }, [worldId]);

  function handleThreadCreated(folderId: string, thread: WorldThread) {
    setFolders((current) =>
      current.map((folder) =>
        folder.id === folderId
          ? { ...folder, threads: [...folder.threads, thread] }
          : folder,
      ),
    );
  }

  function handleSelectThread(thread: WorldThread) {
    if (newThreadIds.has(thread.id)) {
      setNewThreadIds((current) => {
        const next = new Set(current);
        next.delete(thread.id);
        return next;
      });
    }

    onSelectThread(thread);
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
              selectedFolderId={selectedFolderId}
              newThreadIds={newThreadIds}
              onSelectThread={handleSelectThread}
              onThreadCreated={handleThreadCreated}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
