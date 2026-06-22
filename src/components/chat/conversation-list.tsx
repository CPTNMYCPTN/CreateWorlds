"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { MessageSquarePlus, UserCircle2, X } from "lucide-react";
import { getConversations, type ConversationSummary } from "@/app/dm/actions";
import { getAcceptedFriends, type FriendListEntry } from "@/app/friends/actions";
import { useChatPanel } from "./chat-provider";

export function ConversationList() {
  const { userId, openConversation, openWithUser, closePanel } = useChatPanel();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [friends, setFriends] = useState<FriendListEntry[] | null>(null);
  const [startingUserId, setStartingUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getConversations().then((data) => {
      if (!cancelled) {
        setConversations(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleOpenPicker() {
    setPickerOpen(true);

    if (!friends && userId) {
      const data = await getAcceptedFriends(userId);
      setFriends(data);
    }
  }

  async function handlePickFriend(friendId: string) {
    setStartingUserId(friendId);
    await openWithUser(friendId);
    setStartingUserId(null);
    setPickerOpen(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-100">Messages</h2>
        <button
          type="button"
          onClick={closePanel}
          aria-label="Close"
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-white/10 p-3">
        <button
          type="button"
          onClick={handleOpenPicker}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Message
        </button>

        {pickerOpen && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-zinc-950">
            {friends === null ? (
              <p className="px-3 py-2 text-xs text-zinc-500">Loading friends...</p>
            ) : friends.length === 0 ? (
              <p className="px-3 py-2 text-xs text-zinc-500">No friends yet.</p>
            ) : (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  disabled={startingUserId === friend.id}
                  onClick={() => handlePickFriend(friend.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                    {friend.avatar_url ? (
                      <Image
                        src={friend.avatar_url}
                        alt=""
                        width={24}
                        height={24}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle2 className="h-full w-full text-zinc-600" />
                    )}
                  </span>
                  <span className="truncate">{friend.display_name || friend.username}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations === null ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">Loading...</p>
        ) : conversations.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500">
            No conversations yet. Message a friend to get started.
          </p>
        ) : (
          conversations.map((conversation) => (
            <button
              key={conversation.conversationId}
              type="button"
              onClick={() => openConversation(conversation.conversationId)}
              className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5"
            >
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                {conversation.otherUser.avatar_url ? (
                  <Image
                    src={conversation.otherUser.avatar_url}
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle2 className="h-full w-full text-zinc-600" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-zinc-100">
                    {conversation.otherUser.display_name || conversation.otherUser.username}
                  </span>
                  {conversation.lastMessage && (
                    <span className="shrink-0 text-[11px] text-zinc-500">
                      {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-zinc-500">
                  {conversation.lastMessage
                    ? conversation.lastMessage.content
                    : `@${conversation.otherUser.username}`}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
