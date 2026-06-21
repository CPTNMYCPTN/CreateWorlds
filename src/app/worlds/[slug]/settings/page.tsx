import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { WorldThemeForm } from "../world-theme-form";
import { WorldVisibilityForm } from "../world-visibility-form";
import { WorldDangerZone } from "../world-danger-zone";
import { DEFAULT_WORLD_THEME, type WorldSettings } from "../types";

export default async function WorldSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/worlds/${slug}`);
  }

  const { data: world } = await supabase
    .from("worlds")
    .select("id, name, slug, owner_id, settings, is_public")
    .eq("slug", slug)
    .single();

  if (!world) {
    notFound();
  }

  if (world.owner_id !== user.id) {
    redirect(`/worlds/${slug}`);
  }

  const theme = {
    ...DEFAULT_WORLD_THEME,
    ...(world.settings as WorldSettings | null)?.theme,
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <Link
          href={`/worlds/${world.slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {world.name}
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          World settings
        </h1>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-100">Visibility</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Control who can view this world and its content.
          </p>

          <WorldVisibilityForm
            worldId={world.id}
            worldSlug={world.slug}
            isPublic={world.is_public}
          />
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-100">Theme</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Customize the visual appearance of your world. Changes apply to
            everyone who visits.
          </p>

          <WorldThemeForm worldId={world.id} worldSlug={world.slug} theme={theme} />
        </section>

        <WorldDangerZone worldId={world.id} worldSlug={world.slug} worldName={world.name} />
      </main>
    </div>
  );
}
