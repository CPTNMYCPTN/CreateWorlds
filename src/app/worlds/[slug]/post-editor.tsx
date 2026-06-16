"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Strike from "@tiptap/extension-strike";
import CodeBlock from "@tiptap/extension-code-block";
import Link from "@tiptap/extension-link";
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
import { createClient } from "@/utils/supabase/client";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Link2,
  Unlink,
  Image as ImageIcon,
  Table2,
  Columns,
  Rows,
  Trash2,
  Baseline,
  Highlighter,
  type LucideIcon,
} from "lucide-react";

function ToolbarButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "bg-[var(--world-accent,#a78bfa)]/20 text-[var(--world-accent,#a78bfa)]"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />;
}

function ColorButton({
  icon,
  label,
  color,
  active,
  onPick,
  onClear,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  active: boolean;
  onPick: (color: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <span className="relative inline-flex">
      <ToolbarButton
        icon={icon}
        label={label}
        active={active}
        onClick={() => (active ? onClear() : inputRef.current?.click())}
      />
      <input
        ref={inputRef}
        type="color"
        value={color}
        onChange={(event) => onPick(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </span>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  function setLink() {
    const previousUrl = editor.getAttributes("link").href as
      | string
      | undefined;
    const url = window.prompt("Enter a URL", previousUrl ?? "https://");

    if (!url) {
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function unsetLink() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  }

  async function handleImageFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setImageError(null);
    setUploadingImage(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setImageError("You must be signed in to upload images.");
      setUploadingImage(false);
      return;
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("post-images")
      .upload(path, file, { contentType: file.type });

    setUploadingImage(false);

    if (error) {
      setImageError(error.message);
      return;
    }

    const url = supabase.storage.from("post-images").getPublicUrl(path).data
      .publicUrl;

    editor.chain().focus().setImage({ src: url }).run();
  }

  const textColor =
    (editor.getAttributes("textStyle").color as string | undefined) ??
    "#a78bfa";
  const highlightColor =
    (editor.getAttributes("highlight").color as string | undefined) ??
    "#fde68a";

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <ToolbarButton
          icon={Bold}
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={Italic}
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={UnderlineIcon}
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton
          icon={Strikethrough}
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          icon={SubscriptIcon}
          label="Subscript"
          active={editor.isActive("subscript")}
          onClick={() =>
            editor.chain().focus().unsetSuperscript().toggleSubscript().run()
          }
        />
        <ToolbarButton
          icon={SuperscriptIcon}
          label="Superscript"
          active={editor.isActive("superscript")}
          onClick={() =>
            editor.chain().focus().unsetSubscript().toggleSuperscript().run()
          }
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={Heading1}
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          icon={Heading2}
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon={Heading3}
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={AlignLeft}
          label="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        />
        <ToolbarButton
          icon={AlignCenter}
          label="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        />
        <ToolbarButton
          icon={AlignRight}
          label="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        />
        <ToolbarButton
          icon={AlignJustify}
          label="Justify"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        />

        <ToolbarDivider />

        <ColorButton
          icon={Baseline}
          label="Text color"
          color={textColor}
          active={Boolean(editor.getAttributes("textStyle").color)}
          onPick={(color) => editor.chain().focus().setColor(color).run()}
          onClear={() => editor.chain().focus().unsetColor().run()}
        />
        <ColorButton
          icon={Highlighter}
          label="Highlight"
          color={highlightColor}
          active={editor.isActive("highlight")}
          onPick={(color) =>
            editor.chain().focus().setHighlight({ color }).run()
          }
          onClear={() => editor.chain().focus().unsetHighlight().run()}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={List}
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Ordered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={Quote}
          label="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={Code2}
          label="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          icon={Minus}
          label="Horizontal rule"
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <ToolbarDivider />

        <ToolbarButton
          icon={Link2}
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <ToolbarButton
          icon={Unlink}
          label="Remove link"
          active={false}
          disabled={!editor.isActive("link")}
          onClick={unsetLink}
        />
        <ToolbarButton
          icon={ImageIcon}
          label="Upload image"
          active={false}
          disabled={uploadingImage}
          onClick={() => fileInputRef.current?.click()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />
        <ToolbarButton
          icon={Table2}
          label="Insert table"
          active={editor.isActive("table")}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        />
        {editor.isActive("table") && (
          <>
            <ToolbarButton
              icon={Columns}
              label="Add column"
              active={false}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            />
            <ToolbarButton
              icon={Rows}
              label="Add row"
              active={false}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            />
            <ToolbarButton
              icon={Trash2}
              label="Delete table"
              active={false}
              onClick={() => editor.chain().focus().deleteTable().run()}
            />
          </>
        )}
      </div>
      {imageError && (
        <p className="border-b border-white/10 px-3 py-1.5 text-xs text-red-400">
          {imageError}
        </p>
      )}
    </>
  );
}

export function PostEditor({
  onChange,
  onEmptyChange,
  placeholder,
}: {
  onChange: (html: string) => void;
  onEmptyChange: (empty: boolean) => void;
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
      Link.configure({
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
        placeholder: placeholder ?? "Write something...",
      }),
    ],
    content: "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML());
      onEmptyChange(editor.isEmpty);
    },
    editorProps: {
      attributes: {
        class: "tiptap-content min-h-[120px] focus:outline-none",
      },
    },
  });

  if (!editor) {
    return (
      <div className="h-[164px] rounded-lg border border-white/10 bg-white/[0.03]" />
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
