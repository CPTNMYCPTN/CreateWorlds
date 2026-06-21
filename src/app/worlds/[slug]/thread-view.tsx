"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Pin, UserCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  createPost,
  getThreadPosts,
  getWorldPostCharacters,
  type CreatePostState,
  type ThreadPost,
} from "./actions";
import { PostEditor } from "./post-editor";

export type SelectedThread = {
  id: string;
  title: string;
  is_pinned: boolean;
  is_locked: boolean;
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

function PostItem({ post }: { post: ThreadPost }) {
  const displayCharacter = post.character;
  const displayAuthor = post.author;

  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
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
        </div>
        <div
          className="tiptap-content mt-1"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </div>
  );
}

export function ThreadView({
  thread,
  worldId,
  worldSlug,
  onBack,
}: {
  thread: SelectedThread;
  worldId: string;
  worldSlug: string;
  onBack: () => void;
}) {
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [postsThreadId, setPostsThreadId] = useState<string | null>(null);
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

  const loading = postsThreadId !== thread.id;

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
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">
            {thread.title}
          </h2>
          {thread.is_pinned && <Pin className="h-4 w-4 text-[var(--world-accent)]" />}
          {thread.is_locked && <Lock className="h-4 w-4 text-zinc-500" />}
        </div>
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
          posts.map((post) => <PostItem key={post.id} post={post} />)
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
    </div>
  );
}
