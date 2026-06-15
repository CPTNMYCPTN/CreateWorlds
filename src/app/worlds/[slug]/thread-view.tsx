"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Lock, Pin, UserCircle2 } from "lucide-react";
import {
  createPost,
  getThreadPosts,
  type CreatePostState,
  type ThreadPost,
} from "./actions";

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
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <PostAuthorAvatar avatarUrl={post.author?.avatar_url} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-200">
            {post.author?.username ?? "Unknown"}
          </span>
          <span className="text-xs text-zinc-500">
            {new Date(post.created_at).toLocaleString()}
          </span>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">
          {post.content}
        </p>
      </div>
    </div>
  );
}

export function ThreadView({
  thread,
  worldId,
  worldSlug,
}: {
  thread: SelectedThread;
  worldId: string;
  worldSlug: string;
}) {
  const [posts, setPosts] = useState<ThreadPost[]>([]);
  const [postsThreadId, setPostsThreadId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loading = postsThreadId !== thread.id;

  useEffect(() => {
    let cancelled = false;

    getThreadPosts(thread.id).then((data) => {
      if (!cancelled) {
        setPosts(data);
        setPostsThreadId(thread.id);
      }
    });

    return () => {
      cancelled = true;
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
      setPosts((current) => [...current, result.post!]);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold tracking-tight">
          {thread.title}
        </h2>
        {thread.is_pinned && <Pin className="h-4 w-4 text-violet-400" />}
        {thread.is_locked && <Lock className="h-4 w-4 text-zinc-500" />}
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
        <label
          htmlFor="first-post"
          className="text-sm font-medium text-zinc-300"
        >
          {posts.length === 0 ? "Write the first post" : "Write a reply"}
        </label>
        <form action={handleSubmit}>
          <textarea
            id="first-post"
            name="content"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start the conversation..."
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
          />

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={pending || !content.trim()}
              className="inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
