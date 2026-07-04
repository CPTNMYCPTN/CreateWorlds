"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// Joining happens in a single security-definer RPC (see
// supabase/migrations/20260704_invite_join_rpc_rls.sql): it validates the
// code, checks expiry/usage under a row lock, inserts the membership, and
// increments uses only for genuinely new members. This replaces the old
// multi-query flow, which raced on the uses counter and depended on
// world_members/world_invites RLS loose enough to enumerate invite codes.
export async function joinWorldFromInvite(code: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/invite/${code}`)}`);
  }

  const { data, error } = await supabase.rpc("join_world_from_invite", {
    invite_code: code,
  });

  if (error) {
    const friendly = error.message.includes("invalid_invite")
      ? "This invite link is invalid."
      : error.message.includes("invite_expired_or_maxed")
        ? "This invite link has expired or reached its usage limit."
        : error.message;
    redirect(`/invite/${code}?error=${encodeURIComponent(friendly)}`);
  }

  const slug = (data?.[0] as { world_slug: string } | undefined)?.world_slug;

  if (!slug) {
    redirect(
      `/invite/${code}?error=${encodeURIComponent("This invite link is invalid.")}`,
    );
  }

  revalidatePath(`/worlds/${slug}`);
  redirect(`/worlds/${slug}`);
}
