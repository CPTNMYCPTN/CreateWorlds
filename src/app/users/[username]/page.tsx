import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Globe, Lock, UserCircle2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const [{ data: characters }, { data: ownedWorldRows }, { data: memberWorldRows }] =
    await Promise.all([
      supabase
        .from("characters")
        .select("id, name, avatar_url")
        .eq("owner_id", profile.id)
        .order("created_at"),
      supabase
        .from("worlds")
        .select("id, name, slug, icon_url, is_public, description")
        .eq("owner_id", profile.id)
        .eq("is_public", true)
        .order("created_at"),
      supabase
        .from("world_members")
        .select("world:worlds!inner(id, name, slug, icon_url, is_public, owner_id, description)")
        .eq("user_id", profile.id),
    ]);

  const ownedWorlds = ownedWorldRows ?? [];
  const ownedWorldIds = new Set(ownedWorlds.map((w) => w.id));

  const memberWorlds = ((memberWorldRows ?? []) as unknown as {
    world: {
      id: string;
      name: string;
      slug: string;
      icon_url: string | null;
      is_public: boolean;
      owner_id: string;
      description: string;
    };
  }[])
    .map((row) => row.world)
    .filter((w) => w?.is_public && !ownedWorldIds.has(w.id));

  const allWorlds = [...ownedWorlds, ...memberWorlds];

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        {/* Header */}
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-white/10 bg-zinc-800 sm:h-28 sm:w-28">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt=""
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle2 className="h-full w-full text-zinc-600" />
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-semibold tracking-tight">
              {profile.display_name ?? profile.username}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">@{profile.username}</p>
            {profile.bio && (
              <p className="mt-3 max-w-lg text-sm text-zinc-300">{profile.bio}</p>
            )}
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-600">
              <CalendarDays className="h-3.5 w-3.5" />
              Member since {memberSince}
            </p>
          </div>
        </div>

        {/* Characters */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Characters</h2>

          {(characters ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No characters yet.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {(characters ?? []).map((character) => (
                <Link
                  key={character.id}
                  href={`/characters/${character.id}`}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center transition-colors hover:border-white/20 hover:bg-white/[0.04]"
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
                  <span className="line-clamp-2 text-sm font-medium text-zinc-200">
                    {character.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Worlds */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">Worlds</h2>

          {allWorlds.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">No public worlds yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {allWorlds.map((world) => (
                <Link
                  key={world.id}
                  href={`/worlds/${world.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
                    {world.icon_url ? (
                      <Image
                        src={world.icon_url}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Globe className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-100">{world.name}</p>
                    {world.description && (
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {world.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs text-zinc-600">
                    {world.is_public ? (
                      <Globe className="h-3.5 w-3.5" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" />
                    )}
                    {world.is_public ? "Public" : "Private"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
