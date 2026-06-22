import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { getAcceptedFriends, getPendingIncomingRequests, getSentFriendRequests } from "./actions";
import { FriendsLists } from "./friends-lists";

export default async function FriendsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [pending, sent, friends] = await Promise.all([
    getPendingIncomingRequests(user.id),
    getSentFriendRequests(user.id),
    getAcceptedFriends(user.id),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Friends</h1>

        <div className="mt-8">
          <FriendsLists initialPending={pending} initialSent={sent} initialFriends={friends} />
        </div>
      </main>
    </div>
  );
}
