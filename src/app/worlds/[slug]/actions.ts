"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type {
  HeaderStyle,
  MapHotspot,
  MapHotspotLinkType,
  OwnedCharacter,
  WorldCharacter,
  WorldFontFamily,
  WorldSettings,
  WorldTheme,
} from "./types";

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

export type ThreadPostCharacter = {
  id: string;
  name: string;
  avatar_url: string | null;
};

export type ThreadPost = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  character_id: string | null;
  author: ThreadPostAuthor | null;
  character: ThreadPostCharacter | null;
};

export async function getThreadPosts(threadId: string): Promise<ThreadPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("world_posts")
    .select(
      "id, content, created_at, author_id, character_id, author:profiles(username, avatar_url), character:characters(id, name, avatar_url)",
    )
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
  const characterIdRaw = (formData.get("characterId") as string) ?? "";
  const characterId = characterIdRaw || null;

  if (!content) {
    return { error: "Post content is required." };
  }

  if (characterId) {
    const { data: importedCharacter, error: importedCharacterError } =
      await supabase
        .from("world_characters")
        .select("character_id")
        .eq("world_id", worldId)
        .eq("character_id", characterId)
        .maybeSingle();

    if (importedCharacterError || !importedCharacter) {
      return { error: "Selected character is not available in this world." };
    }

    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("owner_id")
      .eq("id", characterId)
      .single();

    if (characterError || !character || character.owner_id !== user.id) {
      return { error: "You can only post as characters you own." };
    }
  }

  const { data, error } = await supabase
    .from("world_posts")
    .insert({
      world_id: worldId,
      thread_id: threadId,
      author_id: user.id,
      character_id: characterId,
      content,
    })
    .select(
      "id, content, created_at, author_id, character_id, author:profiles(username, avatar_url), character:characters(id, name, avatar_url)",
    )
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

export type UpdateHotspotState = {
  error: string | null;
  hotspot?: MapHotspot;
};

const HOTSPOT_LINK_TYPES: MapHotspotLinkType[] = ["folder", "thread", "url"];

function parseLinkEntries(formData: FormData) {
  const linkTypes = (formData.getAll("linkType[]") as string[]).map((value) => value.trim());
  const linkIds = (formData.getAll("linkId[]") as string[]).map((value) => value.trim());
  const linkLabels = (formData.getAll("linkLabel[]") as string[]).map((value) => value.trim());

  const entries = linkTypes
    .map((rawType, index) => {
      const linkType = rawType as MapHotspotLinkType;
      const linkId = linkIds[index] ?? "";
      const label = linkLabels[index] ?? "";

      if (!HOTSPOT_LINK_TYPES.includes(linkType) || !linkId) {
        return null;
      }

      return {
        link_type: linkType,
        link_id: linkId,
        label: label || null,
      };
    })
    .filter(Boolean) as Array<{
      link_type: MapHotspotLinkType;
      link_id: string;
      label: string | null;
    }>;

  return entries;
}

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

  if (!label) {
    return { error: "Label is required." };
  }

  const linkEntries = parseLinkEntries(formData);

  const { data: hotspot, error: hotspotError } = await supabase
    .from("world_map_hotspots")
    .insert({
      world_id: worldId,
      map_image_url: mapImageUrl,
      label,
      x_percent: xPercent,
      y_percent: yPercent,
    })
    .select("id, label, x_percent, y_percent")
    .single();

  if (hotspotError || !hotspot) {
    return { error: hotspotError?.message ?? "Could not create hotspot." };
  }

  if (linkEntries.length > 0) {
    const { error: linksError } = await supabase.from("world_hotspot_links").insert(
      linkEntries.map((entry) => ({
        hotspot_id: hotspot.id,
        ...entry,
      })),
    );

    if (linksError) {
      return { error: linksError.message };
    }
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return {
    error: null,
    hotspot: {
      ...hotspot,
      links: linkEntries.map((entry) => ({
        id: "",
        ...entry,
      })),
    },
  };
}

