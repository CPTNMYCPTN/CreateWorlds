import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, Lock, Settings, Users } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { WorldWorkspace } from "./world-workspace";
import { WorldInviteDialog } from "./world-invite-dialog";
import {
  DEFAULT_WORLD_THEME,
  FONT_FAMILY_VARS,
  type WorldCharacter,
  type WorldMember,
  type WorldSettings,
} from "./types";
import type { WikiLinkTarget } from "@/components/wiki-link";

const BANNER_STYLE_CLASSES: Record<string, string> = {
  solid: "bg-[var(--world-accent)]/10",
  gradient: "bg-gradient-to-br from-[var(--world-accent)]/20 via-zinc-900 to-zinc-900",
  transparent: "bg-zinc-900",
};

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
    .select(
      "id, name, slug, description, is_public, banner_url, icon_url, owner_id, map_url, settings",
    )
    .eq("slug", slug)
    .single();

  if (!world) {
    notFound();
  }

  const isOwner = user?.id === world.owner_id;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const theme = {
    ...DEFAULT_WORLD_THEME,
    ...(world.settings as WorldSettings | null)?.theme,
  };

  const customCss = theme.customCss.replace(/<\/style/gi, "");

  const [
    { count: memberCount },
    { data: memberRows },
    { data: folders },
    { data: threads },
    { data: hotspots },
    { data: membership },
    { data: worldCharacters },
    { data: profile },
    { data: invites },
    { data: wikiPages },
  ] = await Promise.all([
    supabase
      .from("world_members")
      .select("*", { count: "exact", head: true })
      .eq("world_id", world.id),
    supabase
      .from("world_members")
      .select("id, user_id, role, created_at")
      .eq("world_id", world.id)
      .order("created_at"),
    supabase
      .from("world_folders")
      .select("id, name")
      .eq("world_id", world.id)
      .order("position"),
    supabase
      .from("world_threads")
      .select("id, folder_id, title, is_pinned, is_locked, author_id")
      .eq("world_id", world.id)
      .order("created_at"),
    world.map_url
      ? supabase
          .from("world_map_hotspots")
          .select(
            `id, label, x_percent, y_percent, links:world_hotspot_links(id, link_type, link_id, label)`
          )
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
      .select(
        "id, character:characters!world_characters_character_id_fkey(id, name, avatar_url, owner_id)",
      )
      .eq("world_id", world.id)
      .order("created_at"),
    user
      ? supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("world_invites")
      .select("id, code, created_at, expires_at, max_uses, uses")
      .eq("world_id", world.id)
      .order("created_at", { ascending: false }),
    supabase.from("wiki_pages").select("id, slug, title").eq("world_id", world.id),
  ]);

  const isMember = !!membership;

  const currentMemberRow = memberRows?.find((m) => m.user_id === user?.id) ?? null;
  const isAdmin = currentMemberRow?.role === "admin";

  const memberUserIds = Array.from(
    new Set((memberRows ?? []).map((m) => m.user_id)),
  );

  const { data: memberProfiles } =
    memberUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", memberUserIds)
      : { data: [] };

  const memberProfileMap = new Map(
    (memberProfiles ?? []).map((profileRow) => [profileRow.id, profileRow]),
  );

  const members: WorldMember[] = (memberRows ?? [])
    .map((member) => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role as WorldMember["role"],
      created_at: member.created_at,
      username: memberProfileMap.get(member.user_id)?.username ?? "Unknown",
      display_name: memberProfileMap.get(member.user_id)?.display_name ?? null,
      avatar_url: memberProfileMap.get(member.user_id)?.avatar_url ?? null,
    }))
    .sort((a, b) => {
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const hotspotThreadIds = Array.from(
    new Set(
      (hotspots ?? []).flatMap((hotspot) =>
        (hotspot.links ?? [])
          .filter((link) => link.link_type === "thread")
          .map((link) => link.link_id),
      ),
    ),
  );

  const { data: hotspotThreadPosts } =
    hotspotThreadIds.length > 0
      ? await supabase
          .from("world_posts")
          .select("thread_id, content, created_at")
          .in("thread_id", hotspotThreadIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const threadSnippets: Record<string, string> = {};
  for (const post of hotspotThreadPosts ?? []) {
    if (!(post.thread_id in threadSnippets)) {
      threadSnippets[post.thread_id] = post.content;
    }
  }

  const currentUser = user
    ? {
        id: user.id,
        username: profile?.username ?? "Anonymous",
        displayName: profile?.display_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      }
    : null;

  const foldersWithThreads = (folders ?? []).map((folder) => ({
    ...folder,
    threads: (threads ?? []).filter((thread) => thread.folder_id === folder.id),
  }));

  return (
    <div className="world-page flex min-h-screen flex-col bg-[var(--world-bg)] text-zinc-50">
      <style
        dangerouslySetInnerHTML={{
          __html: `.world-page {
  --world-accent: ${theme.accentColor};
  --world-bg: ${theme.bgColor};
  --world-font: ${FONT_FAMILY_VARS[theme.fontFamily]};
}
${customCss}`,
        }}
      />

      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div
          className={`relative h-48 w-full overflow-hidden rounded-2xl border border-white/10 sm:h-64 ${
            BANNER_STYLE_CLASSES[theme.headerStyle] ?? BANNER_STYLE_CLASSES.gradient
          }`}
        >
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

        <div className="relative z-10 -mt-12 flex flex-col items-start justify-between gap-4 px-2 pb-8 pt-6 sm:flex-row sm:items-end sm:pt-8">
          <div className="flex items-end gap-4">
            <div className="relative z-10 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-zinc-950 bg-zinc-800 shadow-lg sm:h-24 sm:w-24">
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
            <div className="flex items-center gap-2">
              <WorldInviteDialog
                worldId={world.id}
                worldSlug={world.slug}
                invites={invites ?? []}
                siteUrl={siteUrl}
              />
              <Link
                href={`/worlds/${world.slug}/settings`}
                aria-label="World settings"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] p-2.5 text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <WorldWorkspace
        worldId={world.id}
        worldSlug={world.slug}
        folders={foldersWithThreads}
        isOwner={isOwner}
        isAdmin={isAdmin}
        isMember={isMember}
        description={world.description}
        mapUrl={world.map_url}
        hotspots={hotspots ?? []}
        threadSnippets={threadSnippets}
        characters={(worldCharacters ?? []) as unknown as WorldCharacter[]}
        members={members}
        currentUser={currentUser}
        wikiPages={(wikiPages ?? []) as WikiLinkTarget[]}
      />
    </div>
  );
}
