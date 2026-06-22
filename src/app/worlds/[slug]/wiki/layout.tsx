import { notFound } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { WikiSidebar } from "./wiki-sidebar";
import { logWikiError } from "./log-error";
import { DEFAULT_WORLD_THEME, FONT_FAMILY_VARS, type WorldSettings } from "../types";

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
    .select("id, slug, owner_id, settings")
    .eq("slug", slug)
    .single();

  if (!world) {
    notFound();
  }

  const theme = {
    ...DEFAULT_WORLD_THEME,
    ...(world.settings as WorldSettings | null)?.theme,
  };

  const customCss = theme.customCss.replace(/<\/style/gi, "");

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
    <div className="world-page flex min-h-screen flex-col bg-[var(--world-bg)] text-zinc-50">
      <style
        dangerouslySetInnerHTML={{
          __html: `.world-page {
  --world-accent: ${theme.accentColor};
  --world-bg: ${theme.bgColor};
  --world-font: ${FONT_FAMILY_VARS[theme.fontFamily]};
}
${customCss}`,
        }}
      />

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
