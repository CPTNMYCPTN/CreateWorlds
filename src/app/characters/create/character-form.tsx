"use client";

import { useActionState, useState } from "react";
import {
  AlignLeft,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  Music,
  Sparkles,
  Type,
  Upload,
  Video,
  type LucideIcon,
} from "lucide-react";
import { createCharacter, updateCharacter, type CreateCharacterState } from "./actions";
import type { CharacterTemplate, FieldType, TemplateField } from "../types";

const initialState: CreateCharacterState = { error: null };

const FIELD_TYPE_ICONS: Record<FieldType, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  url: LinkIcon,
  spotify: Music,
  youtube: Video,
  image: ImageIcon,
};

const FIELD_PLACEHOLDERS: Partial<Record<FieldType, string>> = {
  url: "https://...",
  spotify: "https://open.spotify.com/...",
  youtube: "https://youtube.com/watch?v=...",
};

function FieldInput({
  field,
  initialValue,
}: {
  field: TemplateField;
  initialValue?: string | number;
}) {
  const Icon = FIELD_TYPE_ICONS[field.type];
  const [preview, setPreview] = useState<string | null>(
    field.type === "image" ? ((initialValue as string) ?? null) : null,
  );
  const name = `field:${field.id}`;

  return (
    <div>
      <label
        htmlFor={name}
        className="flex items-center gap-1.5 text-sm font-medium text-zinc-300"
      >
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
        {field.label}
        {field.required && <span className="text-red-400">*</span>}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          rows={4}
          required={field.required}
          defaultValue={(initialValue as string) ?? ""}
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
        />
      ) : field.type === "image" ? (
        <div>
          <label
            htmlFor={name}
            className="mt-2 flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] bg-cover bg-center transition-colors hover:border-white/20"
            style={preview ? { backgroundImage: `url(${preview})` } : undefined}
          >
            {!preview && <Upload className="h-5 w-5 text-zinc-500" />}
          </label>
          <input
            id={name}
            name={name}
            type="file"
            accept="image/*"
            required={field.required && !initialValue}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </div>
      ) : (
        <input
          id={name}
          name={name}
          type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
          required={field.required}
          defaultValue={initialValue ?? ""}
          placeholder={FIELD_PLACEHOLDERS[field.type]}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
        />
      )}
    </div>
  );
}

export function CharacterForm({
  templates,
  worldId,
  character,
}: {
  templates: CharacterTemplate[];
  worldId: string | null;
  character?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    templateId: string | null;
    fieldValues: Record<string, string | number>;
  };
}) {
  const isEditing = Boolean(character);
  const [action] = useState(() =>
    character ? updateCharacter.bind(null, character.id) : createCharacter,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const [selectedTemplate, setSelectedTemplate] = useState<
    CharacterTemplate | null | undefined
  >(() => {
    if (character) {
      return templates.find((t) => t.id === character.templateId) ?? null;
    }
    return templates.length === 0 ? null : undefined;
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    character?.avatarUrl ?? null,
  );

  if (selectedTemplate === undefined) {
    return (
      <div className="mt-8">
        <h2 className="text-sm font-medium text-zinc-300">
          Choose a starting point
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedTemplate(null)}
            className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/20 hover:bg-white/5"
          >
            <Sparkles className="h-5 w-5 text-violet-400" />
            <h3 className="font-medium text-zinc-100">Start blank</h3>
            <p className="text-sm text-zinc-500">
              Build a character with no predefined fields.
            </p>
          </button>

          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedTemplate(template)}
              className="flex flex-col items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/20 hover:bg-white/5"
            >
              <Type className="h-5 w-5 text-violet-400" />
              <h3 className="font-medium text-zinc-100">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-zinc-500">{template.description}</p>
              )}
              <p className="text-xs text-zinc-600">
                {template.fields.length} field
                {template.fields.length === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const fields = selectedTemplate?.fields ?? [];

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-8">
      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {!isEditing && templates.length > 0 && (
        <button
          type="button"
          onClick={() => setSelectedTemplate(undefined)}
          className="self-start text-sm text-zinc-400 transition-colors hover:text-white"
        >
          ← Choose a different template
        </button>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div>
          <span className="text-sm font-medium text-zinc-300">
            Profile photo
          </span>
          <label
            htmlFor="avatar"
            className="mt-2 flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-white/[0.02] bg-cover bg-center transition-colors hover:border-white/20"
            style={
              avatarPreview ? { backgroundImage: `url(${avatarPreview})` } : undefined
            }
          >
            {!avatarPreview && <Upload className="h-5 w-5 text-zinc-500" />}
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setAvatarPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </div>

        <div className="flex-1">
          <label htmlFor="name" className="text-sm font-medium text-zinc-300">
            Character name
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={character?.name ?? ""}
            placeholder="Kaelen Vesh"
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
          />
          {selectedTemplate && (
            <p className="mt-2 text-xs text-zinc-500">
              Using template &ldquo;{selectedTemplate.name}&rdquo;
            </p>
          )}
        </div>
      </div>

      {fields.length > 0 && (
        <div className="flex flex-col gap-6">
          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              initialValue={character?.fieldValues[field.id]}
            />
          ))}
        </div>
      )}

      <input type="hidden" name="templateId" value={selectedTemplate?.id ?? ""} />
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />
      {worldId && <input type="hidden" name="world" value={worldId} />}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center self-start rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isEditing
          ? pending
            ? "Saving..."
            : "Save changes"
          : pending
            ? "Creating character..."
            : "Create Character"}
      </button>
    </form>
  );
}
