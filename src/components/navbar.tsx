import Link from "next/link";
import { Sparkles, UserCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getPendingIncomingCount } from "@/app/friends/actions";
import { ChatToggleButton } from "./chat/chat-toggle-button";
import { UserMenu } from "./user-menu";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, pendingFriendRequestCount] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user ? getPendingIncomingCount(user.id) : Promise.resolve(0),
  ]);

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
          <div className="flex items-center gap-3">
            <Link
              href="/friends"
              aria-label="Friends"
              className="relative rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <UserCheck className="h-5 w-5" />
              {pendingFriendRequestCount > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--world-accent,#a78bfa)] ring-2 ring-zinc-950" />
              )}
            </Link>
            <ChatToggleButton loggedIn />
            <UserMenu
              username={profile.username}
              displayName={profile.display_name ?? null}
              avatarUrl={profile.avatar_url ?? null}
            />
          </div>
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
