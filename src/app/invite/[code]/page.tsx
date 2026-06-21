import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Globe, Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { joinWorldFromInvite } from "./actions";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code } = await params;
  const { error: queryError } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date().toISOString();
  const { data: invite, error } = await supabase
    .from("world_invites")
    .select(
      "id, code, expires_at, max_uses, uses, world:worlds(id, name, slug, description, is_public, banner_url, icon_url)",
    )
    .eq("code", code)
    .single();

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-50">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center">
          <h1 className="text-2xl font-semibold">Invalid invite</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This invite link is invalid or has expired.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const world = (invite.world as unknown as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    is_public: boolean;
    banner_url: string | null;
    icon_url: string | null;
  }) || {
    id: "",
    name: "",
    slug: "",
    description: null,
    is_public: false,
    banner_url: null,
    icon_url: null,
  };

  const isExpired = invite.expires_at && invite.expires_at <= now;
  const isMaxedOut = invite.max_uses !== null && invite.uses >= invite.max_uses;

  if (isExpired || isMaxedOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-50">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center">
          <h1 className="text-2xl font-semibold">Invite unavailable</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This invite link has expired or reached its usage limit.
          </p>
          <Link
            href={`/worlds/${world.slug}`}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            View world
          </Link>
        </div>
      </div>
    );
  }

  const isMember = user
    ? await supabase
        .from("world_members")
        .select("user_id")
        .eq("world_id", world.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (isMember.data) {
    redirect(`/worlds/${world.slug}`);
  }

  const joinWorld = joinWorldFromInvite.bind(null, code);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <Link
          href={user ? `/worlds/${world.slug}` : "/"}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {user ? "Back to world" : "Back home"}
        </Link>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
          {world.banner_url && (
            <div className="relative h-48 w-full">
              <Image
                src={world.banner_url}
                alt=""
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              {world.icon_url && (
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                  <Image
                    src={world.icon_url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-semibold">{world.name}</h1>
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
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 px-6 pb-6 pt-4">
            <p className="text-sm text-zinc-300">{world.description}</p>
            {queryError && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {queryError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <form action={joinWorld}>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
                  >
                    Join World
                  </button>
                </form>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/login?redirectTo=${encodeURIComponent(`/invite/${code}`)}`}
                    className="inline-flex items-center justify-center rounded-full bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
                  >
                    Log in
                  </Link>
                  <Link
                    href={`/signup?redirectTo=${encodeURIComponent(`/invite/${code}`)}`}
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-2.5 text-sm font-semibold text-zinc-100 transition-colors hover:bg-white/5"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