export async function updateHotspot(
  hotspotId: string,
  worldSlug: string,
  formData: FormData,
): Promise<UpdateHotspotState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update the hotspot." };
  }

  const label = ((formData.get("label") as string) ?? "").trim();

  if (!label) {
    return { error: "Label is required." };
  }

  const { data: hotspotRow, error: hotspotLookupError } = await supabase
    .from("world_map_hotspots")
    .select("world_id")
    .eq("id", hotspotId)
    .single();

  if (hotspotLookupError || !hotspotRow) {
    return { error: hotspotLookupError?.message ?? "Hotspot not found." };
  }

  const { data: worldRow, error: worldLookupError } = await supabase
    .from("worlds")
    .select("owner_id")
    .eq("id", hotspotRow.world_id)
    .single();

  if (worldLookupError || !worldRow || worldRow.owner_id !== user.id) {
    return { error: "Only the world owner can update this hotspot." };
  }

  const linkEntries = parseLinkEntries(formData);

  const { error: updateError } = await supabase
    .from("world_map_hotspots")
    .update({ label })
    .eq("id", hotspotId);

  if (updateError) {
    return { error: updateError.message };
  }

  const { error: deleteError } = await supabase
    .from("world_hotspot_links")
    .delete()
    .eq("hotspot_id", hotspotId);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (linkEntries.length > 0) {
    const { error: insertError } = await supabase.from("world_hotspot_links").insert(
      linkEntries.map((entry) => ({
        hotspot_id: hotspotId,
        ...entry,
      })),
    );

    if (insertError) {
      return { error: insertError.message };
    }
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return { error: null };
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

export async function getWorldPostCharacters(
  worldId: string,
): Promise<OwnedCharacter[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: worldCharacterRows, error: worldCharactersError } = await supabase
    .from("world_characters")
    .select("character_id")
    .eq("world_id", worldId);

  if (worldCharactersError || !worldCharacterRows) {
    return [];
  }

  const importedCharacterIds = worldCharacterRows
    .map((row) => row.character_id)
    .filter(Boolean);

  if (importedCharacterIds.length === 0) {
    return [];
  }

  const { data: characters, error: charactersError } = await supabase
    .from("characters")
    .select("id, name, avatar_url")
    .in("id", importedCharacterIds)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (charactersError || !characters) {
    return [];
  }

  return characters;
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

export type UpdateWorldThemeState = {
  error: string | null;
  theme?: WorldTheme;
};

export type UpdateWorldVisibilityState = {
  error: string | null;
  isPublic?: boolean;
};

export type WorldInvite = {
  id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
};

const HEADER_STYLES: HeaderStyle[] = ["solid", "gradient", "transparent"];
const FONT_FAMILIES: WorldFontFamily[] = ["default", "serif", "mono", "fantasy"];
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 8; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

export async function createWorldInvite(
  worldId: string,
  worldSlug: string,
  expiryOption: string,
  maxUsesOption: string,
): Promise<{ error: string | null; invite?: WorldInvite }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create invites." };
  }

  const { data: world, error: fetchError } = await supabase
    .from("worlds")
    .select("owner_id")
    .eq("id", worldId)
    .single();

  if (fetchError || !world) {
    return { error: fetchError?.message ?? "World not found." };
  }

  if (world.owner_id !== user.id) {
    return { error: "Only the world owner can manage invites." };
  }

  const expiryDays =
    expiryOption === "1"
      ? 1
      : expiryOption === "7"
        ? 7
        : expiryOption === "30"
          ? 30
          : null;

  const maxUses =
    maxUsesOption === "1"
      ? 1
      : maxUsesOption === "5"
        ? 5
        : maxUsesOption === "25"
          ? 25
          : null;

  let code = "";
  let invite: WorldInvite | null = null;
  let attempts = 0;

  while (!invite && attempts < 5) {
    code = generateInviteCode();
    const { data, error } = await supabase
      .from("world_invites")
      .insert({
        world_id: worldId,
        code,
        created_by: user.id,
        expires_at: expiryDays
          ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
          : null,
        max_uses: maxUses,
      })
      .select("id, code, created_at, expires_at, max_uses, uses")
      .single();

    if (error) {
      if (error.code === "23505") {
        attempts += 1;
        continue;
      }
      return { error: error.message };
    }

    invite = data as WorldInvite;
  }

  if (!invite) {
    return { error: "Unable to generate a unique invite code." };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}/settings`);
  return { error: null, invite };
}

export async function deleteWorldInvite(
  worldId: string,
  worldSlug: string,
  inviteId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to revoke invites." };
  }

  const { data: world, error: fetchError } = await supabase
    .from("worlds")
    .select("owner_id")
    .eq("id", worldId)
    .single();

  if (fetchError || !world) {
    return { error: fetchError?.message ?? "World not found." };
  }

  if (world.owner_id !== user.id) {
    return { error: "Only the world owner can revoke invites." };
  }

  const { error } = await supabase
    .from("world_invites")
    .delete()
    .eq("id", inviteId)
    .eq("world_id", worldId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  return { error: null };
}

export async function updateWorldVisibility(
  worldId: string,
  worldSlug: string,
  _prevState: UpdateWorldVisibilityState,
  formData: FormData,
): Promise<UpdateWorldVisibilityState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update visibility settings." };
  }

  const visibilityRaw = (formData.get("visibility") as string) ?? "";

  if (visibilityRaw !== "public" && visibilityRaw !== "private") {
    return { error: "Invalid visibility setting." };
  }

  const isPublic = visibilityRaw === "public";

  const { data: world, error: fetchError } = await supabase
    .from("worlds")
    .select("owner_id")
    .eq("id", worldId)
    .single();

  if (fetchError || !world) {
    return { error: fetchError?.message ?? "World not found." };
  }

  if (world.owner_id !== user.id) {
    return { error: "Only the world owner can update visibility settings." };
  }

  const { error } = await supabase
    .from("worlds")
    .update({ is_public: isPublic })
    .eq("id", worldId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}/settings`);
  return { error: null, isPublic };
}

