import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { WikiSidebar } from "./wiki-sidebar";
import { logWikiError } from "./log-error";

export default async function WikiLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: world } = await supabase
    .from("worlds")
    .select("id, slug, owner_id")
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

  logWikiError("layout member role lookup failed", memberError);

  const canManage = isOwner || memberRow?.role === "admin";

  const { data: pages, error: pagesError } = await supabase
    .from("wiki_pages")
    .select("id, parent_page_id, slug, title, position")
    .eq("world_id", world.id)
    .order("position");

  logWikiError("layout wiki pages fetch failed", pagesError);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 py-6">
        <WikiSidebar worldSlug={world.slug} pages={pages ?? []} canManage={canManage} />
        <main className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
