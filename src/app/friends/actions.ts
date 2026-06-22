"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { logFriendError } from "./log-error";

export type FriendshipStatus = "pending" | "accepted" | "declined";

export type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
};

// The unique constraint on friendships is (requester_id, addressee_id), not
// (least, greatest) — A->B and B->A can both exist as separate rows. Every
// lookup has to check both directions explicitly.
async function findFriendship(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userA: string,
  userB: string,
): Promise<FriendshipRow | null> {
  const [{ data: forward, error: forwardError }, { data: backward, error: backwardError }] =
    await Promise.all([
      supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .eq("requester_id", userA)
        .eq("addressee_id", userB)
        .maybeSingle(),
      supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .eq("requester_id", userB)
        .eq("addressee_id", userA)
        .maybeSingle(),
    ]);

  logFriendError("friendship lookup (forward) failed", forwardError);
  logFriendError("friendship lookup (backward) failed", backwardError);

  return (forward ?? backward ?? null) as FriendshipRow | null;
}

export type FriendActionResult = {
  error: string | null;
  friendship?: FriendshipRow;
};

export async function sendFriendRequest(addresseeId: string): Promise<FriendActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.id === addresseeId) {
    return { error: "You can't send a friend request to yourself." };
  }

  const existing = await findFriendship(supabase, user.id, addresseeId);

  if (existing) {
    return { error: null, friendship: existing };
  }

  const { data, error } = await supabase
    .from("friendships")
    .insert({ requester_id: user.id, addressee_id: addresseeId, status: "pending" })
    .select("id, requester_id, addressee_id, status")
    .single();

  if (error) {
    logFriendError("sendFriendRequest insert failed", error);
    return { error: error.message };
  }

  revalidatePath("/friends");
  return { error: null, friendship: data as FriendshipRow };
}

export async function cancelFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("requester_id", user.id)
    .eq("status", "pending");

  if (error) {
    logFriendError("cancelFriendRequest failed", error);
    return { error: error.message };
  }

  revalidatePath("/friends");
  return { error: null };
}

export async function acceptFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) {
    logFriendError("acceptFriendRequest failed", error);
    return { error: error.message };
  }

  revalidatePath("/friends");
  return { error: null };
}

export async function declineFriendRequest(friendshipId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("friendships")
    .update({ status: "declined" })
    .eq("id", friendshipId)
    .eq("addressee_id", user.id)
    .eq("status", "pending");

  if (error) {
    logFriendError("declineFriendRequest failed", error);
    return { error: error.message };
  }

  revalidatePath("/friends");
  return { error: null };
}

export async function unfriend(friendshipId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  if (error) {
    logFriendError("unfriend failed", error);
    return { error: error.message };
  }

  revalidatePath("/friends");
  return { error: null };
}

export async function getFriendshipBetween(
  userA: string,
  userB: string,
): Promise<FriendshipRow | null> {
  const supabase = await createClient();
  return findFriendship(supabase, userA, userB);
}

export type FriendListEntry = {
  friendshipId: string;
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type BareFriendshipRow = { id: string; requester_id: string; addressee_id: string };

// profiles has no FK PostgREST can embed across from friendships, so the
// other party's profile is fetched separately and merged in JS — same
// pattern used for world_members/profiles elsewhere in this app.
async function buildFriendEntries(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: BareFriendshipRow[],
  otherIdOf: (row: BareFriendshipRow) => string,
): Promise<FriendListEntry[]> {
  if (rows.length === 0) {
    return [];
  }

  const otherIds = rows.map(otherIdOf);

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", otherIds);

  logFriendError("friend entries profile fetch failed", error);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return rows
    .map((row) => {
      const profile = profileMap.get(otherIdOf(row));

      if (!profile) {
        return null;
      }

      return {
        friendshipId: row.id,
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      };
    })
    .filter((entry): entry is FriendListEntry => entry !== null);
}

export async function getAcceptedFriends(userId: string): Promise<FriendListEntry[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  logFriendError("getAcceptedFriends lookup failed", error);

  return buildFriendEntries(supabase, rows ?? [], (row) =>
    row.requester_id === userId ? row.addressee_id : row.requester_id,
  );
}

export async function getPendingIncomingRequests(userId: string): Promise<FriendListEntry[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("status", "pending")
    .eq("addressee_id", userId);

  logFriendError("getPendingIncomingRequests lookup failed", error);

  return buildFriendEntries(supabase, rows ?? [], (row) => row.requester_id);
}

export async function getSentFriendRequests(userId: string): Promise<FriendListEntry[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("status", "pending")
    .eq("requester_id", userId);

  logFriendError("getSentFriendRequests lookup failed", error);

  return buildFriendEntries(supabase, rows ?? [], (row) => row.addressee_id);
}

export async function getPendingIncomingCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .eq("addressee_id", userId);

  logFriendError("getPendingIncomingCount lookup failed", error);

  return count ?? 0;
}
