import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { renderWikiContent } from "../wiki-content";
import { logWikiError } from "../log-error";
import { WikiPageViewActions } from "./wiki-page-view-actions";

type ParentLink = {
  id: string;
  slug: string;
  title: string;
  parent_page_id: string | null;
};

export default async function WikiPageView({
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

  const { data: page, error: pageError } = await supabase
    .from("wiki_pages")
    .select(
      "id, world_id, parent_page_id, slug, title, content, created_by, created_at, updated_at, parent:wiki_pages!wiki_pages_parent_page_id_fkey(id, slug, title, parent_page_id)",
    )
    .eq("world_id", world.id)
    .eq("slug", pageSlug)
    .maybeSingle();

  logWikiError("page view lookup failed", pageError);

  if (!page) {
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

  logWikiError("page view member role lookup failed", memberError);

  const canManage = isOwner || memberRow?.role === "admin";

  // Walk the parent chain for the breadcrumb. Bounded to avoid a runaway
  // loop if a cycle were ever introduced directly against the DB.
  const rawParent = page.parent as unknown as ParentLink | ParentLink[] | null;
  let nextParent: ParentLink | null = Array.isArray(rawParent)
    ? rawParent[0] ?? null
    : rawParent ?? null;
  const breadcrumb: { slug: string; title: string }[] = [];
  let hops = 0;

  while (nextParent && hops < 20) {
    breadcrumb.unshift({ slug: nextParent.slug, title: nextParent.title });

    if (!nextParent.parent_page_id) {
      break;
    }

    const { data: ancestor, error: ancestorError }: { data: ParentLink | null; error: unknown } =
      await supabase
        .from("wiki_pages")
        .select("id, slug, title, parent_page_id")
        .eq("id", nextParent.parent_page_id)
        .maybeSingle();

    logWikiError("breadcrumb ancestor lookup failed", ancestorError);

    nextParent = ancestor ?? null;
    hops += 1;
  }

  const [{ data: children, error: childrenError }, { data: allPages, error: allPagesError }] =
    await Promise.all([
      supabase
        .from("wiki_pages")
        .select("id, slug, title")
        .eq("parent_page_id", page.id)
        .order("position"),
      supabase.from("wiki_pages").select("id, slug, title").eq("world_id", world.id),
    ]);

  logWikiError("children fetch failed", childrenError);
  logWikiError("world wiki pages fetch failed", allPagesError);

  const renderedContent = renderWikiContent(page.content, allPages ?? [], slug);

  return (
    <div>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-zinc-500">
        <Link href={`/worlds/${slug}/wiki`} className="hover:text-zinc-300">
          Wiki
        </Link>
        {breadcrumb.map((crumb) => (
          <span key={crumb.slug} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/worlds/${slug}/wiki/${crumb.slug}`} className="hover:text-zinc-300">
              {crumb.title}
            </Link>
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-zinc-300">
          <ChevronRight className="h-3.5 w-3.5" />
          {page.title}
        </span>
      </nav>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{page.title}</h1>
        {canManage && (
          <WikiPageViewActions
            worldId={world.id}
            worldSlug={slug}
            pageId={page.id}
            pageSlug={page.slug}
            pageTitle={page.title}
            parentSlug={breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].slug : null}
            childCount={children?.length ?? 0}
          />
        )}
      </div>

      <div className="tiptap-content mt-4" dangerouslySetInnerHTML={{ __html: renderedContent }} />

      {children && children.length > 0 && (
        <div className="mt-8 border-t border-white/10 pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Sub-pages
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/worlds/${slug}/wiki/${child.slug}`}
                  className="text-sm text-[var(--world-accent,#a78bfa)] hover:underline"
                >
                  {child.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
