"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type InviteWorldPreview = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  banner_url: string | null;
  icon_url: string | null;
};

function logSupabaseError(label: string, code: string, error: unknown) {
  if (!error) {
    return;
  }

  const err = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
  };

  console.error(`[invite/${code}] ${label}`, {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
    raw: JSON.stringify(error),
  });
}

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

  logSupabaseError("world_invites lookup failed", code, inviteError);

  if (inviteError || !invite) {
    redirect(`/invite/${code}?error=${encodeURIComponent("This invite link is invalid.")}`);
  }

  const isExpired = !!invite.expires_at && invite.expires_at <= now;
  const isMaxedOut = invite.max_uses !== null && invite.uses >= invite.max_uses;

  if (isExpired || isMaxedOut) {
    redirect(
      `/invite/${code}?error=${encodeURIComponent("This invite link has expired or reached its usage limit.")}`,
    );
  }

  // Bypasses the normal worlds RLS (which hides private worlds from
  // non-members) so we can resolve the slug to join/redirect to.
  const { data: worldRows, error: worldError } = await supabase.rpc(
    "get_invite_world",
    { invite_code: code },
  );

  logSupabaseError("get_invite_world rpc failed", code, worldError);

  const world = (worldRows?.[0] as InviteWorldPreview | undefined) ?? null;

  if (!world) {
    console.error(
      `[invite/${code}] get_invite_world returned no rows for an unexpired, non-maxed-out invite`,
      JSON.stringify({ invite }),
    );
    redirect(`/invite/${code}?error=${encodeURIComponent("This invite link is invalid.")}`);
  }

  const { data: existingMembership, error: membershipError } = await supabase
    .from("world_members")
    .select("user_id")
    .eq("world_id", invite.world_id)
    .eq("user_id", user.id)
    .maybeSingle();

  logSupabaseError("existing membership lookup failed", code, membershipError);

  if (existingMembership) {
    redirect(`/worlds/${world.slug}`);
  }

  const { error: memberError } = await supabase.from("world_members").insert({
    world_id: invite.world_id,
    user_id: user.id,
    role: "member",
  });

  // Postgres unique_violation: a concurrent request already inserted this
  // membership between our pre-check above and this insert. Check this
  // BEFORE any generic error logging/handling below, and bail out straight
  // to the success redirect — this is not a real failure, so it must never
  // reach the generic handler, get logged as an error, or increment uses.
  if (memberError?.code === "23505") {
    revalidatePath(`/worlds/${world.slug}`);
    redirect(`/worlds/${world.slug}`);
  }

  logSupabaseError("world_members insert failed", code, memberError);

  if (memberError) {
    redirect(
      `/invite/${code}?error=${encodeURIComponent(memberError.message)}`,
    );
  }

  const { error: updateError } = await supabase
    .from("world_invites")
    .update({ uses: invite.uses + 1 })
    .eq("id", invite.id);

  logSupabaseError("world_invites uses increment failed", code, updateError);

  if (updateError) {
    redirect(
      `/invite/${code}?error=${encodeURIComponent(updateError.message)}`,
    );
  }

  revalidatePath(`/worlds/${world.slug}`);
  redirect(`/worlds/${world.slug}`);
}
