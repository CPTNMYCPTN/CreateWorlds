"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ExternalLink,
  Map as MapIcon,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createHotspot, setWorldMap, updateHotspot, type CreateHotspotState } from "./actions";
import type { MapHotspot, MapHotspotLinkType, WorldFolder, WorldThread } from "./types";

const initialHotspotState: CreateHotspotState = { error: null };

type LinkDraft = {
  id?: string;
  type: "" | MapHotspotLinkType;
  target: string;
  label: string;
};

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

function LinkEditorRow({
  value,
  folders,
  onChange,
  onRemove,
}: {
  value: LinkDraft;
  folders: WorldFolder[];
  onChange: (next: LinkDraft) => void;
  onRemove: () => void;
}) {
  const hasFolders = folders.length > 0;
  const hasThreads = folders.some((folder) => folder.threads.length > 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Link {value.id ? "#" : ""}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <select
          value={value.type}
          onChange={(e) =>
            onChange({
              ...value,
              type: e.target.value as "" | MapHotspotLinkType,
              target: "",
            })
          }
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-[var(--world-accent)]/50"
        >
          <option value="">Select type</option>
          {hasFolders && <option value="folder">Folder</option>}
          {hasThreads && <option value="thread">Thread</option>}
          <option value="url">External URL</option>
        </select>

        {value.type === "folder" && (
          <select
            value={value.target}
            onChange={(e) => onChange({ ...value, target: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-[var(--world-accent)]/50"
          >
            <option value="">Choose a folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        )}

        {value.type === "thread" && (
          <select
            value={value.target}
            onChange={(e) => onChange({ ...value, target: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-[var(--world-accent)]/50"
          >
            <option value="">Choose a thread</option>
            {folders.map((folder) =>
              folder.threads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {folder.name} · {thread.title}
                </option>
              )),
            )}
          </select>
        )}

        {value.type === "url" && (
          <input
            value={value.target}
            onChange={(e) => onChange({ ...value, target: e.target.value })}
            type="url"
            placeholder="https://example.com"
            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent)]/50"
          />
        )}

        <input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          placeholder="Optional custom label"
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent)]/50"
        />
      </div>
    </div>
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
  const [label, setLabel] = useState("");
  const [links, setLinks] = useState<LinkDraft[]>([{ type: "", target: "", label: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
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
              <label htmlFor="hotspot-label" className="text-sm font-medium text-zinc-300">
                Label
              </label>
              <input
                id="hotspot-label"
                name="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                autoFocus
                placeholder="Capital City"
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent)]/50"
              />
            </div>

            <div className="flex flex-col gap-3">
              {links.map((link, index) => (
                <div key={index}>
                  <input type="hidden" name="linkType[]" value={link.type} />
                  <input type="hidden" name="linkId[]" value={link.target} />
                  <input type="hidden" name="linkLabel[]" value={link.label} />
                  <LinkEditorRow
                    value={link}
                    folders={folders}
                    onChange={(next) =>
                      setLinks((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                      )
                    }
                    onRemove={() =>
                      setLinks((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLinks((current) => [...current, { type: "", target: "", label: "" }])}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
            >
              + Add link
            </button>

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

function EditHotspotDialog({
  hotspot,
  worldSlug,
  folders,
  onClose,
  onUpdated,
}: {
  hotspot: MapHotspot;
  worldSlug: string;
  folders: WorldFolder[];
  onClose: () => void;
  onUpdated: (hotspot: MapHotspot) => void;
}) {
  const [label, setLabel] = useState(hotspot.label);
  const [links, setLinks] = useState<LinkDraft[]>(
    hotspot.links.map((link) => ({
      id: link.id,
      type: link.link_type,
      target: link.link_id,
      label: link.label ?? "",
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await updateHotspot(hotspot.id, worldSlug, formData);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onUpdated({
      ...hotspot,
      label,
      links: links
        .filter((link) => link.type && link.target)
        .map((link) => ({
          id: link.id ?? "",
          link_type: link.type as MapHotspotLinkType,
          link_id: link.target,
          label: link.label || null,
        })),
    });
    onClose();
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-zinc-50">
              Edit hotspot
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
              <label htmlFor="edit-hotspot-label" className="text-sm font-medium text-zinc-300">
                Label
              </label>
              <input
                id="edit-hotspot-label"
                name="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-[var(--world-accent)]/50"
              />
            </div>

            <div className="flex flex-col gap-3">
              {links.map((link, index) => (
                <div key={link.id ?? index}>
                  <input type="hidden" name="linkType[]" value={link.type} />
                  <input type="hidden" name="linkId[]" value={link.target} />
                  <input type="hidden" name="linkLabel[]" value={link.label} />
                  <LinkEditorRow
                    value={link}
                    folders={folders}
                    onChange={(next) =>
                      setLinks((current) =>
                        current.map((item, itemIndex) => (itemIndex === index ? next : item)),
                      )
                    }
                    onRemove={() =>
                      setLinks((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setLinks((current) => [...current, { type: "", target: "", label: "" }])}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
            >
              + Add link
            </button>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-[var(--world-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save hotspot"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function snippetOf(html: string, maxLength = 100): string {
  const text = stripHtml(html);
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}…` : text;
}

const HOTSPOT_CLOSE_DELAY_MS = 180;

function HotspotPin({
  hotspot,
  folders,
  threadSnippets,
  isOpen,
  onOpen,
  onClose,
  onToggleClick,
  onSelectThread,
  onNavigateFolder,
  onEdit,
}: {
  hotspot: MapHotspot;
  folders: WorldFolder[];
  threadSnippets: Record<string, string>;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggleClick: () => void;
  onSelectThread: (thread: WorldThread) => void;
  onNavigateFolder: (folderId: string) => void;
  onEdit: () => void;
}) {
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const threadMap = new Map(
    folders.flatMap((folder) => folder.threads.map((thread) => [thread.id, thread])),
  );

  const hasLinks = hotspot.links.length > 0;

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, HOTSPOT_CLOSE_DELAY_MS);
  }, [clearCloseTimer, onClose]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return (
    <div
      data-hotspot
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${hotspot.x_percent}%`, top: `${hotspot.y_percent}%` }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          clearCloseTimer();
          onToggleClick();
        }}
        onMouseEnter={() => {
          clearCloseTimer();
          onOpen();
        }}
        onMouseLeave={scheduleClose}
        className="block"
      >
        <MapPin className="h-7 w-7 fill-[var(--world-accent)] text-violet-200 drop-shadow-lg transition-transform hover:scale-110" />
      </button>

      {isOpen && (
        <div
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
          className="absolute bottom-full left-1/2 z-20 -translate-x-1/2 pb-2"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-64 rounded-xl border border-white/10 bg-zinc-900 p-3 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-100">{hotspot.label}</p>
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto">
              {hasLinks ? (
                hotspot.links.map((link) => {
                  if (link.link_type === "folder") {
                    const folder = folderMap.get(link.link_id);
                    const threadCount = folder?.threads.length ?? 0;
                    const threadTitles = folder?.threads.slice(0, 3).map((thread) => thread.title) ?? [];

                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => {
                          onNavigateFolder(link.link_id);
                        }}
                        className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left transition-colors hover:bg-white/5"
                      >
                        <div className="flex items-center gap-1 text-xs font-semibold text-[var(--world-accent)]">
                          <MapPin className="h-3 w-3" />
                          {link.label ?? folder?.name ?? "Folder"}
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {folder?.name ?? "Unknown folder"} · {threadCount} thread{threadCount === 1 ? "" : "s"}
                        </p>
                        {threadTitles.length > 0 && (
                          <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                            {threadTitles.map((title) => (
                              <li key={title}>• {title}</li>
                            ))}
                          </ul>
                        )}
                      </button>
                    );
                  }

                  if (link.link_type === "thread") {
                    const thread = threadMap.get(link.link_id);
                    const rawSnippet = threadSnippets[link.link_id];
                    return (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => { if (thread) onSelectThread(thread); }}
                        className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left transition-colors hover:bg-white/5"
                      >
                        <div className="flex items-center gap-1 text-xs font-semibold text-[var(--world-accent)]">
                          <MessageSquare className="h-3 w-3" />
                          {link.label ?? thread?.title ?? "Thread"}
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {thread?.title ?? "Unknown thread"}
                        </p>
                        {rawSnippet && (
                          <p className="mt-1 text-xs text-zinc-500">{snippetOf(rawSnippet)}</p>
                        )}
                      </button>
                    );
                  }

                  return (
                    <a
                      key={link.id}
                      href={link.link_id}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-left transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-center gap-1 text-xs font-semibold text-[var(--world-accent)]">
                        <ExternalLink className="h-3 w-3" />
                        {link.label || link.link_id}
                      </div>
                      <p className="mt-1 break-all text-xs text-zinc-400">{link.link_id}</p>
                    </a>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-500">No links yet</p>
              )}
            </div>
          </div>
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
  threadSnippets,
  isOwner,
  folders,
  onSelectThread,
  onNavigateFolder,
}: {
  worldId: string;
  worldSlug: string;
  mapUrl: string | null;
  hotspots: MapHotspot[];
  threadSnippets: Record<string, string>;
  isOwner: boolean;
  folders: WorldFolder[];
  onSelectThread: (thread: WorldThread) => void;
  onNavigateFolder?: (folderId: string) => void;
}) {
  const [mapUrl, setMapUrl] = useState(initialMapUrl);
  const [hotspots, setHotspots] = useState(initialHotspots);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [openHotspotId, setOpenHotspotId] = useState<string | null>(null);
  const [editHotspotId, setEditHotspotId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value));
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = element.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      const nextZoom = clamp(zoom * factor, 1, 3);

      const worldX = (relativeX - pan.x) / zoom;
      const worldY = (relativeY - pan.y) / zoom;
      const nextPanX = relativeX - worldX * nextZoom;
      const nextPanY = relativeY - worldY * nextZoom;

      setZoom(nextZoom);
      setPan({ x: nextPanX, y: nextPanY });
    };

    element.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, [clamp, pan, zoom]);

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

    const newMapUrl = supabase.storage.from("world-maps").getPublicUrl(path).data.publicUrl;

    const result = await setWorldMap(worldId, worldSlug, newMapUrl);
    setUploading(false);

    if (result.error) {
      setUploadError(result.error);
    } else {
      setMapUrl(newMapUrl);
      setHotspots([]);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleZoom(delta: number) {
    setZoom((current) => clamp(current * delta, 1, 3));
  }

  function handleMapPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;

    if (e.target instanceof HTMLElement && e.target.closest("[data-hotspot]")) {
      return;
    }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    setIsDragging(false);
    setIsPanning(zoom > 1);
  }

  function handleMapPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current || !isPanning) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      setIsDragging(true);
    }

    setPan({
      x: dragStartRef.current.originX + dx,
      y: dragStartRef.current.originY + dy,
    });
  }

  function handleMapPointerUp() {
    if (!dragStartRef.current) {
      return;
    }

    if (!isDragging) {
      setIsPanning(false);
    }

    dragStartRef.current = null;
  }

  function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (isDragging || isPanning) {
      setIsDragging(false);
      setIsPanning(false);
      return;
    }

    setOpenHotspotId(null);
    if (!isOwner) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;
    const x = clamp((rawX / rect.width) * 100, 0, 100);
    const y = clamp((rawY / rect.height) * 100, 0, 100);
    setPendingPosition({ x, y });
  }

  if (!mapUrl) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
        <MapIcon className="h-10 w-10 text-zinc-600" />
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {isOwner
            ? "Click anywhere on the map to add a hotspot."
            : "Click a pin to see more."}
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => handleZoom(1.1)}
              className="rounded-md p-1.5 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(1 / 1.1)}
              className="rounded-md p-1.5 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="rounded-md p-1.5 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Reset view"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          {isOwner && (
            <MapUploadInput label="Replace Map" pending={uploading} onUpload={handleUpload} />
          )}
        </div>
      </div>

      {uploadError && <p className="mb-3 text-sm text-red-400">{uploadError}</p>}

      <div
        ref={viewportRef}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={handleMapPointerUp}
        onPointerLeave={handleMapPointerUp}
        onClick={handleMapClick}
        className={`relative w-full overflow-hidden rounded-xl border border-white/10 bg-black/20 ${isOwner ? "cursor-crosshair" : ""}`}
      >
        <div
          className="relative h-full w-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mapUrl}
            alt="World map"
            className="block w-full select-none"
            draggable={false}
          />

          {hotspots.map((hotspot) => (
            <HotspotPin
              key={hotspot.id}
              hotspot={hotspot}
              folders={folders}
              threadSnippets={threadSnippets}
              isOpen={openHotspotId === hotspot.id}
              onOpen={() => setOpenHotspotId(hotspot.id)}
              onClose={() =>
                setOpenHotspotId((current) => (current === hotspot.id ? null : current))
              }
              onToggleClick={() =>
                setOpenHotspotId((current) => (current === hotspot.id ? null : hotspot.id))
              }
              onSelectThread={onSelectThread}
              onNavigateFolder={onNavigateFolder ?? (() => {})}
              onEdit={() => setEditHotspotId(hotspot.id)}
            />
          ))}
        </div>
      </div>

      {editHotspotId && (
        <EditHotspotDialog
          hotspot={hotspots.find((item) => item.id === editHotspotId)!}
          worldSlug={worldSlug}
          folders={folders}
          onClose={() => setEditHotspotId(null)}
          onUpdated={(updated) => {
            setHotspots((current) =>
              current.map((item) => (item.id === updated.id ? updated : item)),
            );
          }}
        />
      )}

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
