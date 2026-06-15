"use client";

import { useActionState, useState } from "react";
import { Globe, ImagePlus, Lock, Upload } from "lucide-react";
import { createWorld, type CreateWorldState } from "./actions";

const initialState: CreateWorldState = { error: null };

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function WorldForm() {
  const [state, formAction, pending] = useActionState(
    createWorld,
    initialState,
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">(
    "private",
  );
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(slugify(value));
  }

  function handleImageChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string | null) => void,
  ) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-8">
      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div>
        <span className="text-sm font-medium text-zinc-300">
          Banner image
        </span>
        <label
          htmlFor="banner"
          className="mt-2 flex h-40 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] bg-cover bg-center transition-colors hover:border-white/20"
          style={
            bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : undefined
          }
        >
          {!bannerPreview && (
            <div className="flex flex-col items-center gap-2 text-zinc-500">
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm">Click to upload a banner image</span>
            </div>
          )}
        </label>
        <input
          id="banner"
          name="banner"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleImageChange(e, setBannerPreview)}
        />
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1">
          <label
            htmlFor="name"
            className="text-sm font-medium text-zinc-300"
          >
            World name
          </label>
          <input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="The Shattered Reaches"
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
          />

          <label
            htmlFor="slug"
            className="mt-4 block text-sm font-medium text-zinc-300"
          >
            Slug
          </label>
          <div className="mt-2 flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm focus-within:border-violet-400/50">
            <span className="whitespace-nowrap text-zinc-500">
              createworlds.com/worlds/
            </span>
            <input
              id="slug"
              name="slug"
              required
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="your-slug"
              className="flex-1 bg-transparent text-zinc-50 outline-none placeholder:text-zinc-500"
            />
          </div>
        </div>

        <div>
          <span className="text-sm font-medium text-zinc-300">Icon</span>
          <label
            htmlFor="icon"
            className="mt-2 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] bg-cover bg-center transition-colors hover:border-white/20"
            style={
              iconPreview ? { backgroundImage: `url(${iconPreview})` } : undefined
            }
          >
            {!iconPreview && <Upload className="h-5 w-5 text-zinc-500" />}
          </label>
          <input
            id="icon"
            name="icon"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleImageChange(e, setIconPreview)}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="description"
          className="text-sm font-medium text-zinc-300"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="What is this world about?"
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
        />
      </div>

      <div>
        <span className="text-sm font-medium text-zinc-300">Visibility</span>
        <div className="mt-2 inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setVisibility("private")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              visibility === "private"
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Lock className="h-4 w-4" />
            Private
          </button>
          <button
            type="button"
            onClick={() => setVisibility("public")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              visibility === "public"
                ? "bg-white/10 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Globe className="h-4 w-4" />
            Public
          </button>
        </div>
        <input type="hidden" name="visibility" value={visibility} />
        <p className="mt-2 text-xs text-zinc-500">
          {visibility === "public"
            ? "Anyone can view this world."
            : "Only you and invited members can view this world."}
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center self-start rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Creating world..." : "Create World"}
      </button>
    </form>
  );
}
