"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Node } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";

export type WikiLinkTarget = {
  id: string;
  slug: string;
  title: string;
};

const wikiLinkPluginKey = new PluginKey("wikiLink");

type SuggestionListProps = {
  items: WikiLinkTarget[];
  command: (item: WikiLinkTarget) => void;
};

type SuggestionListHandle = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

const WikiLinkSuggestionList = forwardRef<SuggestionListHandle, SuggestionListProps>(
  function WikiLinkSuggestionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) {
          return false;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((current) => (current + 1) % items.length);
          return true;
        }

        if (event.key === "ArrowUp") {
          setSelectedIndex((current) => (current - 1 + items.length) % items.length);
          return true;
        }

        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) {
            command(item);
          }
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-500 shadow-xl">
          No matching pages
        </div>
      );
    }

    return (
      <div className="max-h-64 min-w-48 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 py-1 shadow-xl">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command(item)}
            className={`block w-full truncate px-3 py-1.5 text-left text-sm transition-colors ${
              index === selectedIndex
                ? "bg-[var(--world-accent,#a78bfa)]/20 text-white"
                : "text-zinc-300 hover:bg-white/5"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>
    );
  },
);

function positionPopup(popup: HTMLDivElement, rect: DOMRect | null | undefined) {
  if (!rect) {
    return;
  }

  popup.style.top = `${rect.bottom + 4}px`;
  popup.style.left = `${rect.left}px`;
}

export interface WikiLinkOptions {
  getItems: () => WikiLinkTarget[];
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      getItems: () => [],
    };
  },

  addAttributes() {
    return {
      pageId: { default: null },
      label: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-wiki-link]",
        getAttrs: (dom) => ({
          pageId: (dom as HTMLElement).getAttribute("data-page-id"),
          label: (dom as HTMLElement).textContent ?? "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "span",
      {
        "data-wiki-link": "true",
        "data-page-id": node.attrs.pageId,
        class: "wiki-link",
      },
      node.attrs.label,
    ];
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      Suggestion<WikiLinkTarget, WikiLinkTarget>({
        editor: this.editor,
        char: "[[",
        pluginKey: wikiLinkPluginKey,
        allowSpaces: true,
        items: ({ query }) => {
          const all = options.getItems();

          if (!query) {
            return all.slice(0, 10);
          }

          const q = query.toLowerCase();
          return all
            .filter((item) => item.title.toLowerCase().includes(q))
            .slice(0, 10);
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: "wikiLink",
                attrs: { pageId: props.id, label: props.title },
              },
              { type: "text", text: " " },
            ])
            .run();
        },
        render: () => {
          let component: ReactRenderer<SuggestionListHandle, SuggestionListProps> | null =
            null;
          let popup: HTMLDivElement | null = null;

          return {
            onStart: (props: SuggestionProps<WikiLinkTarget, WikiLinkTarget>) => {
              component = new ReactRenderer(WikiLinkSuggestionList, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              });

              popup = document.createElement("div");
              popup.style.position = "fixed";
              popup.style.zIndex = "60";
              document.body.appendChild(popup);
              popup.appendChild(component.element);

              positionPopup(popup, props.clientRect?.());
            },
            onUpdate: (props: SuggestionProps<WikiLinkTarget, WikiLinkTarget>) => {
              component?.updateProps({ items: props.items, command: props.command });
              if (popup) {
                positionPopup(popup, props.clientRect?.());
              }
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === "Escape") {
                popup?.remove();
                return true;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              popup?.remove();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
