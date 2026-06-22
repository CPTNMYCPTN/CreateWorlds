"use client";

import { useChatPanel } from "./chat-provider";
import { ConversationList } from "./conversation-list";
import { MessageView } from "./message-view";

export function ChatPanel() {
  const { panelOpen, activeConversationId } = useChatPanel();

  if (!panelOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[520px] w-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl">
      {activeConversationId ? (
        <MessageView conversationId={activeConversationId} />
      ) : (
        <ConversationList />
      )}
    </div>
  );
}
