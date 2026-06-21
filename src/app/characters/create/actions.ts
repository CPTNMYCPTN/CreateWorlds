"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { TemplateField } from "../types";

export type CreateCharacterState = {
  error: string | null;
};

async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  label: string,
  file: File,
) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("character-avatars")
    .upload(path, file, { contentType: file.type });

  if (error) {
    throw new Error(`${label} upload failed: ${error.message}`);
  }

  return supabase.storage.from("character-avatars").getPublicUrl(path).data
    .publicUrl;
}

export async function createCharacter(
  _prevState: CreateCharacterState,
  formData: FormData,
): Promise<CreateCharacterState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = ((formData.get("name") as string) ?? "").trim();
  const templateId = (formData.get("templateId") as string) || null;
  const worldId = (formData.get("world") as string) || null;
  const fieldsRaw = (formData.get("fields") as string) ?? "[]";
  const avatar = formData.get("avatar") as File | null;

  if (!name) {
    return { error: "Character name is required." };
  }

  let fields: TemplateField[];
  try {
    fields = JSON.parse(fieldsRaw);
  } catch {
    return { error: "Invalid field data." };
  }

  const fieldValues: Record<string, string | number> = {};

  for (const field of fields) {
    const raw = formData.get(`field:${field.id}`);

    if (field.type === "image") {
      const file = raw instanceof File ? raw : null;

      if (file && file.size > 0) {
        try {
          fieldValues[field.id] = await uploadImage(
            supabase,
            user.id,
            `field-${field.id}`,
            file,
          );
        } catch (err) {
          return {
            error: err instanceof Error ? err.message : "Image upload failed.",
          };
        }
      } else if (field.required) {
        return { error: `"${field.label}" is required.` };
      }
      continue;
    }

    const value = ((raw as string) ?? "").trim();

    if (!value) {
      if (field.required) {
        return { error: `"${field.label}" is required.` };
      }
      continue;
    }

    if (field.type === "number") {
      const num = Number(value);
      fieldValues[field.id] = Number.isNaN(num) ? value : num;
    } else {
      fieldValues[field.id] = value;
    }
  }

  let avatarUrl: string | null = null;

  try {
    if (avatar && avatar.size > 0) {
      avatarUrl = await uploadImage(supabase, user.id, "avatar", avatar);
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Avatar upload failed.",
    };
  }

  const { data: createdCharacter, error: insertError } = await supabase
    .from("characters")
    .insert({
      owner_id: user.id,
      template_id: templateId,
      name,
      avatar_url: avatarUrl,
      field_values: fieldValues,
    })
    .select("id")
    .single();

  if (insertError || !createdCharacter) {
    return { error: insertError?.message ?? "Failed to create character." };
  }

  if (worldId) {
    const { data: world } = await supabase
      .from("worlds")
      .select("slug")
      .eq("id", worldId)
      .single();

    if (world) {
      const { error: importError } = await supabase
        .from("world_characters")
        .insert({ world_id: worldId, character_id: createdCharacter.id });

      if (!importError) {
        redirect(`/worlds/${world.slug}`);
      }
    }
  }

  redirect("/");
}
