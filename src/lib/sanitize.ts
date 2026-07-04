// src/lib/sanitize.ts
//
// Server-side HTML sanitizer for user-authored rich text (forum posts,
// wiki pages). Tiptap constrains what the *editor* produces, but nothing
// stops a client from calling the server actions directly with arbitrary
// HTML — so everything must be sanitized before it's stored.
//
// Requires: npm install isomorphic-dompurify

import DOMPurify from "isomorphic-dompurify";

// Tags Tiptap's StarterKit + your enabled extensions actually emit.
const ALLOWED_TAGS = [
  // Block
  "p", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre", "hr", "br",
  "ul", "ol", "li",
  // Tables (extension-table)
  "table", "thead", "tbody", "tr", "th", "td",
  // Inline marks
  "strong", "b", "em", "i", "u", "s", "strike",
  "sub", "sup", "mark", "code",
  // Links, images, and your WikiLink/ForumLink atom spans
  "a", "img", "span",
];

const ALLOWED_ATTR = [
  // Links
  "href", "target", "rel",
  // Images
  "src", "alt", "width", "height",
  // Color / Highlight / TextAlign / TextStyle extensions write inline styles.
  // Note: DOMPurify passes style attribute VALUES through as-is — no CSS
  // parsing. Not an XSS vector in modern browsers (no expression()/JS-in-CSS);
  // worst case is a url() tracking pixel in a background-image.
  "style",
  // Table cell spans
  "colspan", "rowspan",
  // WikiLink / ForumLink atoms — must survive the round trip so
  // renderWikiContent / resolveForumLinks can resolve them at render time.
  "data-wiki-link", "data-forum-link",
  "data-page-id", "data-target-type", "data-target-id",
];

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Belt and suspenders: even though script/iframe aren't in ALLOWED_TAGS,
    // forbid them explicitly so a future allowlist edit can't reintroduce them.
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["srcset", "formaction", "xlink:href"],
    // Blocks javascript:, data:, vbscript: URIs in href/src.
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}
