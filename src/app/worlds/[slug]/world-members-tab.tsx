"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { removeMember, updateMemberRole } from "./actions";
import type { WorldMember, WorldMemberRole } from "./types";

function MemberRow({
  worldId,
  worldSlug,
  member,
  canRemove,
  canChangeRole,
  onRemoved,
  onRoleChanged,
}: {
  worldId: string;
  worldSlug: string;
  member: WorldMember;
  canRemove: boolean;
  canChangeRole: boolean;
  onRemoved: (memberId: string) => void;
  onRoleChanged: (memberId: string, role: WorldMemberRole) => void;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = member.display_name || member.username;

  async function handleRemove() {
    setPending(true);
    setError(null);

    const result = await removeMember(worldId, worldSlug, member.id);

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDialogOpen(false);
    onRemoved(member.id);
    router.refresh();
  }

  async function handleRoleChange(newRole: WorldMemberRole) {
    if (newRole === member.role || newRole === "owner") {
      return;
    }

    setRoleUpdating(true);
    setError(null);

    const result = await updateMemberRole(worldId, worldSlug, member.id, newRole);

    setRoleUpdating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onRoleChanged(member.id, newRole);
  }

  const joinedDate = new Date(member.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <Link
        href={`/users/${member.username}`}
        className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800"
      >
        {member.avatar_url ? (
          <Image
            src={member.avatar_url}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : (
          <UserCircle2 className="h-full w-full text-zinc-600" />
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/users/${member.username}`}
            className="truncate text-sm font-medium text-zinc-100 transition-colors hover:text-white"
          >
            {displayName}
          </Link>
          {member.role === "owner" && (
            <span className="shrink-0 rounded-full bg-[var(--world-accent)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--world-accent)]">
              Owner
            </span>
          )}
        </div>
        <p className="truncate text-xs text-zinc-500">
          @{member.username} · Joined {joinedDate}
        </p>
      </div>

      {member.role !== "owner" &&
        (canChangeRole ? (
          <select
            value={member.role}
            disabled={roleUpdating}
            onChange={(e) => handleRoleChange(e.target.value as WorldMemberRole)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-zinc-200 outline-none transition-colors hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
        ) : (
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-sm capitalize text-zinc-300">
            {member.role}
          </span>
        ))}

      {member.role !== "owner" && canRemove && (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15"
        >
          Remove
        </button>
      )}

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Remove this member?"
        description={`${displayName} will lose access to this world. Their threads and posts will remain.`}
        confirmLabel="Remove"
        pendingLabel="Removing..."
        pending={pending}
        error={error}
        onConfirm={handleRemove}
      />
    </div>
  );
}

export function WorldMembersTab({
  worldId,
  worldSlug,
  members: initialMembers,
  isOwner,
  isAdmin,
  currentUserId,
}: {
  worldId: string;
  worldSlug: string;
  members: WorldMember[];
  isOwner: boolean;
  isAdmin: boolean;
  currentUserId: string | null;
}) {
  const [members, setMembers] = useState(initialMembers);

  function handleRemoved(memberId: string) {
    setMembers((current) => current.filter((member) => member.id !== memberId));
  }

  function handleRoleChanged(memberId: string, role: WorldMemberRole) {
    setMembers((current) =>
      current.map((member) => (member.id === memberId ? { ...member, role } : member)),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
          <p className="text-sm">No members yet.</p>
        </div>
      ) : (
        members.map((member) => {
          const canRemove =
            member.role !== "owner" &&
            member.user_id !== currentUserId &&
            (isOwner || (isAdmin && member.role === "member"));

          return (
            <MemberRow
              key={member.id}
              worldId={worldId}
              worldSlug={worldSlug}
              member={member}
              canRemove={canRemove}
              canChangeRole={isOwner}
              onRemoved={handleRemoved}
              onRoleChanged={handleRoleChanged}
            />
          );
        })
      )}
    </div>
  );
}
