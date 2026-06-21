"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { WikiEditor } from "./wiki-editor";
import { createWikiPage, updateWikiPage, type WikiPageFormState } from "./actions";
import type { WikiPageTreeItem } from "../types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const initialState: WikiPageFormState = { error: null };

export function WikiPageForm({
  worldId,
  worldSlug,
  pages,
  mode,
  page,
}: {
  worldId: string;
  worldSlug: string;
  pages: WikiPageTreeItem[];
  mode: "create" | "edit";
  page?: {
    id: string;
    slug: string;
    title: string;
    content: string;
    parent_page_id: string | null;
  };
}) {
  const router = useRouter();

  const [action] = useState(() =>
    mode === "edit" && page
      ? updateWikiPage.bind(null, page.id, worldId, worldSlug, page.slug)
      : createWikiPage.bind(null, worldId, worldSlug),
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  const [title, setTitle] = useState(page?.title ?? "");
  const [slug, setSlug] = useState(page?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [parentPageId, setParentPageId] = useState(page?.parent_page_id ?? "");
  const [content, setContent] = useState(page?.content ?? "");

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  const parentOptions = pages.filter((candidate) => candidate.id !== page?.id);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="content" value={content} />
      {mode === "edit" && <input type="hidden" name="slug" value={slug} />}

      <div>
        <label htmlFor="wiki-title" className="text-sm font-medium text-zinc-300">
          Title
        </label>
        <input
          id="wiki-title"
          name="title"
          required
          autoFocus
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Page title"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent,#a78bfa)]/50"
        />
      </div>

      <div>
        <label htmlFor="wiki-slug" className="text-sm font-medium text-zinc-300">
          Slug
        </label>
        <input
          id="wiki-slug"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          placeholder="page-title"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent,#a78bfa)]/50"
        />
        <p className="mt-1 text-xs text-zinc-500">
          The final slug is guaranteed unique within this world — a number is appended
          automatically if needed.
        </p>
      </div>

      <div>
        <label htmlFor="wiki-parent" className="text-sm font-medium text-zinc-300">
          Parent page
        </label>
        <select
          id="wiki-parent"
          name="parentPageId"
          value={parentPageId}
          onChange={(e) => setParentPageId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--world-accent,#a78bfa)]"
        >
          <option value="">None (top level)</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="text-sm font-medium text-zinc-300">Content</span>
        <div className="mt-2">
          <WikiEditor
            content={content}
            onChange={setContent}
            pages={pages}
            placeholder="Write the page content... type [[ to link another page"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-[var(--world-accent,#a78bfa)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving..." : mode === "edit" ? "Save changes" : "Create page"}
        </button>
      </div>
    </form>
  );
}
