"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, Settings, User, UserCircle2 } from "lucide-react";
import { logout } from "@/app/actions";

export function UserMenu({
  username,
  displayName,
  avatarUrl,
}: {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:text-white"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <UserCircle2 className="h-5 w-5" />
        )}
        <span>{displayName || username}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/10 bg-zinc-900 py-1 shadow-xl">
            <Link
              href={`/users/${username}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <User className="h-4 w-4" />
              View profile
            </Link>
            <Link
              href="/characters/create"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <User className="h-4 w-4" />
              Create a character
            </Link>
            <Link
              href="/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Settings className="h-4 w-4" />
              Edit profile
            </Link>
            <div className="my-1 border-t border-white/10" />
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
