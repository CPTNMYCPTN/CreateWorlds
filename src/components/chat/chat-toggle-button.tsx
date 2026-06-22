"use client";

import { MessageCircle } from "lucide-react";
import { useChatPanel } from "./chat-provider";

export function ChatToggleButton({ loggedIn }: { loggedIn: boolean }) {
  const { panelOpen, openPanel, closePanel } = useChatPanel();

  if (!loggedIn) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label={panelOpen ? "Close messages" : "Open messages"}
      onClick={() => (panelOpen ? closePanel() : openPanel())}
      className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
    >
      <MessageCircle className="h-5 w-5" />
    </button>
  );
}
