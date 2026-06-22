import type { WikiPageSummary } from "../types";

const WIKI_LINK_PATTERN =
  /<span data-wiki-link="true" data-page-id="([0-9a-fA-F-]+)"[^>]*>([\s\S]*?)<\/span>/g;

const FORUM_LINK_PATTERN =
  /<span data-forum-link="true" data-target-type="(thread|folder)" data-target-id="([0-9a-fA-F-]+)"[^>]*>([\s\S]*?)<\/span>/g;

export type ForumThreadSummary = { id: string; title: string };
export type ForumFolderSummary = { id: string; name: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolves ForumLink atom nodes embedded in saved content against the
 * world's current threads/folders. Found links always render the CURRENT
 * title/name (not the label stored at insert time) so renames propagate
 * automatically; links to deleted targets render as a muted, non-clickable
 * "broken" span — same pattern as resolveWikiLinks below.
 */
export function resolveForumLinks(
  html: string,
  threads: ForumThreadSummary[],
  folders: ForumFolderSummary[],
  worldSlug: string,
): string {
  if (!html) {
    return html;
  }

  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));

  return html.replace(
    FORUM_LINK_PATTERN,
    (_match, targetType: string, targetId: string, labelHtml: string) => {
      if (targetType === "thread") {
        const thread = threadMap.get(targetId);
        if (thread) {
          const href = `/worlds/${worldSlug}?thread=${targetId}`;
          return `<a href="${href}" class="forum-link" data-forum-link="true" data-target-type="thread" data-target-id="${targetId}">${escapeHtml(thread.title)}</a>`;
        }
      } else if (targetType === "folder") {
        const folder = folderMap.get(targetId);
        if (folder) {
          const href = `/worlds/${worldSlug}?folder=${targetId}`;
          return `<a href="${href}" class="forum-link" data-forum-link="true" data-target-type="folder" data-target-id="${targetId}">${escapeHtml(folder.name)}</a>`;
        }
      }

      return `<span class="forum-link forum-link-broken" data-forum-link="true" data-target-type="${targetType}" data-target-id="${targetId}">${labelHtml}</span>`;
    },
  );
}

/**
 * Resolves WikiLink atom nodes embedded in saved page HTML against the
 * world's current page list. Found links always render the CURRENT title
 * (not the title stored at insert time) so renames propagate automatically;
 * links to deleted pages render as a muted, non-clickable "broken" span.
 *
 * threads/folders are optional: when provided, ForumLink nodes in the same
 * content are resolved too (used for forum posts and, eventually, wiki pages
 * that reference forum content).
 */
export function renderWikiContent(
  html: string,
  pages: WikiPageSummary[],
  worldSlug: string,
  threads?: ForumThreadSummary[],
  folders?: ForumFolderSummary[],
): string {
  if (!html) {
    return html;
  }

  const pageMap = new Map(pages.map((page) => [page.id, page]));

  let resolved = html.replace(WIKI_LINK_PATTERN, (_match, pageId: string, labelHtml: string) => {
    const page = pageMap.get(pageId);

    if (page) {
      const href = `/worlds/${worldSlug}/wiki/${page.slug}`;
      return `<a href="${href}" class="wiki-link" data-wiki-link="true" data-page-id="${pageId}">${escapeHtml(page.title)}</a>`;
    }

    return `<span class="wiki-link wiki-link-broken" data-wiki-link="true" data-page-id="${pageId}">${labelHtml}</span>`;
  });

  if (threads || folders) {
    resolved = resolveForumLinks(resolved, threads ?? [], folders ?? [], worldSlug);
  }

  return resolved;
}
