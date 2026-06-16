"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import * as Tabs from "@radix-ui/react-tabs";
import { UserCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { WorldSidebar } from "./world-sidebar";
import { ThreadView } from "./thread-view";
import { WorldMap } from "./world-map";
import { WorldCharactersTab } from "./world-characters-tab";
import type { MapHotspot, WorldCharacter, WorldFolder, WorldThread } from "./types";

type PresenceUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
};

function PresenceAvatar({ user }: { user: PresenceUser }) {
  return (
    <div
      title={user.username}
      className="relative h-8 w-8 shrink-0 rounded-full ring-2 ring-zinc-950"
    >
      {user.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <UserCircle2 className="h-8 w-8 text-zinc-600" />
      )}
      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 bg-emerald-400" />
    </div>
  );
}

function PresenceBar({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) {
    return null;
  }

  const visible = users.slice(0, 5);
  const extra = users.length - visible.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 pt-4">
      <div className="flex -space-x-2">
        {visible.map((user) => (
          <PresenceAvatar key={user.user_id} user={user} />
        ))}
      </div>
      {extra > 0 && <span className="text-xs text-zinc-500">+{extra} more</span>}
      <span className="text-xs text-zinc-500">
        {users.length} {users.length === 1 ? "person" : "people"} viewing
      </span>
    </div>
  );
}

export function WorldWorkspace({
  worldId,
  worldSlug,
  folders,
  isOwner,
  isMember,
  description,
  mapUrl,
  hotspots,
  characters,
  currentUser,
}: {
  worldId: string;
  worldSlug: string;
  folders: WorldFolder[];
  isOwner: boolean;
  isMember: boolean;
  description: string;
  mapUrl: string | null;
  hotspots: MapHotspot[];
  characters: WorldCharacter[];
  currentUser: { id: string; username: string; avatarUrl: string | null } | null;
}) {
  const [selectedThread, setSelectedThread] = useState<WorldThread | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [guestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const supabase = createClient();
    const key = currentUser?.id ?? guestId;

    const channel = supabase.channel(`presence:world:${worldId}`, {
      config: { presence: { key } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        setOnlineUsers(
          Object.values(state)
            .map((presences) => presences[0])
            .filter((presence): presence is PresenceUser & { presence_ref: string } =>
              Boolean(presence),
            ),
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: key,
            username: currentUser?.username ?? "Guest",
            avatar_url: currentUser?.avatarUrl ?? null,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [worldId, currentUser, guestId]);

  return (
    <>
      <PresenceBar users={onlineUsers} />

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 pb-12">
        <WorldSidebar
          worldId={worldId}
          worldSlug={worldSlug}
          folders={folders}
          isOwner={isOwner}
          selectedThreadId={selectedThread?.id ?? null}
          onSelectThread={setSelectedThread}
        />

        <main className="flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          {selectedThread ? (
            <ThreadView thread={selectedThread} worldId={worldId} worldSlug={worldSlug} />
          ) : (
            <Tabs.Root defaultValue="about">
              <Tabs.List className="flex gap-1 border-b border-white/10">
                <Tabs.Trigger
                  value="about"
                  className="rounded-t-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[var(--world-accent)]"
                >
                  About
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="map"
                  className="rounded-t-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[var(--world-accent)]"
                >
                  Map
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="characters"
                  className="rounded-t-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-[var(--world-accent)]"
                >
                  Characters
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="about" className="mt-4">
                {description ? (
                  <>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                      About this world
                    </h2>
                    <p className="mt-3 whitespace-pre-wrap text-zinc-300">
                      {description}
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
                    <p className="text-sm">
                      Nothing here yet. Create a folder to start organizing
                      your world.
                    </p>
                  </div>
                )}
              </Tabs.Content>

              <Tabs.Content value="map" className="mt-4">
                <WorldMap
                  worldId={worldId}
                  worldSlug={worldSlug}
                  mapUrl={mapUrl}
                  hotspots={hotspots}
                  isOwner={isOwner}
                  folders={folders}
                  onSelectThread={setSelectedThread}
                />
              </Tabs.Content>

              <Tabs.Content value="characters" className="mt-4">
                <WorldCharactersTab
                  worldId={worldId}
                  worldSlug={worldSlug}
                  characters={characters}
                  canAddCharacter={isOwner || isMember}
                />
              </Tabs.Content>
            </Tabs.Root>
          )}
        </main>
      </div>
    </>
  );
}
