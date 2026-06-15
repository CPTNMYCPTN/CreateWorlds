import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlignLeft,
  ExternalLink,
  Globe2,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  Music,
  Type,
  UserCircle2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import type { FieldType, TemplateField } from "../types";

const FIELD_TYPE_ICONS: Record<FieldType, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  url: LinkIcon,
  spotify: Music,
  youtube: Video,
  image: ImageIcon,
};

const WIDE_FIELD_TYPES: FieldType[] = ["textarea", "image", "spotify", "youtube"];

function getSpotifyEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("spotify.com")) return null;
    const path = parsed.pathname.startsWith("/embed/")
      ? parsed.pathname
      : `/embed${parsed.pathname}`;
    return `https://open.spotify.com${path}`;
  } catch {
    return null;
  }
}

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;

    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.slice(1);
    } else if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/embed/")[1];
      } else {
        videoId = parsed.searchParams.get("v");
      }
    }

    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function FieldCard({ field, value }: { field: TemplateField; value: string | number }) {
  const Icon = FIELD_TYPE_ICONS[field.type];
  const wide = WIDE_FIELD_TYPES.includes(field.type);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.02] p-4 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        {field.label}
      </h3>

      <div className="mt-3">
        {field.type === "textarea" ? (
          <p className="whitespace-pre-wrap text-sm text-zinc-200">{value}</p>
        ) : field.type === "image" ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-800">
            <Image src={String(value)} alt={field.label} fill className="object-cover" />
          </div>
        ) : field.type === "url" ? (
          <a
            href={String(value)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-violet-400 transition-colors hover:text-violet-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="truncate">{String(value)}</span>
          </a>
        ) : field.type === "spotify" ? (
          (() => {
            const embedUrl = getSpotifyEmbedUrl(String(value));
            return embedUrl ? (
              <iframe
                src={embedUrl}
                className="w-full rounded-xl"
                height={152}
                style={{ border: 0 }}
                allow="encrypted-media"
                loading="lazy"
              />
            ) : (
              <p className="text-sm text-zinc-500">Invalid Spotify link.</p>
            );
          })()
        ) : field.type === "youtube" ? (
          (() => {
            const embedUrl = getYoutubeEmbedUrl(String(value));
            return embedUrl ? (
              <iframe
                src={embedUrl}
                className="aspect-video w-full rounded-xl"
                style={{ border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <p className="text-sm text-zinc-500">Invalid YouTube link.</p>
            );
          })()
        ) : (
          <p className="text-sm text-zinc-200">{value}</p>
        )}
      </div>
    </div>
  );
}

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: character } = await supabase
    .from("characters")
    .select("id, name, avatar_url, field_values, template_id")
    .eq("id", id)
    .single();

  if (!character) {
    notFound();
  }

  const [{ data: template }, { data: worldRows }] = await Promise.all([
    character.template_id
      ? supabase
          .from("character_templates")
          .select("fields")
          .eq("id", character.template_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("world_characters")
      .select("world:worlds(id, name, slug)")
      .eq("character_id", character.id),
  ]);

  const fields: TemplateField[] = template?.fields ?? [];
  const fieldValues = (character.field_values ?? {}) as Record<string, string | number>;

  const worlds = ((worldRows ?? []) as unknown as { world: { id: string; name: string; slug: string } | null }[])
    .map((row) => row.world)
    .filter((world): world is { id: string; name: string; slug: string } => Boolean(world));

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-800 shadow-lg sm:h-28 sm:w-28">
            {character.avatar_url ? (
              <Image
                src={character.avatar_url}
                alt=""
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle2 className="h-full w-full text-zinc-600" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{character.name}</h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              {worlds.length === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-zinc-500">
                  <Globe2 className="h-3.5 w-3.5" />
                  Not in any worlds yet
                </span>
              ) : (
                worlds.map((world) => (
                  <Link
                    key={world.id}
                    href={`/worlds/${world.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
                  >
                    <Globe2 className="h-3 w-3" />
                    {world.name}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {fields.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const value = fieldValues[field.id];

              if (value === undefined || value === null || value === "") {
                return null;
              }

              return <FieldCard key={field.id} field={field} value={value} />;
            })}
          </div>
        )}
      </main>
    </div>
  );
}
