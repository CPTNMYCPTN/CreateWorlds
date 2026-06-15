"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { MapHotspot, MapHotspotLinkType, OwnedCharacter, WorldCharacter } from "./types";

export type CreateFolderState = {
  error: string | null;
  folder?: { id: string; name: string };
};

export async function createFolder(
  worldId: string,
  worldSlug: string,
  _prevState: CreateFolderState,
  formData: FormData,
): Promise<CreateFolderState> {
  const supabase = await createClient();

  const name = ((formData.get("name") as string) ?? "").trim();

  if (!name) {
    return { error: "Folder name is required." };
  }

  const { data, error } = await supabase
    .from("world_folders")
    .insert({ world_id: worldId, name })
    .select("id, name")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return { error: null, folder: data };
}

export type CreateThreadState = {
  error: string | null;
  thread?: {
    id: string;
    folder_id: string;
    title: string;
    is_pinned: boolean;
    is_locked: boolean;
  };
};

export async function createThread(
  worldId: string,
  folderId: string,
  worldSlug: string,
  _prevState: CreateThreadState,
  formData: FormData,
): Promise<CreateThreadState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a thread." };
  }

  const title = ((formData.get("title") as string) ?? "").trim();

  if (!title) {
    return { error: "Thread title is required." };
  }

  const { data, error } = await supabase
    .from("world_threads")
    .insert({
      world_id: worldId,
      folder_id: folderId,
      author_id: user.id,
      title,
    })
    .select("id, folder_id, title, is_pinned, is_locked")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return { error: null, thread: data };
}

export type ThreadPostAuthor = {
  username: string;
  avatar_url: string | null;
};

export type ThreadPost = {
  id: string;
  content: string;
  created_at: string;
  author: ThreadPostAuthor | null;
};

export async function getThreadPosts(threadId: string): Promise<ThreadPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("world_posts")
    .select("id, content, created_at, author:profiles(username, avatar_url)")
    .eq("thread_id", threadId)
    .order("created_at");

  if (error || !data) {
    return [];
  }

  return data as unknown as ThreadPost[];
}

export type CreatePostState = {
  error: string | null;
  post?: ThreadPost;
};

export async function createPost(
  worldId: string,
  threadId: string,
  worldSlug: string,
  _prevState: CreatePostState,
  formData: FormData,
): Promise<CreatePostState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to post." };
  }

  const content = ((formData.get("content") as string) ?? "").trim();

  if (!content) {
    return { error: "Post content is required." };
  }

  const { data, error } = await supabase
    .from("world_posts")
    .insert({
      world_id: worldId,
      thread_id: threadId,
      author_id: user.id,
      content,
    })
    .select("id, content, created_at, author:profiles(username, avatar_url)")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return { error: null, post: data as unknown as ThreadPost };
}

export type SetWorldMapState = {
  error: string | null;
  mapUrl?: string;
};

export async function setWorldMap(
  worldId: string,
  worldSlug: string,
  mapUrl: string,
): Promise<SetWorldMapState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update the map." };
  }

  const { error } = await supabase
    .from("worlds")
    .update({ map_url: mapUrl })
    .eq("id", worldId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return { error: null, mapUrl };
}

export type CreateHotspotState = {
  error: string | null;
  hotspot?: MapHotspot;
};

const HOTSPOT_LINK_TYPES: MapHotspotLinkType[] = ["folder", "thread", "url"];

export async function createHotspot(
  worldId: string,
  worldSlug: string,
  mapImageUrl: string,
  xPercent: number,
  yPercent: number,
  _prevState: CreateHotspotState,
  formData: FormData,
): Promise<CreateHotspotState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to add a hotspot." };
  }

  const label = ((formData.get("label") as string) ?? "").trim();
  const linkTypeRaw = (formData.get("linkType") as string) ?? "";
  const linkId = ((formData.get("linkId") as string) ?? "").trim();

  if (!label) {
    return { error: "Label is required." };
  }

  let linkType: MapHotspotLinkType | null = null;

  if (linkTypeRaw) {
    if (!HOTSPOT_LINK_TYPES.includes(linkTypeRaw as MapHotspotLinkType)) {
      return { error: "Invalid link type." };
    }
    if (!linkId) {
      return { error: "Please choose a link target." };
    }
    linkType = linkTypeRaw as MapHotspotLinkType;
  }

  const { data, error } = await supabase
    .from("world_map_hotspots")
    .insert({
      world_id: worldId,
      map_image_url: mapImageUrl,
      label,
      link_type: linkType,
      link_id: linkType ? linkId : null,
      x_percent: xPercent,
      y_percent: yPercent,
    })
    .select("id, label, link_type, link_id, x_percent, y_percent")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return { error: null, hotspot: data };
}

export async function getMyCharacters(): Promise<OwnedCharacter[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("characters")
    .select("id, name, avatar_url")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export type ImportCharacterState = {
  error: string | null;
  worldCharacter?: WorldCharacter;
};

export async function importCharacter(
  worldId: string,
  worldSlug: string,
  characterId: string,
): Promise<ImportCharacterState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to import a character." };
  }

  const { data, error } = await supabase
    .from("world_characters")
    .insert({ world_id: worldId, character_id: characterId })
    .select("id, character:characters(id, name, avatar_url)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This character is already in this world." };
    }
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return { error: null, worldCharacter: data as unknown as WorldCharacter };
}
