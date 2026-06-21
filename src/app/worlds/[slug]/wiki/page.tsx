import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { logWikiError } from "./log-error";

export default async function WikiIndexPage({
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
    .select("id, owner_id")
    .eq("slug", slug)
    .single();

  if (!world) {
    notFound();
  }

  const isOwner = user?.id === world.owner_id;

  const { data: memberRow, error: memberError } = user
    ? await supabase
        .from("world_members")
        .select("role")
        .eq("world_id", world.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };

  logWikiError("index member role lookup failed", memberError);

  const canManage = isOwner || memberRow?.role === "admin";

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-zinc-500">
      <BookOpen className="h-10 w-10 text-zinc-600" />
      <p className="text-sm">Select a page from the sidebar to start reading.</p>
      {canManage && (
        <Link
          href={`/worlds/${slug}/wiki/new`}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--world-accent,#a78bfa)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create the first page
        </Link>
      )}
    </div>
  );
}
