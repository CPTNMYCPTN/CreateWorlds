"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { WorldSidebar } from "./world-sidebar";
import { ThreadView } from "./thread-view";
import { WorldMap } from "./world-map";
import { WorldCharactersTab } from "./world-characters-tab";
import type { MapHotspot, WorldCharacter, WorldFolder, WorldThread } from "./types";

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
}) {
  const [selectedThread, setSelectedThread] = useState<WorldThread | null>(null);

  return (
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
                className="rounded-t-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-violet-400"
              >
                About
              </Tabs.Trigger>
              <Tabs.Trigger
                value="map"
                className="rounded-t-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-violet-400"
              >
                Map
              </Tabs.Trigger>
              <Tabs.Trigger
                value="characters"
                className="rounded-t-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-violet-400"
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
  );
}
