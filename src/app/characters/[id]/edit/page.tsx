import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { CharacterForm } from "../../create/character-form";
import type { CharacterTemplate } from "../../types";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id, name, avatar_url, template_id, field_values, owner_id")
    .eq("id", id)
    .single();

  if (!character) {
    notFound();
  }

  if (character.owner_id !== user.id) {
    redirect(`/characters/${id}`);
  }

  const { data: templates } = await supabase
    .from("character_templates")
    .select("id, name, description, fields")
    .eq("owner_id", user.id)
    .order("created_at");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">
          Edit {character.name}
        </h1>
        <p className="mt-2 text-zinc-400">
          Update your character&apos;s details below.
        </p>
        <CharacterForm
          templates={(templates ?? []) as CharacterTemplate[]}
          worldId={null}
          character={{
            id: character.id,
            name: character.name,
            avatarUrl: character.avatar_url,
            templateId: character.template_id,
            fieldValues: (character.field_values ?? {}) as Record<string, string | number>,
          }}
        />
      </main>
    </div>
  );
}
