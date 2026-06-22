import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { WikiPageForm } from "../../wiki-page-form";
import { logWikiError } from "../../log-error";

export default async function EditWikiPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
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

  if (!user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(`/worlds/${slug}/wiki/${pageSlug}/edit`)}`,
    );
  }

  const isOwner = user.id === world.owner_id;

  const { data: memberRow, error: memberError } = await supabase
    .from("world_members")
    .select("role")
    .eq("world_id", world.id)
    .eq("user_id", user.id)
    .maybeSingle();

  logWikiError("edit page member role lookup failed", memberError);

  const canManage = isOwner || memberRow?.role === "admin";

  if (!canManage) {
    redirect(`/worlds/${slug}/wiki/${pageSlug}`);
  }

  const { data: page, error: pageError } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, content, parent_page_id")
    .eq("world_id", world.id)
    .eq("slug", pageSlug)
    .maybeSingle();

  logWikiError("edit page lookup failed", pageError);

  if (!page) {
    notFound();
  }

  const [
    { data: pages, error: pagesError },
    { data: threads, error: threadsError },
    { data: folders, error: foldersError },
  ] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("id, parent_page_id, slug, title, position")
      .eq("world_id", world.id)
      .order("position"),
    supabase.from("world_threads").select("id, title").eq("world_id", world.id),
    supabase.from("world_folders").select("id, name").eq("world_id", world.id),
  ]);

  logWikiError("edit page wiki pages fetch failed", pagesError);
  logWikiError("edit page world threads fetch failed", threadsError);
  logWikiError("edit page world folders fetch failed", foldersError);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Edit page</h1>
      <div className="mt-6">
        <WikiPageForm
          worldId={world.id}
          worldSlug={slug}
          pages={pages ?? []}
          threads={threads ?? []}
          folders={folders ?? []}
          mode="edit"
          page={page}
        />
      </div>
    </div>
  );
}
