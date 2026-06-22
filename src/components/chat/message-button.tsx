"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useChatPanel } from "./chat-provider";

export function MessageButton({ otherUserId }: { otherUserId: string }) {
  const { openWithUser } = useChatPanel();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await openWithUser(otherUserId);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <MessageCircle className="h-4 w-4" />
      {pending ? "Opening..." : "Message"}
    </button>
  );
}
