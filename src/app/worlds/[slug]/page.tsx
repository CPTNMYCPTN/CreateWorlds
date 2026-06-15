import Image from "next/image";
import { notFound } from "next/navigation";
import { Globe, Lock, UserPlus, Users } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { WorldWorkspace } from "./world-workspace";
import type { WorldCharacter } from "./types";

export default async function WorldPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, name, slug, description, is_public, banner_url, icon_url, owner_id, map_url")
    .eq("slug", slug)
    .single();

  if (!world) {
    notFound();
  }

  const isOwner = user?.id === world.owner_id;

  const [
    { count: memberCount },
    { data: folders },
    { data: threads },
    { data: hotspots },
    { data: membership },
    { data: worldCharacters },
  ] = await Promise.all([
    supabase
      .from("world_members")
      .select("*", { count: "exact", head: true })
      .eq("world_id", world.id),
    supabase
      .from("world_folders")
      .select("id, name")
      .eq("world_id", world.id)
      .order("position"),
    supabase
      .from("world_threads")
      .select("id, folder_id, title, is_pinned, is_locked")
      .eq("world_id", world.id)
      .order("created_at"),
    world.map_url
      ? supabase
          .from("world_map_hotspots")
          .select("id, label, link_type, link_id, x_percent, y_percent")
          .eq("world_id", world.id)
          .eq("map_image_url", world.map_url)
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("world_members")
          .select("user_id")
          .eq("world_id", world.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("world_characters")
      .select("id, character:characters(id, name, avatar_url)")
      .eq("world_id", world.id)
      .order("created_at"),
  ]);

  const isMember = !!membership;

  const foldersWithThreads = (folders ?? []).map((folder) => ({
    ...folder,
    threads: (threads ?? []).filter((thread) => thread.folder_id === folder.id),
  }));

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/20 via-zinc-900 to-zinc-900 sm:h-64">
          {world.banner_url && (
            <Image
              src={world.banner_url}
              alt=""
              fill
              className="object-cover"
              priority
            />
          )}
        </div>

        <div className="-mt-10 flex flex-col items-start justify-between gap-4 px-2 pb-6 sm:flex-row sm:items-end">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-zinc-950 bg-zinc-800 shadow-lg sm:h-24 sm:w-24">
              {world.icon_url && (
                <Image
                  src={world.icon_url}
                  alt=""
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="pb-1 sm:pb-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {world.name}
              </h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  {world.is_public ? (
                    <>
                      <Globe className="h-3.5 w-3.5" /> Public
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Private
                    </>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {memberCount ?? 0} member{memberCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
          </div>

          {isOwner && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
            >
              <UserPlus className="h-4 w-4" />
              Invite
            </button>
          )}
        </div>
      </div>

      <WorldWorkspace
        worldId={world.id}
        worldSlug={world.slug}
        folders={foldersWithThreads}
        isOwner={isOwner}
        isMember={isMember}
        description={world.description}
        mapUrl={world.map_url}
        hotspots={hotspots ?? []}
        characters={(worldCharacters ?? []) as unknown as WorldCharacter[]}
      />
    </div>
  );
}
