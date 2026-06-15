"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type CreateWorldState = {
  error: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  userId: string,
  slug: string,
  label: string,
  file: File,
) {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/${slug}-${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type });

  if (error) {
    throw new Error(`${label} upload failed: ${error.message}`);
  }

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function createWorld(
  _prevState: CreateWorldState,
  formData: FormData,
): Promise<CreateWorldState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = ((formData.get("name") as string) ?? "").trim();
  const slug = slugify((formData.get("slug") as string) ?? "");
  const description = ((formData.get("description") as string) ?? "").trim();
  const isPublic = formData.get("visibility") === "public";
  const banner = formData.get("banner") as File | null;
  const icon = formData.get("icon") as File | null;

  if (!name) {
    return { error: "World name is required." };
  }
  if (!slug) {
    return { error: "Slug is required." };
  }

  let bannerUrl: string | null = null;
  let iconUrl: string | null = null;

  try {
    if (banner && banner.size > 0) {
      bannerUrl = await uploadImage(
        supabase,
        "world-banners",
        user.id,
        slug,
        "banner",
        banner,
      );
    }

    if (icon && icon.size > 0) {
      iconUrl = await uploadImage(
        supabase,
        "world-icons",
        user.id,
        slug,
        "icon",
        icon,
      );
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Image upload failed." };
  }

  const { data: world, error: worldError } = await supabase
    .from("worlds")
    .insert({
      name,
      slug,
      description,
      is_public: isPublic,
      banner_url: bannerUrl,
      icon_url: iconUrl,
      owner_id: user.id,
    })
    .select("id, slug")
    .single();

  if (worldError) {
    if (worldError.code === "23505") {
      return { error: "That slug is already taken. Try a different one." };
    }
    return { error: worldError.message };
  }

  const { error: memberError } = await supabase.from("world_members").insert({
    world_id: world.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  redirect(`/worlds/${world.slug}`);
}