export async function updateWorldTheme(
  worldId: string,
  worldSlug: string,
  _prevState: UpdateWorldThemeState,
  formData: FormData,
): Promise<UpdateWorldThemeState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to update theme settings." };
  }

  const accentColor = (formData.get("accentColor") as string) ?? "";
  const bgColor = (formData.get("bgColor") as string) ?? "";
  const headerStyleRaw = (formData.get("headerStyle") as string) ?? "";
  const fontFamilyRaw = (formData.get("fontFamily") as string) ?? "";
  const customCss = ((formData.get("customCss") as string) ?? "").slice(0, 20000);

  if (!HEX_COLOR_PATTERN.test(accentColor) || !HEX_COLOR_PATTERN.test(bgColor)) {
    return { error: "Colors must be valid hex values." };
  }

  if (!HEADER_STYLES.includes(headerStyleRaw as HeaderStyle)) {
    return { error: "Invalid header style." };
  }

  if (!FONT_FAMILIES.includes(fontFamilyRaw as WorldFontFamily)) {
    return { error: "Invalid font family." };
  }

  const theme: WorldTheme = {
    accentColor,
    bgColor,
    headerStyle: headerStyleRaw as HeaderStyle,
    fontFamily: fontFamilyRaw as WorldFontFamily,
    customCss,
  };

  const { data: world, error: fetchError } = await supabase
    .from("worlds")
    .select("settings, owner_id")
    .eq("id", worldId)
    .single();

  if (fetchError || !world) {
    return { error: fetchError?.message ?? "World not found." };
  }

  if (world.owner_id !== user.id) {
    return { error: "Only the world owner can update theme settings." };
  }

  const settings: WorldSettings = {
    ...(world.settings as WorldSettings),
    theme,
  };

  const { error } = await supabase
    .from("worlds")
    .update({ settings })
    .eq("id", worldId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/worlds/${worldSlug}`);
  revalidatePath(`/worlds/${worldSlug}/settings`);
  return { error: null, theme };
}
