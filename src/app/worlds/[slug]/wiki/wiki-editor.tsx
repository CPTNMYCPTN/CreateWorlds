"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import CodeBlock from "@tiptap/extension-code-block";
import TiptapLink from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Placeholder from "@tiptap/extension-placeholder";
import { Toolbar } from "../post-editor";
import { WikiLink, type WikiLinkTarget } from "@/components/wiki-link";
import { ForumLink } from "@/components/forum-link";
import type { ForumFolderSummary, ForumThreadSummary } from "./wiki-content";

export function WikiEditor({
  content,
  onChange,
  pages,
  threads,
  folders,
  placeholder,
}: {
  content?: string;
  onChange: (html: string) => void;
  pages: WikiLinkTarget[];
  threads: ForumThreadSummary[];
  folders: ForumFolderSummary[];
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        underline: false,
        link: false,
        strike: false,
        codeBlock: false,
      }),
      Underline,
      Strike,
      CodeBlock,
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      ImageExtension.configure({ allowBase64: false }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TextStyle,
      Color,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: placeholder ?? "Write the page content...",
      }),
      WikiLink.configure({ getItems: () => pages }),
      ForumLink.configure({
        getItems: () => [
          ...folders.map((f) => ({ id: f.id, label: f.name, type: "folder" as const })),
          ...threads.map((t) => ({ id: t.id, label: t.title, type: "thread" as const })),
        ],
      }),
    ],
    content: content ?? "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-content min-h-[240px] focus:outline-none",
      },
    },
  });

  if (!editor) {
    return (
      <div className="h-[280px] rounded-lg border border-white/10 bg-white/[0.03]" />
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] focus-within:border-[var(--world-accent,#a78bfa)]/50">
      <Toolbar editor={editor} />
      <div className="px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
