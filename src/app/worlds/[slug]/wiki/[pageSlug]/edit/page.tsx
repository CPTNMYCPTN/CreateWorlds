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

  const { data: pages, error: pagesError } = await supabase
    .from("wiki_pages")
    .select("id, parent_page_id, slug, title, position")
    .eq("world_id", world.id)
    .order("position");

  logWikiError("edit page wiki pages fetch failed", pagesError);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Edit page</h1>
      <div className="mt-6">
        <WikiPageForm
          worldId={world.id}
          worldSlug={slug}
          pages={pages ?? []}
          mode="edit"
          page={page}
        />
      </div>
    </div>
  );
}
