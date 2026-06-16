import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function EditProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <Link
          href={`/users/${profile.username}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          View profile
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Edit profile</h1>

        <ProfileForm
          username={profile.username}
          displayName={profile.display_name ?? null}
          bio={profile.bio ?? null}
          avatarUrl={profile.avatar_url ?? null}
          userId={user.id}
        />
      </main>
    </div>
  );
}
