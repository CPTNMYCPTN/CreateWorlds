"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function joinWorldFromInvite(code: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/invite/${code}`)}`);
  }

  const now = new Date().toISOString();

  const { data: invite, error: inviteError } = await supabase
    .from("world_invites")
    .select("id, world_id, code, expires_at, max_uses, uses")
    .eq("code", code)
    .single();

  if (inviteError || !invite) {
    redirect(`/invite/${code}?error=${encodeURIComponent("This invite link is invalid.")}`);
  }

  const { data: worldData } = await supabase
    .from("worlds")
    .select("id, slug")
    .eq("id", invite.world_id)
    .single();

  if (!worldData) {
    redirect(`/invite/${code}?error=${encodeURIComponent("This invite link is invalid.")}`);
  }

  const isExpired = invite.expires_at && invite.expires_at <= now;
  const isMaxedOut = invite.max_uses !== null && invite.uses >= invite.max_uses;

  if (isExpired || isMaxedOut) {
    redirect(
      `/invite/${code}?error=${encodeURIComponent("This invite link has expired or reached its usage limit.")}`,
    );
  }

  const { data: existingMembership } = await supabase
    .from("world_members")
    .select("user_id")
    .eq("world_id", invite.world_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    redirect(`/worlds/${worldData.slug}`);
  }

  const { error: memberError } = await supabase
    .from("world_members")
    .insert({
      world_id: invite.world_id,
      user_id: user.id,
      role: "member",
    });

  if (memberError) {
    redirect(
      `/invite/${code}?error=${encodeURIComponent(memberError.message)}`,
    );
  }

  const { error: updateError } = await supabase
    .from("world_invites")
    .update({ uses: invite.uses + 1 })
    .eq("id", invite.id);

  if (updateError) {
    redirect(
      `/invite/${code}?error=${encodeURIComponent(updateError.message)}`,
    );
  }

  revalidatePath(`/worlds/${worldData.slug}`);
  redirect(`/worlds/${worldData.slug}`);
}
