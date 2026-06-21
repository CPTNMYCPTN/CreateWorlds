import type { WikiPageSummary } from "../types";

const WIKI_LINK_PATTERN =
  /<span data-wiki-link="true" data-page-id="([0-9a-fA-F-]+)"[^>]*>([\s\S]*?)<\/span>/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolves WikiLink atom nodes embedded in saved page HTML against the
 * world's current page list. Found links always render the CURRENT title
 * (not the title stored at insert time) so renames propagate automatically;
 * links to deleted pages render as a muted, non-clickable "broken" span.
 */
export function renderWikiContent(
  html: string,
  pages: WikiPageSummary[],
  worldSlug: string,
): string {
  if (!html) {
    return html;
  }

  const pageMap = new Map(pages.map((page) => [page.id, page]));

  return html.replace(WIKI_LINK_PATTERN, (_match, pageId: string, labelHtml: string) => {
    const page = pageMap.get(pageId);

    if (page) {
      const href = `/worlds/${worldSlug}/wiki/${page.slug}`;
      return `<a href="${href}" class="wiki-link" data-wiki-link="true" data-page-id="${pageId}">${escapeHtml(page.title)}</a>`;
    }

    return `<span class="wiki-link wiki-link-broken" data-wiki-link="true" data-page-id="${pageId}">${labelHtml}</span>`;
  });
}
