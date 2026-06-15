import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Globe2,
  LayoutTemplate,
  MessageSquare,
  Plus,
  UserCircle2,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";

type WorldCard = {
  id: string;
  name: string;
  slug: string;
  banner_url: string | null;
  icon_url: string | null;
  memberCount: number;
};

type WorldSummary = {
  id: string;
  name: string;
  slug: string;
  banner_url: string | null;
  icon_url: string | null;
};

type NotificationRow = {
  id: string;
  created_at: string;
  thread: {
    id: string;
    title: string;
    world: { id: string; name: string; slug: string } | null;
  } | null;
  author: { username: string } | null;
};

type CharacterWorldRow = {
  character_id: string;
  world: { id: string; name: string; slug: string } | null;
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: characters } = user
    ? await supabase
        .from("characters")
        .select("id, name, avatar_url")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
    : { data: null };

  let worlds: WorldCard[] = [];
  let notifications: NotificationRow[] = [];
  const characterWorlds = new Map<string, { id: string; name: string; slug: string }[]>();

  if (user) {
    const [{ data: ownedWorlds }, { data: memberRows }] = await Promise.all([
      supabase
        .from("worlds")
        .select("id, name, slug, banner_url, icon_url")
        .eq("owner_id", user.id),
      supabase
        .from("world_members")
        .select("world:worlds(id, name, slug, banner_url, icon_url)")
        .eq("user_id", user.id),
    ]);

    const worldMap = new Map<string, WorldSummary>();
    for (const world of ownedWorlds ?? []) {
      worldMap.set(world.id, world);
    }
    for (const row of (memberRows ?? []) as unknown as { world: WorldSummary | null }[]) {
      if (row.world) worldMap.set(row.world.id, row.world);
    }

    const worldIds = [...worldMap.keys()];

    const { data: memberCountRows } =
      worldIds.length > 0
        ? await supabase.from("world_members").select("world_id").in("world_id", worldIds)
        : { data: [] };

    const memberCounts = new Map<string, number>();
    for (const row of memberCountRows ?? []) {
      memberCounts.set(row.world_id, (memberCounts.get(row.world_id) ?? 0) + 1);
    }

    worlds = worldIds.map((id) => {
      const world = worldMap.get(id)!;
      return { ...world, memberCount: memberCounts.get(id) ?? 0 };
    });

    const { data: myThreadPosts } = await supabase
      .from("world_posts")
      .select("thread_id")
      .eq("author_id", user.id);

    const threadIds = [...new Set((myThreadPosts ?? []).map((p) => p.thread_id))];

    const { data: notificationRows } =
      threadIds.length > 0
        ? await supabase
            .from("world_posts")
            .select(
              "id, created_at, thread:world_threads(id, title, world:worlds(id, name, slug)), author:profiles(username)",
            )
            .in("thread_id", threadIds)
            .neq("author_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10)
        : { data: [] };

    notifications = (notificationRows ?? []) as unknown as NotificationRow[];

    const characterIds = (characters ?? []).map((c) => c.id);

    const { data: worldCharacterRows } =
      characterIds.length > 0
        ? await supabase
            .from("world_characters")
            .select("character_id, world:worlds(id, name, slug)")
            .in("character_id", characterIds)
        : { data: [] };

    for (const row of (worldCharacterRows ?? []) as unknown as CharacterWorldRow[]) {
      if (!row.world) continue;
      const existing = characterWorlds.get(row.character_id) ?? [];
      existing.push(row.world);
      characterWorlds.set(row.character_id, existing);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-6 py-12">
        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                My Worlds
              </h1>
              <p className="mt-2 text-zinc-400">
                The worlds you&apos;ve built — pick one up where you left off,
                or start something new.
              </p>
            </div>
            <Link
              href="/worlds/create"
              className="inline-flex items-center gap-2 self-start rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400 sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Create a World
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {worlds.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center sm:col-span-2 lg:col-span-3">
                <Globe2 className="h-10 w-10 text-zinc-600" />
                <h2 className="text-lg font-medium text-zinc-200">
                  No worlds yet
                </h2>
                <p className="max-w-sm text-sm text-zinc-500">
                  Create your first world to start writing characters, places,
                  and stories.
                </p>
                <Link
                  href="/worlds/create"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
                >
                  <Plus className="h-4 w-4" />
                  Create a World
                </Link>
              </div>
            ) : (
              worlds.map((world) => (
                <Link
                  key={world.id}
                  href={`/worlds/${world.slug}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/20"
                >
                  <div className="relative h-24 w-full bg-gradient-to-br from-violet-500/20 via-zinc-900 to-zinc-900">
                    {world.banner_url && (
                      <Image
                        src={world.banner_url}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-zinc-950 bg-zinc-800 shadow">
                      {world.icon_url && (
                        <Image
                          src={world.icon_url}
                          alt=""
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-100 transition-colors group-hover:text-white">
                        {world.name}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-zinc-500">
                        <Users className="h-3 w-3" />
                        {world.memberCount} member
                        {world.memberCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Notifications
            </h2>
            <p className="mt-2 text-zinc-400">
              Recent replies to threads you&apos;ve posted in.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
                <Bell className="h-10 w-10 text-zinc-600" />
                <h3 className="text-lg font-medium text-zinc-200">
                  No notifications yet
                </h3>
                <p className="max-w-sm text-sm text-zinc-500">
                  When someone replies to a thread you&apos;ve posted in,
                  it&apos;ll show up here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={
                    notification.thread?.world
                      ? `/worlds/${notification.thread.world.slug}`
                      : "#"
                  }
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-200">
                      <span className="font-medium text-zinc-100">
                        {notification.author?.username ?? "Someone"}
                      </span>{" "}
                      replied in{" "}
                      <span className="font-medium text-zinc-100">
                        {notification.thread?.title ?? "a thread"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {notification.thread?.world?.name ?? "Unknown world"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                My Characters
              </h2>
              <p className="mt-2 text-zinc-400">
                Characters you&apos;ve created, ready to bring into any world.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Link
                href="/characters/templates/create"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
              >
                <LayoutTemplate className="h-4 w-4" />
                New Template
              </Link>
              <Link
                href="/characters/create"
                className="inline-flex items-center gap-2 rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400"
              >
                <Plus className="h-4 w-4" />
                Create a Character
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {!characters || characters.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center sm:col-span-2 lg:col-span-4">
                <UserCircle2 className="h-10 w-10 text-zinc-600" />
                <h3 className="text-lg font-medium text-zinc-200">
                  No characters yet
                </h3>
                <p className="max-w-sm text-sm text-zinc-500">
                  Create a character template to define reusable fields, then
                  bring your first character to life.
                </p>
                <Link
                  href="/characters/create"
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
                >
                  <Plus className="h-4 w-4" />
                  Create a Character
                </Link>
              </div>
            ) : (
              characters.map((character) => {
                const importedWorlds = characterWorlds.get(character.id) ?? [];

                return (
                  <div
                    key={character.id}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
                      {character.avatar_url ? (
                        <Image
                          src={character.avatar_url}
                          alt=""
                          width={64}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircle2 className="h-full w-full text-zinc-600" />
                      )}
                    </div>
                    <span className="truncate text-sm font-medium text-zinc-200">
                      {character.name}
                    </span>
                    {importedWorlds.length === 0 ? (
                      <span className="text-xs text-zinc-500">
                        Not in any worlds yet
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {importedWorlds.map((world) => (
                          <Link
                            key={world.id}
                            href={`/worlds/${world.slug}`}
                            className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                          >
                            {world.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
