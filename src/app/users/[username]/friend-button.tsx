"use client";

import { useState } from "react";
import { Check, UserCheck, UserPlus, X } from "lucide-react";
import { ActionMenu } from "@/components/action-menu";
import { MessageButton } from "@/components/chat/message-button";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  sendFriendRequest,
  unfriend,
  type FriendshipRow,
} from "@/app/friends/actions";

export function FriendButton({
  viewerId,
  targetId,
  initialFriendship,
}: {
  viewerId: string;
  targetId: string;
  initialFriendship: FriendshipRow | null;
}) {
  const [friendship, setFriendship] = useState(initialFriendship);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddFriend() {
    setPending(true);
    setError(null);

    if (friendship && friendship.status === "declined") {
      const unfriendResult = await unfriend(friendship.id);
      if (unfriendResult.error) {
        setPending(false);
        setError(unfriendResult.error);
        return;
      }
    }

    const result = await sendFriendRequest(targetId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFriendship(result.friendship ?? null);
  }

  async function handleCancel() {
    if (!friendship) return;
    setPending(true);
    setError(null);

    const result = await cancelFriendRequest(friendship.id);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFriendship(null);
  }

  async function handleAccept() {
    if (!friendship) return;
    setPending(true);
    setError(null);

    const result = await acceptFriendRequest(friendship.id);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFriendship({ ...friendship, status: "accepted" });
  }

  async function handleDecline() {
    if (!friendship) return;
    setPending(true);
    setError(null);

    const result = await declineFriendRequest(friendship.id);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFriendship({ ...friendship, status: "declined" });
  }

  async function handleUnfriend() {
    if (!friendship) return;
    setPending(true);
    setError(null);

    const result = await unfriend(friendship.id);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFriendship(null);
  }

  const isIncomingPending =
    friendship?.status === "pending" && friendship.addressee_id === viewerId;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {!friendship || friendship.status === "declined" ? (
          <button
            type="button"
            disabled={pending}
            onClick={handleAddFriend}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--world-accent,#a78bfa)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            Add Friend
          </button>
        ) : friendship.status === "pending" && !isIncomingPending ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-500">
              Request Sent
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={handleCancel}
              className="text-sm text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </>
        ) : friendship.status === "pending" && isIncomingPending ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={handleAccept}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--world-accent,#a78bfa)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              Accept
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={handleDecline}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Decline
            </button>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-400">
              <UserCheck className="h-4 w-4" />
              Friends
            </span>
            <ActionMenu
              items={[
                {
                  key: "unfriend",
                  label: "Unfriend",
                  icon: X,
                  danger: true,
                  onSelect: handleUnfriend,
                },
              ]}
            />
          </>
        )}

        <MessageButton otherUserId={targetId} />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
