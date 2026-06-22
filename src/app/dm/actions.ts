"use server";

import { createClient } from "@/utils/supabase/server";
import { logFriendError } from "@/app/friends/log-error";

export type ProfileSummary = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

// profiles has no FK PostgREST can embed across from dm_participants/dm_messages,
// so the profile lookup is always a separate plain query merged in JS — same
// pattern used for world_members/profiles and friendships/profiles elsewhere.
async function getProfilesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, ProfileSummary>> {
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", ids);

  logFriendError("dm profiles fetch failed", error);

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

export async function findOrCreateConversation(otherUserId: string): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to start a conversation.");
  }

  if (user.id === otherUserId) {
    throw new Error("You can't message yourself.");
  }

  const { data: conversationId, error } = await supabase.rpc("find_or_create_dm_conversation", {
    p_other_user_id: otherUserId,
  });

  if (error || !conversationId) {
    logFriendError("findOrCreateConversation rpc failed", error);
    throw new Error(error?.message ?? "Could not start a conversation.");
  }

  return conversationId as string;
}

export async function sendMessage(conversationId: string, content: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const trimmed = content.trim();

  if (!trimmed) {
    return;
  }

  const { data: participantRow, error: participantError } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  logFriendError("sendMessage participant check failed", participantError);

  if (!participantRow) {
    return;
  }

  const { error } = await supabase.from("dm_messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: trimmed,
  });

  logFriendError("sendMessage insert failed", error);
}

export type ConversationSummary = {
  conversationId: string;
  otherUser: ProfileSummary;
  lastMessage: { content: string; createdAt: string } | null;
};

export async function getConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: myParticipantRows, error: myParticipantError } = await supabase
    .from("dm_participants")
    .select("conversation_id")
    .eq("user_id", user.id);

  logFriendError("getConversations participant lookup failed", myParticipantError);

  const conversationIds = (myParticipantRows ?? []).map((row) => row.conversation_id);

  if (conversationIds.length === 0) {
    return [];
  }

  const { data: otherParticipantRows, error: otherParticipantError } = await supabase
    .from("dm_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", conversationIds)
    .neq("user_id", user.id);

  logFriendError("getConversations other-participant lookup failed", otherParticipantError);

  const otherUserIdByConversation = new Map(
    (otherParticipantRows ?? []).map((row) => [row.conversation_id, row.user_id as string]),
  );

  const otherUserIds = Array.from(new Set(Array.from(otherUserIdByConversation.values())));

  const [profileMap, { data: messageRows, error: messagesError }] = await Promise.all([
    getProfilesByIds(supabase, otherUserIds),
    supabase
      .from("dm_messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false }),
  ]);

  logFriendError("getConversations messages lookup failed", messagesError);

  // Rows arrive newest-first, so the first row seen per conversation is its
  // latest message — this gets the "latest dm_message per conversation"
  // without a per-conversation query.
  const lastMessageByConversation = new Map<string, { content: string; createdAt: string }>();
  for (const message of messageRows ?? []) {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, {
        content: message.content,
        createdAt: message.created_at,
      });
    }
  }

  const summaries = conversationIds
    .map((conversationId) => {
      const otherUserId = otherUserIdByConversation.get(conversationId);
      const otherUser = otherUserId ? profileMap.get(otherUserId) : undefined;

      if (!otherUser) {
        return null;
      }

      return {
        conversationId,
        otherUser,
        lastMessage: lastMessageByConversation.get(conversationId) ?? null,
      };
    })
    .filter((entry): entry is ConversationSummary => entry !== null);

  return summaries.sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;
    return (
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  });
}

export type DmMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: ProfileSummary | null;
};

export async function getMessages(conversationId: string): Promise<DmMessage[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: participantRow, error: participantError } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  logFriendError("getMessages participant check failed", participantError);

  if (!participantRow) {
    return [];
  }

  const { data: messageRows, error: messagesError } = await supabase
    .from("dm_messages")
    .select("id, conversation_id, sender_id, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(50);

  logFriendError("getMessages lookup failed", messagesError);

  const lastFiftyAsc = [...(messageRows ?? [])].reverse();

  const senderIds = Array.from(new Set(lastFiftyAsc.map((message) => message.sender_id)));
  const profileMap = await getProfilesByIds(supabase, senderIds);

  return lastFiftyAsc.map((message) => ({
    id: message.id,
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    content: message.content,
    createdAt: message.created_at,
    sender: profileMap.get(message.sender_id) ?? null,
  }));
}

export async function getConversationParticipant(
  conversationId: string,
): Promise<ProfileSummary | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: selfRow, error: selfError } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  logFriendError("getConversationParticipant self-check failed", selfError);

  if (!selfRow) {
    return null;
  }

  const { data: otherRow, error: otherError } = await supabase
    .from("dm_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id)
    .maybeSingle();

  logFriendError("getConversationParticipant other lookup failed", otherError);

  if (!otherRow) {
    return null;
  }

  const profileMap = await getProfilesByIds(supabase, [otherRow.user_id]);
  return profileMap.get(otherRow.user_id) ?? null;
}
