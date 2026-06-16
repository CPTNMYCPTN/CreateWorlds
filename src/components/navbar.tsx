import Link from "next/link";
import { Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { UserMenu } from "./user-menu";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-50"
        >
          <Sparkles className="h-5 w-5 text-violet-400" />
          CreateWorlds
        </Link>

        {user && profile ? (
          <UserMenu username={profile.username} avatarUrl={profile.avatar_url ?? null} />
        ) : user ? null : (
          <div className="flex items-center gap-3 text-sm font-medium">
            <Link
              href="/login"
              className="text-zinc-300 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-white px-4 py-2 text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
