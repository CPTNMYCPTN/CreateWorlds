"use client";

import { useState } from "react";
import { Globe, Lock } from "lucide-react";
import {
  updateWorldVisibility,
  type UpdateWorldVisibilityState,
} from "./actions";

const initialState: UpdateWorldVisibilityState = { error: null };

export function WorldVisibilityForm({
  worldId,
  worldSlug,
  isPublic,
}: {
  worldId: string;
  worldSlug: string;
  isPublic: boolean;
}) {
  const [visibility, setVisibility] = useState<"public" | "private">(
    isPublic ? "public" : "private",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setSuccess(false);

    const result = await updateWorldVisibility(
      worldId,
      worldSlug,
      initialState,
      formData,
    );

    setPending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setSuccess(true);
    }
  }

  return (
    <form action={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div>
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
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

        <div className="mt-3 space-y-2">
          <p className="text-sm text-zinc-300">
            {visibility === "public" ? (
              <>
                <span className="font-medium">Public</span> — anyone can view this
                world and everything inside it.
              </>
            ) : (
              <>
                <span className="font-medium">Private</span> — only you and invited
                members can access this world.
              </>
            )}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && !error && (
        <p className="text-sm text-emerald-400">Visibility settings saved.</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save visibility"}
        </button>
      </div>
    </form>
  );
}
