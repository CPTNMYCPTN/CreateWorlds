"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export type UpdateProfileState = {
  error: string | null;
  success: boolean;
};

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName = ((formData.get("display_name") as string) ?? "").trim() || null;
  const bio = ((formData.get("bio") as string) ?? "").trim() || null;
  const avatarUrl = ((formData.get("avatar_url") as string) ?? "").trim() || null;

  const updates: Record<string, unknown> = { display_name: displayName, bio };
  if (avatarUrl !== null) {
    updates.avatar_url = avatarUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");
  return { error: null, success: true };
}
