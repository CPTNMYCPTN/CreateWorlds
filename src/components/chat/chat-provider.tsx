"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { findOrCreateConversation } from "@/app/dm/actions";
import { ChatPanel } from "./chat-panel";

type ChatContextValue = {
  userId: string | null;
  panelOpen: boolean;
  activeConversationId: string | null;
  openPanel: () => void;
  closePanel: () => void;
  openConversation: (conversationId: string) => void;
  closeConversation: () => void;
  openWithUser: (otherUserId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatPanel(): ChatContextValue {
  const ctx = useContext(ChatContext);

  if (!ctx) {
    throw new Error("useChatPanel must be used within a ChatProvider");
  }

  return ctx;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const openConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setPanelOpen(true);
  }, []);

  const closeConversation = useCallback(() => setActiveConversationId(null), []);

  const openWithUser = useCallback(async (otherUserId: string) => {
    const conversationId = await findOrCreateConversation(otherUserId);
    setActiveConversationId(conversationId);
    setPanelOpen(true);
  }, []);

  const value = useMemo<ChatContextValue>(
    () => ({
      userId,
      panelOpen,
      activeConversationId,
      openPanel,
      closePanel,
      openConversation,
      closeConversation,
      openWithUser,
    }),
    [
      userId,
      panelOpen,
      activeConversationId,
      openPanel,
      closePanel,
      openConversation,
      closeConversation,
      openWithUser,
    ],
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
      {userId && <ChatPanel />}
    </ChatContext.Provider>
  );
}
