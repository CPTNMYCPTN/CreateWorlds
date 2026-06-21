"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { logWikiError } from "./log-error";

const RESERVED_SLUGS = new Set(["new"]);

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Mirrors the owner-or-admin check used for the Members tab (see
// updateMemberRole/removeMember in ../actions.ts) — there is no SQL
// is_world_admin function, this is the equivalent JS-side check.
async function isWorldOwnerOrAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  worldId: string,
  userId: string,
): Promise<boolean> {
  const { data: worldRow, error: worldError } = await supabase
    .from("worlds")
    .select("owner_id")
    .eq("id", worldId)
    .single();

  logWikiError("world owner lookup failed", worldError);

  if (worldRow?.owner_id === userId) {
    return true;
  }

  const { data: memberRow, error: memberError } = await supabase
    .from("world_members")
    .select("role")
    .eq("world_id", worldId)
    .eq("user_id", userId)
    .maybeSingle();

  logWikiError("member role lookup failed", memberError);

  return memberRow?.role === "admin";
}

async function generateUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  worldId: string,
  title: string,
  excludePageId?: string,
): Promise<string> {
  const base = slugify(title) || "page";
  let candidate = base;
  let suffix = 2;

  while (true) {
    const reserved = RESERVED_SLUGS.has(candidate);

    let query = supabase
      .from("wiki_pages")
      .select("id")
      .eq("world_id", worldId)
      .eq("slug", candidate);

    if (excludePageId) {
      query = query.neq("id", excludePageId);
    }

    const { data, error } = await query.maybeSingle();

    logWikiError("slug uniqueness check failed", error);

    if (!reserved && !data) {
      return candidate;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function countSiblings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  worldId: string,
  parentPageId: string | null,
): Promise<number> {
  let query = supabase
    .from("wiki_pages")
    .select("*", { count: "exact", head: true })
    .eq("world_id", worldId);

  query = parentPageId
    ? query.eq("parent_page_id", parentPageId)
    : query.is("parent_page_id", null);

  const { count, error } = await query;

  logWikiError("sibling count failed", error);

  return count ?? 0;
}

async function validateParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  worldId: string,
  parentPageId: string,
  selfId?: string,
): Promise<string | null> {
  if (parentPageId === selfId) {
    return "A page can't be its own parent.";
  }

  const { data: parentRow, error: parentError } = await supabase
    .from("wiki_pages")
    .select("id, world_id, parent_page_id")
    .eq("id", parentPageId)
    .maybeSingle();

  logWikiError("parent page lookup failed", parentError);

  if (!parentRow || parentRow.world_id !== worldId) {
    return "Selected parent page is not valid.";
  }

  // Guards against the immediate one-level cycle (assigning a direct child
  // as the new parent). Deeper cycles are not checked for v1 — see the
  // implementation notes shared alongside this feature.
  if (selfId && parentRow.parent_page_id === selfId) {
    return "Can't set a child page as the parent — that would create a loop.";
  }

  return null;
}

export type WikiPageFormState = {
  error: string | null;
};

export async function createWikiPage(
  worldId: string,
  worldSlug: string,
  _prevState: WikiPageFormState,
  formData: FormData,
): Promise<WikiPageFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a wiki page." };
  }

  const isAllowed = await isWorldOwnerOrAdmin(supabase, worldId, user.id);

  if (!isAllowed) {
    return { error: "Only the world owner or an admin can create wiki pages." };
  }

  const title = ((formData.get("title") as string) ?? "").trim();
  const content = (formData.get("content") as string) ?? "";
  const parentPageIdRaw = (formData.get("parentPageId") as string) ?? "";
  const parentPageId = parentPageIdRaw || null;

  if (!title) {
    return { error: "Title is required." };
  }

  if (parentPageId) {
    const parentError = await validateParent(supabase, worldId, parentPageId);
    if (parentError) {
      return { error: parentError };
    }
  }

  const slug = await generateUniqueSlug(supabase, worldId, title);
  const position = await countSiblings(supabase, worldId, parentPageId);

  const { data: page, error: insertError } = await supabase
    .from("wiki_pages")
    .insert({
      world_id: worldId,
      parent_page_id: parentPageId,
      slug,
      title,
      content,
      position,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (insertError) {
    logWikiError("createWikiPage insert failed", insertError);
    return { error: insertError.message };
  }

  revalidatePath(`/worlds/${worldSlug}/wiki`);
  redirect(`/worlds/${worldSlug}/wiki/${page.slug}`);
}

export async function updateWikiPage(
  pageId: string,
  worldId: string,
  worldSlug: string,
  currentSlug: string,
  _prevState: WikiPageFormState,
  formData: FormData,
): Promise<WikiPageFormState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to edit a wiki page." };
  }

  const isAllowed = await isWorldOwnerOrAdmin(supabase, worldId, user.id);

  if (!isAllowed) {
    return { error: "Only the world owner or an admin can edit wiki pages." };
  }

  const title = ((formData.get("title") as string) ?? "").trim();
  const content = (formData.get("content") as string) ?? "";
  const parentPageIdRaw = (formData.get("parentPageId") as string) ?? "";
  const parentPageId = parentPageIdRaw || null;
  const requestedSlugRaw = ((formData.get("slug") as string) ?? "").trim();

  if (!title) {
    return { error: "Title is required." };
  }

  if (parentPageId) {
    const parentError = await validateParent(supabase, worldId, parentPageId, pageId);
    if (parentError) {
      return { error: parentError };
    }
  }

  const slug = await generateUniqueSlug(supabase, worldId, requestedSlugRaw || title, pageId);

  const { error: updateError } = await supabase
    .from("wiki_pages")
    .update({
      title,
      content,
      parent_page_id: parentPageId,
      slug,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pageId);

  if (updateError) {
    logWikiError("updateWikiPage failed", updateError);
    return { error: updateError.message };
  }

  revalidatePath(`/worlds/${worldSlug}/wiki`);
  revalidatePath(`/worlds/${worldSlug}/wiki/${currentSlug}`);
  if (slug !== currentSlug) {
    revalidatePath(`/worlds/${worldSlug}/wiki/${slug}`);
  }
  redirect(`/worlds/${worldSlug}/wiki/${slug}`);
}

export type DeleteWikiPageState = {
  error: string | null;
};

export async function deleteWikiPage(
  pageId: string,
  worldId: string,
  worldSlug: string,
): Promise<DeleteWikiPageState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to delete a wiki page." };
  }

  const isAllowed = await isWorldOwnerOrAdmin(supabase, worldId, user.id);

  if (!isAllowed) {
    return { error: "Only the world owner or an admin can delete wiki pages." };
  }

  const { error: deleteError } = await supabase.from("wiki_pages").delete().eq("id", pageId);

  if (deleteError) {
    logWikiError("deleteWikiPage failed", deleteError);
    return { error: deleteError.message };
  }

  revalidatePath(`/worlds/${worldSlug}/wiki`);
  return { error: null };
}
