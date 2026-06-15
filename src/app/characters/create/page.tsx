import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { createClient } from "@/utils/supabase/server";
import { CharacterForm } from "./character-form";
import type { CharacterTemplate } from "../types";

export default async function CreateCharacterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
          Create a Character
        </h1>
        <p className="mt-2 text-zinc-400">
          Pick a template to get started, or build your character from
          scratch.
        </p>
        <CharacterForm templates={(templates ?? []) as CharacterTemplate[]} />
      </main>
    </div>
  );
}
