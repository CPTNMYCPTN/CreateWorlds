"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import { Upload, UserCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { updateProfile, type UpdateProfileState } from "./actions";

const initialState: UpdateProfileState = { error: null, success: false };

export function ProfileForm({
  username,
  displayName,
  bio,
  avatarUrl: initialAvatarUrl,
  userId,
}: {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  userId: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("profile-avatars")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }

    const newUrl = supabase.storage.from("profile-avatars").getPublicUrl(path).data.publicUrl;
    setAvatarUrl(newUrl);
    setUploading(false);
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-8">
      <input type="hidden" name="avatar_url" value={avatarUrl ?? ""} />

      <section>
        <h2 className="text-lg font-semibold text-zinc-100">Avatar</h2>
        <div className="mt-4 flex items-center gap-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle2 className="h-full w-full text-zinc-600" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload photo"}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={handleAvatarChange}
              />
            </label>
            {uploadError && (
              <p className="text-xs text-red-400">{uploadError}</p>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold text-zinc-100">Info</h2>

        <div>
          <label htmlFor="username" className="text-sm font-medium text-zinc-300">
            Username
          </label>
          <input
            id="username"
            value={username}
            readOnly
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-500 outline-none"
          />
          <p className="mt-1.5 text-xs text-zinc-600">
            Usernames can&apos;t be changed for now.
          </p>
        </div>

        <div>
          <label htmlFor="display_name" className="text-sm font-medium text-zinc-300">
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            defaultValue={displayName ?? ""}
            placeholder={username}
            maxLength={64}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
          />
        </div>

        <div>
          <label htmlFor="bio" className="text-sm font-medium text-zinc-300">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            defaultValue={bio ?? ""}
            placeholder="Tell the world a little about yourself..."
            maxLength={300}
            rows={4}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-violet-500/50"
          />
        </div>
      </section>

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-emerald-400">Profile updated.</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
