"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, ChevronRight, FileText, Plus } from "lucide-react";
import type { WikiPageTreeItem } from "../types";

function buildChildrenMap(items: WikiPageTreeItem[]) {
  const map = new Map<string | null, WikiPageTreeItem[]>();

  for (const item of items) {
    const key = item.parent_page_id;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  return map;
}

function WikiTreeNode({
  item,
  childrenMap,
  depth,
  worldSlug,
  activeSlug,
  visited,
}: {
  item: WikiPageTreeItem;
  childrenMap: Map<string | null, WikiPageTreeItem[]>;
  depth: number;
  worldSlug: string;
  activeSlug: string | null;
  visited: Set<string>;
}) {
  const [open, setOpen] = useState(true);

  // Defensive backstop independent of the server-side cycle check in
  // wiki/actions.ts — if a cycle ever existed in the data for any reason,
  // skip re-rendering an already-visited node rather than recursing forever.
  if (visited.has(item.id)) {
    return null;
  }

  const childVisited = new Set(visited).add(item.id);
  const children = childrenMap.get(item.id) ?? [];
  const hasChildren = children.length > 0;
  const isActive = item.slug === activeSlug;

  return (
    <div>
      <div
        className="flex items-center gap-1 pr-2"
        style={{ paddingLeft: `${depth * 14}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-block h-3.5 w-3.5 shrink-0" />
        )}

        <Link
          href={`/worlds/${worldSlug}/wiki/${item.slug}`}
          className={`flex min-w-0 flex-1 items-center gap-2 truncate rounded-lg px-2 py-1.5 text-sm transition-colors ${
            isActive
              ? "bg-white/10 text-white"
              : "text-zinc-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <span className="truncate">{item.title}</span>
        </Link>
      </div>

      {open && hasChildren && (
        <div>
          {children.map((child) => (
            <WikiTreeNode
              key={child.id}
              item={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              worldSlug={worldSlug}
              activeSlug={activeSlug}
              visited={childVisited}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WikiSidebar({
  worldSlug,
  pages,
  canManage,
}: {
  worldSlug: string;
  pages: WikiPageTreeItem[];
  canManage: boolean;
}) {
  const pathname = usePathname();
  const activeSlug = useMemo(() => {
    const prefix = `/worlds/${worldSlug}/wiki/`;
    if (!pathname.startsWith(prefix)) {
      return null;
    }
    const rest = pathname.slice(prefix.length);
    const [slugSegment] = rest.split("/");
    return slugSegment && slugSegment !== "new" ? slugSegment : null;
  }, [pathname, worldSlug]);

  const childrenMap = useMemo(() => buildChildrenMap(pages), [pages]);
  const roots = childrenMap.get(null) ?? [];

  return (
    <aside className="w-64 shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {canManage && (
        <Link
          href={`/worlds/${worldSlug}/wiki/new`}
          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
        >
          <Plus className="h-4 w-4" />
          New Page
        </Link>
      )}

      {roots.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
          <BookOpen className="h-6 w-6 text-zinc-600" />
          <p className="text-sm text-zinc-500">No wiki pages yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {roots.map((root) => (
            <WikiTreeNode
              key={root.id}
              item={root}
              childrenMap={childrenMap}
              depth={0}
              worldSlug={worldSlug}
              activeSlug={activeSlug}
              visited={new Set()}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
