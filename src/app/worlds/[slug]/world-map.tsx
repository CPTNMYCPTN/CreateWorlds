"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Map, MapPin, MessageSquare, Upload, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createHotspot, setWorldMap, type CreateHotspotState } from "./actions";
import type { MapHotspot, MapHotspotLinkType, WorldFolder, WorldThread } from "./types";

const initialHotspotState: CreateHotspotState = { error: null };

function MapUploadInput({
  label,
  pending,
  onUpload,
}: {
  label: string;
  pending: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5">
      <Upload className="h-4 w-4" />
      {pending ? "Uploading..." : label}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onUpload(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function AddHotspotDialog({
  worldId,
  worldSlug,
  mapImageUrl,
  position,
  folders,
  onClose,
  onCreated,
}: {
  worldId: string;
  worldSlug: string;
  mapImageUrl: string;
  position: { x: number; y: number };
  folders: WorldFolder[];
  onClose: () => void;
  onCreated: (hotspot: MapHotspot) => void;
}) {
  const [linkType, setLinkType] = useState<"" | MapHotspotLinkType>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const hasFolders = folders.length > 0;
  const hasThreads = folders.some((folder) => folder.threads.length > 0);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createHotspot(
      worldId,
      worldSlug,
      mapImageUrl,
      position.x,
      position.y,
      initialHotspotState,
      formData,
    );
    setPending(false);

    if (result.error || !result.hotspot) {
      setError(result.error ?? "Something went wrong.");
    } else {
      onCreated(result.hotspot);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-zinc-50">
              Add hotspot
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form action={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div>
              <label
                htmlFor="hotspot-label"
                className="text-sm font-medium text-zinc-300"
              >
                Label
              </label>
              <input
                id="hotspot-label"
                name="label"
                required
                autoFocus
                placeholder="Capital City"
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent)]/50"
              />
            </div>

            <div>
              <label
                htmlFor="hotspot-link-type"
                className="text-sm font-medium text-zinc-300"
              >
                Link to (optional)
              </label>
              <select
                id="hotspot-link-type"
                name="linkType"
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as "" | MapHotspotLinkType)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none focus:border-[var(--world-accent)]/50"
              >
                <option value="" className="bg-zinc-900">
                  No link
                </option>
                {hasFolders && (
                  <option value="folder" className="bg-zinc-900">
                    Folder
                  </option>
                )}
                {hasThreads && (
                  <option value="thread" className="bg-zinc-900">
                    Thread
                  </option>
                )}
                <option value="url" className="bg-zinc-900">
                  External URL
                </option>
              </select>
            </div>

            {linkType === "folder" && (
              <div>
                <label
                  htmlFor="hotspot-link-id"
                  className="text-sm font-medium text-zinc-300"
                >
                  Folder
                </label>
                <select
                  id="hotspot-link-id"
                  name="linkId"
                  required
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none focus:border-[var(--world-accent)]/50"
                >
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id} className="bg-zinc-900">
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {linkType === "thread" && (
              <div>
                <label
                  htmlFor="hotspot-link-id"
                  className="text-sm font-medium text-zinc-300"
                >
                  Thread
                </label>
                <select
                  id="hotspot-link-id"
                  name="linkId"
                  required
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none focus:border-[var(--world-accent)]/50"
                >
                  {folders.map((folder) =>
                    folder.threads.length === 0 ? null : (
                      <optgroup key={folder.id} label={folder.name} className="bg-zinc-900">
                        {folder.threads.map((thread) => (
                          <option key={thread.id} value={thread.id} className="bg-zinc-900">
                            {thread.title}
                          </option>
                        ))}
                      </optgroup>
                    ),
                  )}
                </select>
              </div>
            )}

            {linkType === "url" && (
              <div>
                <label
                  htmlFor="hotspot-link-id"
                  className="text-sm font-medium text-zinc-300"
                >
                  URL
                </label>
                <input
                  id="hotspot-link-id"
                  name="linkId"
                  type="url"
                  required
                  placeholder="https://..."
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent)]/50"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-[var(--world-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Adding..." : "Add hotspot"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HotspotPin({
  hotspot,
  folders,
  isOpen,
  onToggle,
  onSelectThread,
}: {
  hotspot: MapHotspot;
  folders: WorldFolder[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectThread: (thread: WorldThread) => void;
}) {
  let linkLabel: string | null = null;
  let linkHref: string | null = null;
  let linkThread: WorldThread | null = null;

  if (hotspot.link_type === "folder") {
    const folder = folders.find((f) => f.id === hotspot.link_id);
    linkLabel = folder ? `Folder: ${folder.name}` : null;
  } else if (hotspot.link_type === "thread") {
    for (const folder of folders) {
      const thread = folder.threads.find((t) => t.id === hotspot.link_id);
      if (thread) {
        linkThread = thread;
        linkLabel = `Thread: ${thread.title}`;
        break;
      }
    }
  } else if (hotspot.link_type === "url" && hotspot.link_id) {
    linkLabel = hotspot.link_id;
    linkHref = hotspot.link_id;
  }

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${hotspot.x_percent}%`, top: `${hotspot.y_percent}%` }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="block"
      >
        <MapPin className="h-7 w-7 fill-[var(--world-accent)] text-violet-200 drop-shadow-lg transition-transform hover:scale-110" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-900 p-3 shadow-xl"
        >
          <p className="text-sm font-medium text-zinc-100">{hotspot.label}</p>
          {linkThread ? (
            <button
              type="button"
              onClick={() => onSelectThread(linkThread!)}
              className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--world-accent)] transition-colors hover:opacity-80"
            >
              <MessageSquare className="h-3 w-3" />
              {linkLabel}
            </button>
          ) : linkHref ? (
            <a
              href={linkHref}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--world-accent)] transition-colors hover:opacity-80"
            >
              <ExternalLink className="h-3 w-3" />
              {linkLabel}
            </a>
          ) : linkLabel ? (
            <p className="mt-1 text-xs text-zinc-500">{linkLabel}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function WorldMap({
  worldId,
  worldSlug,
  mapUrl: initialMapUrl,
  hotspots: initialHotspots,
  isOwner,
  folders,
  onSelectThread,
}: {
  worldId: string;
  worldSlug: string;
  mapUrl: string | null;
  hotspots: MapHotspot[];
  isOwner: boolean;
  folders: WorldFolder[];
  onSelectThread: (thread: WorldThread) => void;
}) {
  const [mapUrl, setMapUrl] = useState(initialMapUrl);
  const [hotspots, setHotspots] = useState(initialHotspots);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [openHotspotId, setOpenHotspotId] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadError("You must be signed in to upload a map.");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${worldId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("world-maps")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setUploadError(uploadError.message);
      setUploading(false);
      return;
    }

    const newMapUrl = supabase.storage.from("world-maps").getPublicUrl(path).data
      .publicUrl;

    const result = await setWorldMap(worldId, worldSlug, newMapUrl);
    setUploading(false);

    if (result.error) {
      setUploadError(result.error);
    } else {
      setMapUrl(newMapUrl);
      setHotspots([]);
    }
  }

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    setOpenHotspotId(null);
    if (!isOwner) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPosition({ x, y });
  }

  if (!mapUrl) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
        <Map className="h-10 w-10 text-zinc-600" />
        <h3 className="text-lg font-medium text-zinc-200">No map yet</h3>
        {isOwner ? (
          <>
            <p className="max-w-sm text-sm text-zinc-500">
              Upload an image to create a map for this world. You&apos;ll be
              able to click anywhere on it to add hotspots.
            </p>
            <div className="mt-2">
              <MapUploadInput label="Upload Map" pending={uploading} onUpload={handleUpload} />
            </div>
            {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
          </>
        ) : (
          <p className="max-w-sm text-sm text-zinc-500">
            The world owner hasn&apos;t uploaded a map yet.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {isOwner
            ? "Click anywhere on the map to add a hotspot."
            : "Click a pin to see more."}
        </p>
        {isOwner && (
          <MapUploadInput label="Replace Map" pending={uploading} onUpload={handleUpload} />
        )}
      </div>

      {uploadError && (
        <p className="mb-3 text-sm text-red-400">{uploadError}</p>
      )}

      <div
        onClick={handleMapClick}
        className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/20 ${isOwner ? "cursor-crosshair" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mapUrl} alt="World map" className="block w-full select-none" draggable={false} />

        {hotspots.map((hotspot) => (
          <HotspotPin
            key={hotspot.id}
            hotspot={hotspot}
            folders={folders}
            isOpen={openHotspotId === hotspot.id}
            onToggle={() =>
              setOpenHotspotId((current) => (current === hotspot.id ? null : hotspot.id))
            }
            onSelectThread={onSelectThread}
          />
        ))}
      </div>

      {pendingPosition && (
        <AddHotspotDialog
          worldId={worldId}
          worldSlug={worldSlug}
          mapImageUrl={mapUrl}
          position={pendingPosition}
          folders={folders}
          onClose={() => setPendingPosition(null)}
          onCreated={(hotspot) => {
            setHotspots((current) => [...current, hotspot]);
            setPendingPosition(null);
          }}
        />
      )}
    </div>
  );
}
