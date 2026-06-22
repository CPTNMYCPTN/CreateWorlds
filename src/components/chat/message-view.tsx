"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Send, UserCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  getConversationParticipant,
  getMessages,
  sendMessage,
  type DmMessage,
  type ProfileSummary,
} from "@/app/dm/actions";
import { useChatPanel } from "./chat-provider";

export function MessageView({ conversationId }: { conversationId: string }) {
  const { userId, closeConversation } = useChatPanel();
  const [otherUser, setOtherUser] = useState<ProfileSummary | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const otherUserRef = useRef<ProfileSummary | null>(null);

  const loading = loadedConversationId !== conversationId;

  useEffect(() => {
    otherUserRef.current = otherUser;
  }, [otherUser]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getConversationParticipant(conversationId), getMessages(conversationId)]).then(
      ([participant, messageRows]) => {
        if (cancelled) {
          return;
        }

        setOtherUser(participant);
        setMessages(messageRows);
        setLoadedConversationId(conversationId);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Live delivery via Supabase Realtime (not Socket.io). Requires dm_messages
  // to be in the supabase_realtime publication — if messages aren't arriving
  // live, run in the SQL editor:
  //   alter publication supabase_realtime add table public.dm_messages;
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string;
            created_at: string;
          };

          setMessages((current) => {
            if (current.some((message) => message.id === newMessage.id)) {
              return current;
            }

            return [
              ...current,
              {
                id: newMessage.id,
                conversationId: newMessage.conversation_id,
                senderId: newMessage.sender_id,
                content: newMessage.content,
                createdAt: newMessage.created_at,
                sender: newMessage.sender_id === userId ? null : otherUserRef.current,
              },
            ];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend() {
    const trimmed = content.trim();

    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    setContent("");
    await sendMessage(conversationId, trimmed);
    setSending(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <button
          type="button"
          onClick={closeConversation}
          aria-label="Back"
          className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {otherUser ? (
          <Link
            href={`/users/${otherUser.username}`}
            className="flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-white"
          >
            <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-zinc-800">
              {otherUser.avatar_url ? (
                <Image
                  src={otherUser.avatar_url}
                  alt=""
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserCircle2 className="h-full w-full text-zinc-600" />
              )}
            </span>
            <span className="truncate text-sm font-medium text-zinc-100">
              {otherUser.display_name || otherUser.username}
            </span>
          </Link>
        ) : (
          <span className="flex-1 text-sm text-zinc-500">Loading...</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="py-6 text-center text-sm text-zinc-500">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">No messages yet. Say hello!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((message, index) => {
              const isMine = message.senderId === userId;
              const previous = messages[index - 1];
              const showAvatar = !isMine && previous?.senderId !== message.senderId;

              return (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
                >
                  {!isMine && (
                    <span
                      className={`h-6 w-6 shrink-0 overflow-hidden rounded-full bg-zinc-800 ${
                        showAvatar ? "" : "opacity-0"
                      }`}
                    >
                      {message.sender?.avatar_url ? (
                        <Image
                          src={message.sender.avatar_url}
                          alt=""
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircle2 className="h-full w-full text-zinc-600" />
                      )}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-[var(--world-accent,#a78bfa)] text-white"
                        : "bg-white/[0.06] text-zinc-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    <p className={`mt-1 text-[10px] ${isMine ? "text-white/70" : "text-zinc-500"}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-white/10 p-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent,#a78bfa)]/50"
        />
        <button
          type="button"
          disabled={!content.trim() || sending}
          onClick={handleSend}
          aria-label="Send"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--world-accent,#a78bfa)] text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
