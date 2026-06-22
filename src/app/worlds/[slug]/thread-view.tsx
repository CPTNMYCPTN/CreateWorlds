"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Pencil, Pin, Trash2, UserCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ActionMenu } from "@/components/action-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { WikiLinkTarget } from "@/components/wiki-link";
import type { ForumLinkTarget } from "@/components/forum-link";
import {
  createPost,
  deletePost,
  deleteThread,
  getThreadPosts,
  getWorldPostCharacters,
  renameThread,
  updatePost,
  type CreatePostState,
  type ThreadPost,
} from "./actions";
import { PostEditor } from "./post-editor";
import {
  renderWikiContent,
  type ForumFolderSummary,
  type ForumThreadSummary,
} from "./wiki/wiki-content";

export type SelectedThread = {
  id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
  author_id: string;
};

const initialPostState: CreatePostState = { error: null };

function PostAuthorAvatar({ avatarUrl }: { avatarUrl: string | null | undefined }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <UserCircle2 className="h-9 w-9 shrink-0 text-zinc-600" />
  );
}

function PostItem({
  post,
  canManage,
  worldSlug,
  wikiPages,
  forumThreads,
  forumFolders,
  forumItems,
  onUpdated,
  onDeleted,
}: {
  post: ThreadPost;
  canManage: boolean;
  worldSlug: string;
  wikiPages: WikiLinkTarget[];
  forumThreads: ForumThreadSummary[];
  forumFolders: ForumFolderSummary[];
  forumItems: ForumLinkTarget[];
  onUpdated: (postId: string, content: string) => void;
  onDeleted: (postId: string) => void;
}) {
  const displayCharacter = post.character;
  const displayAuthor = post.author;

  const resolvedContent = useMemo(
    () => renderWikiContent(post.content, wikiPages, worldSlug, forumThreads, forumFolders),
    [post.content, wikiPages, worldSlug, forumThreads, forumFolders],
  );

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editEmpty, setEditEmpty] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSaveEdit() {
    setEditPending(true);
    setEditError(null);
    const result = await updatePost(post.id, worldSlug, editContent);
    setEditPending(false);

    if (result.error) {
      setEditError(result.error);
      return;
    }

    setEditing(false);
    onUpdated(post.id, editContent);
  }

  async function handleDelete() {
    setDeletePending(true);
    setDeleteError(null);
    const result = await deletePost(post.id, worldSlug);
    setDeletePending(false);

    if (result.error) {
      setDeleteError(result.error);
      return;
    }

    setDeleteDialogOpen(false);
    onDeleted(post.id);
  }

  return (
    <div className="group flex gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <PostAuthorAvatar
        avatarUrl={displayCharacter?.avatar_url ?? displayAuthor?.avatar_url}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          {displayCharacter ? (
            <Link
              href={`/characters/${displayCharacter.id}`}
              className="text-sm font-semibold text-zinc-200 transition-colors hover:text-white"
            >
              {displayCharacter.name}
            </Link>
          ) : displayAuthor ? (
            <Link
              href={`/users/${displayAuthor.username}`}
              className="text-sm font-semibold text-zinc-200 transition-colors hover:text-white"
            >
              {displayAuthor.username}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-zinc-500">Unknown</span>
          )}
          {displayCharacter && displayAuthor ? (
            <span className="text-xs text-zinc-500">
              by @{displayAuthor.username}
            </span>
          ) : null}
          <span className="text-xs text-zinc-500">
            {new Date(post.created_at).toLocaleString()}
          </span>

          {canManage && !editing && (
            <div className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">
              <ActionMenu
                items={[
                  {
                    key: "edit",
                    label: "Edit",
                    icon: Pencil,
                    onSelect: () => {
                      setEditContent(post.content);
                      setEditError(null);
                      setEditing(true);
                    },
                  },
                  {
                    key: "delete",
                    label: "Delete",
                    icon: Trash2,
                    danger: true,
                    onSelect: () => setDeleteDialogOpen(true),
                  },
                ]}
              />
            </div>
          )}
        </div>

        {editing ? (
          <div className="mt-2">
            <PostEditor
              content={editContent}
              autoFocus
              onChange={setEditContent}
              onEmptyChange={setEditEmpty}
              wikiPages={wikiPages}
              forumItems={forumItems}
            />

            {editError && <p className="mt-2 text-sm text-red-400">{editError}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editPending || editEmpty}
                onClick={handleSaveEdit}
                className="inline-flex items-center justify-center rounded-full bg-[var(--world-accent)] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="tiptap-content mt-1"
            dangerouslySetInnerHTML={{ __html: resolvedContent }}
          />
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete post?"
        description="This permanently removes this post. This can't be undone."
        pending={deletePending}
        error={deleteError}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function ThreadView({
  thread,
  worldId,
  worldSlug,
  isOwner,
  currentUserId,
  onBack,
  onRenamed,
  onDeleted,
  wikiPages,
  threads,
  folders,
}: {
  thread: SelectedThread;
  worldId: string;
  worldSlug: string;
  isOwner: boolean;
  currentUserId: string | null;
  onBack: () => void;
  onRenamed: (title: string) => void;
  onDeleted: () => void;
  wikiPages?: WikiLinkTarget[];
  threads?: ForumThreadSummary[];
  folders?: ForumFolderSummary[];
}) {
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [postsThreadId, setPostsThreadId] = useState<string | null>(null);
  const callbacksRef = useRef({ onRenamed, onDeleted });

  useEffect(() => {
    callbacksRef.current = { onRenamed, onDeleted };
  }, [onRenamed, onDeleted]);
  const [content, setContent] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [characterOptions, setCharacterOptions] = useState<
    { id: string; name: string; avatar_url: string | null }[]
  >([]);
  const [isEmpty, setIsEmpty] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const resolvedWikiPages = useMemo(() => wikiPages ?? [], [wikiPages]);
  const resolvedThreads = useMemo(() => threads ?? [], [threads]);
  const resolvedFolders = useMemo(() => folders ?? [], [folders]);

  const forumItems = useMemo<ForumLinkTarget[]>(
    () => [
      ...resolvedFolders.map((f) => ({ id: f.id, label: f.name, type: "folder" as const })),
      ...resolvedThreads.map((t) => ({ id: t.id, label: t.title, type: "thread" as const })),
    ],
    [resolvedFolders, resolvedThreads],
  );

  const canManageThread = isOwner || currentUserId === thread.author_id;

  const [renamingThread, setRenamingThread] = useState(false);
  const [threadTitleInput, setThreadTitleInput] = useState(thread.title);
  const [renamePending, setRenamePending] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deleteThreadDialogOpen, setDeleteThreadDialogOpen] = useState(false);
  const [deleteThreadPending, setDeleteThreadPending] = useState(false);
  const [deleteThreadError, setDeleteThreadError] = useState<string | null>(null);

  const loading = postsThreadId !== thread.id;

  const [titleSyncKey, setTitleSyncKey] = useState(`${thread.id}:${thread.title}`);
  const nextTitleSyncKey = `${thread.id}:${thread.title}`;

  if (titleSyncKey !== nextTitleSyncKey) {
    setTitleSyncKey(nextTitleSyncKey);
    setThreadTitleInput(thread.title);
  }

  useEffect(() => {
    let cancelled = false;

    getThreadPosts(thread.id).then((data) => {
      if (!cancelled) {
        setPosts(data);
        setPostsThreadId(thread.id);
      }
    });

    getWorldPostCharacters(worldId).then((data) => {
      if (!cancelled) {
        setCharacterOptions(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [thread.id, worldId]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`world_posts:${thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "world_posts",
          filter: `thread_id=eq.${thread.id}`,
        },
        async (payload) => {
          const newPost = payload.new as {
            id: string;
            content: string;
            created_at: string;
            author_id: string;
            character_id: string | null;
          };

          const [{ data: author }, { data: character }] = await Promise.all([
            supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", newPost.author_id)
              .single(),
            newPost.character_id
              ? supabase
                  .from("characters")
                  .select("id, name, avatar_url")
                  .eq("id", newPost.character_id)
                  .single()
              : Promise.resolve({ data: null }),
          ]);

          setPosts((current) => {
            if (current.some((post) => post.id === newPost.id)) {
              return current;
            }

            return [
              ...current,
              {
                id: newPost.id,
                content: newPost.content,
                created_at: newPost.created_at,
                author_id: newPost.author_id,
                character_id: newPost.character_id,
                author: author ?? null,
                character: character ?? null,
              },
            ];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "world_posts",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; content: string };

          setPosts((current) =>
            current.map((post) =>
              post.id === updated.id ? { ...post, content: updated.content } : post,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "world_posts",
          filter: `thread_id=eq.${thread.id}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setPosts((current) => current.filter((post) => post.id !== deleted.id));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "world_threads",
          filter: `id=eq.${thread.id}`,
        },
        (payload) => {
          const updated = payload.new as { title: string };
          callbacksRef.current.onRenamed(updated.title);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "world_threads",
          filter: `id=eq.${thread.id}`,
        },
        () => {
          callbacksRef.current.onDeleted();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread.id]);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createPost(worldId, thread.id, worldSlug, initialPostState, formData);
    setPending(false);

    if (result.error || !result.post) {
      setError(result.error ?? "Something went wrong.");
    } else {
      setError(null);
      setContent("");
      setSelectedCharacterId("");
      setIsEmpty(true);
      setEditorKey((key) => key + 1);
      setPosts((current) => [...current, result.post!]);
    }
  }

  async function commitThreadRename() {
    const trimmed = threadTitleInput.trim();

    if (!trimmed || trimmed === thread.title) {
      setRenamingThread(false);
      setThreadTitleInput(thread.title);
      return;
    }

    setRenamePending(true);
    setRenameError(null);
    const result = await renameThread(thread.id, worldSlug, trimmed);
    setRenamePending(false);

    if (result.error) {
      setRenameError(result.error);
      return;
    }

    setRenamingThread(false);
    onRenamed(trimmed);
  }

  async function handleDeleteThread() {
    setDeleteThreadPending(true);
    setDeleteThreadError(null);
    const result = await deleteThread(thread.id, worldSlug);
    setDeleteThreadPending(false);

    if (result.error) {
      setDeleteThreadError(result.error);
      return;
    }

    setDeleteThreadDialogOpen(false);
    onDeleted();
  }

  function handlePostUpdated(postId: string, newContent: string) {
    setPosts((current) =>
      current.map((post) => (post.id === postId ? { ...post, content: newContent } : post)),
    );
  }

  function handlePostDeleted(postId: string) {
    setPosts((current) => current.filter((post) => post.id !== postId));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {renamingThread ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <input
              autoFocus
              value={threadTitleInput}
              onChange={(e) => setThreadTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitThreadRename();
                } else if (e.key === "Escape") {
                  setRenamingThread(false);
                  setThreadTitleInput(thread.title);
                }
              }}
              onBlur={commitThreadRename}
              disabled={renamePending}
              className="w-full max-w-sm rounded-lg border border-white/10 bg-zinc-950 px-3 py-1.5 text-lg font-semibold text-zinc-50 outline-none focus:border-[var(--world-accent)]/50"
            />
            {renameError && <p className="text-xs text-red-400">{renameError}</p>}
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-xl font-semibold tracking-tight">
              {thread.title}
            </h2>
            {thread.is_pinned && <Pin className="h-4 w-4 shrink-0 text-[var(--world-accent)]" />}
            {thread.is_locked && <Lock className="h-4 w-4 shrink-0 text-zinc-500" />}
          </div>
        )}

        {canManageThread && !renamingThread && (
          <ActionMenu
            items={[
              {
                key: "rename",
                label: "Rename",
                icon: Pencil,
                onSelect: () => setRenamingThread(true),
              },
              {
                key: "delete",
                label: "Delete",
                icon: Trash2,
                danger: true,
                onSelect: () => setDeleteThreadDialogOpen(true),
              },
            ]}
          />
        )}
      </div>

      <div className="mt-6 flex flex-1 flex-col gap-3">
        {loading ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            Loading posts...
          </p>
        ) : posts.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center text-zinc-500">
            <p className="text-sm">No posts yet</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostItem
              key={post.id}
              post={post}
              canManage={isOwner || currentUserId === post.author_id}
              worldSlug={worldSlug}
              wikiPages={resolvedWikiPages}
              forumThreads={resolvedThreads}
              forumFolders={resolvedFolders}
              forumItems={forumItems}
              onUpdated={handlePostUpdated}
              onDeleted={handlePostDeleted}
            />
          ))
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-zinc-300">
          {posts.length === 0 ? "Write the first post" : "Write a reply"}
        </p>
        <form action={handleSubmit}>
          <input type="hidden" name="content" value={content} />

          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <label htmlFor="characterId" className="text-sm text-zinc-300">
              Post as
            </label>
            <select
              id="characterId"
              name="characterId"
              value={selectedCharacterId}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue === "__create__") {
                  router.push(`/characters/create?world=${worldId}`);
                  return;
                }
                setSelectedCharacterId(nextValue);
              }}
              className="min-w-48 rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-[var(--world-accent)]"
            >
              <option value="">Yourself</option>
              {characterOptions.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
              <option value="__create__">+ Create a character</option>
            </select>
          </div>

          <div className="mt-2">
            <PostEditor
              key={editorKey}
              onChange={setContent}
              onEmptyChange={setIsEmpty}
              placeholder="Start the conversation..."
              wikiPages={resolvedWikiPages}
              forumItems={forumItems}
            />
          </div>

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={pending || isEmpty}
              className="inline-flex items-center justify-center rounded-full bg-[var(--world-accent)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={deleteThreadDialogOpen}
        onOpenChange={setDeleteThreadDialogOpen}
        title="Delete thread?"
        description={`This deletes "${thread.title}" and all of its posts. This can't be undone.`}
        pending={deleteThreadPending}
        error={deleteThreadError}
        onConfirm={handleDeleteThread}
      />
    </div>
  );
}
