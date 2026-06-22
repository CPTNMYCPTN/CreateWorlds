"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, UserCircle2, X } from "lucide-react";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  unfriend,
  type FriendListEntry,
} from "./actions";

function FriendEntryRow({
  entry,
  pending,
  error,
  actions,
}: {
  entry: FriendListEntry;
  pending: boolean;
  error: string | null;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        <Link href={`/users/${entry.username}`} className="shrink-0">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
            {entry.avatar_url ? (
              <Image
                src={entry.avatar_url}
                alt=""
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle2 className="h-full w-full text-zinc-600" />
            )}
          </div>
        </Link>

        <Link href={`/users/${entry.username}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {entry.display_name || entry.username}
          </p>
          <p className="truncate text-xs text-zinc-500">@{entry.username}</p>
        </Link>

        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
      {error && <p className="px-1 text-xs text-red-400">{error}</p>}
      {pending && <span className="sr-only">Updating…</span>}
    </div>
  );
}

export function FriendsLists({
  initialPending,
  initialSent,
  initialFriends,
}: {
  initialPending: FriendListEntry[];
  initialSent: FriendListEntry[];
  initialFriends: FriendListEntry[];
}) {
  const [pendingList, setPendingList] = useState(initialPending);
  const [sentList, setSentList] = useState(initialSent);
  const [friendsList, setFriendsList] = useState(initialFriends);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleAccept(entry: FriendListEntry) {
    setBusyId(entry.friendshipId);
    const result = await acceptFriendRequest(entry.friendshipId);
    setBusyId(null);

    if (result.error) {
      setErrors((current) => ({ ...current, [entry.friendshipId]: result.error! }));
      return;
    }

    setPendingList((current) => current.filter((e) => e.friendshipId !== entry.friendshipId));
    setFriendsList((current) => [...current, entry]);
  }

  async function handleDecline(entry: FriendListEntry) {
    setBusyId(entry.friendshipId);
    const result = await declineFriendRequest(entry.friendshipId);
    setBusyId(null);

    if (result.error) {
      setErrors((current) => ({ ...current, [entry.friendshipId]: result.error! }));
      return;
    }

    setPendingList((current) => current.filter((e) => e.friendshipId !== entry.friendshipId));
  }

  async function handleCancel(entry: FriendListEntry) {
    setBusyId(entry.friendshipId);
    const result = await cancelFriendRequest(entry.friendshipId);
    setBusyId(null);

    if (result.error) {
      setErrors((current) => ({ ...current, [entry.friendshipId]: result.error! }));
      return;
    }

    setSentList((current) => current.filter((e) => e.friendshipId !== entry.friendshipId));
  }

  async function handleUnfriend(entry: FriendListEntry) {
    setBusyId(entry.friendshipId);
    const result = await unfriend(entry.friendshipId);
    setBusyId(null);

    if (result.error) {
      setErrors((current) => ({ ...current, [entry.friendshipId]: result.error! }));
      return;
    }

    setFriendsList((current) => current.filter((e) => e.friendshipId !== entry.friendshipId));
  }

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Pending</h2>
        {pendingList.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No incoming requests.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {pendingList.map((entry) => (
              <FriendEntryRow
                key={entry.friendshipId}
                entry={entry}
                pending={busyId === entry.friendshipId}
                error={errors[entry.friendshipId] ?? null}
                actions={
                  <>
                    <button
                      type="button"
                      disabled={busyId === entry.friendshipId}
                      onClick={() => handleAccept(entry)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--world-accent,#a78bfa)] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === entry.friendshipId}
                      onClick={() => handleDecline(entry)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Sent</h2>
        {sentList.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No outgoing requests.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {sentList.map((entry) => (
              <FriendEntryRow
                key={entry.friendshipId}
                entry={entry}
                pending={busyId === entry.friendshipId}
                error={errors[entry.friendshipId] ?? null}
                actions={
                  <button
                    type="button"
                    disabled={busyId === entry.friendshipId}
                    onClick={() => handleCancel(entry)}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Friends</h2>
        {friendsList.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No friends yet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {friendsList.map((entry) => (
              <FriendEntryRow
                key={entry.friendshipId}
                entry={entry}
                pending={busyId === entry.friendshipId}
                error={errors[entry.friendshipId] ?? null}
                actions={
                  <button
                    type="button"
                    disabled={busyId === entry.friendshipId}
                    onClick={() => handleUnfriend(entry)}
                    className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Unfriend
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
