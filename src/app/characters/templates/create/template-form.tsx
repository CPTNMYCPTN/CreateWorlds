"use client";

import { useActionState, useState } from "react";
import {
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Hash,
  Image as ImageIcon,
  Link as LinkIcon,
  Music,
  Plus,
  Trash2,
  Type,
  Video,
  type LucideIcon,
} from "lucide-react";
import { createTemplate, type CreateTemplateState } from "./actions";
import {
  FIELD_TYPES,
  FIELD_TYPE_LABELS,
  type FieldType,
  type TemplateField,
} from "../../types";

const initialState: CreateTemplateState = { error: null };

const FIELD_TYPE_ICONS: Record<FieldType, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  url: LinkIcon,
  spotify: Music,
  youtube: Video,
  image: ImageIcon,
};

function createField(): TemplateField {
  return {
    id: crypto.randomUUID(),
    label: "",
    type: "text",
    required: false,
  };
}

function FieldRow({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  field: TemplateField;
  index: number;
  total: number;
  onChange: (patch: Partial<TemplateField>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const Icon = FIELD_TYPE_ICONS[field.type];

  return (
    <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-col gap-0.5 pt-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <Icon className="mt-2 h-4 w-4 shrink-0 text-zinc-500" />

      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[2fr_1.2fr_auto]">
        <input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Field label (e.g. Age)"
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
        />

        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value as FieldType })}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none focus:border-violet-400/50"
        >
          {FIELD_TYPES.map((type) => (
            <option key={type} value={type} className="bg-zinc-900">
              {FIELD_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 px-1 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-white/[0.03] accent-violet-500"
          />
          Required
        </label>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TemplateForm() {
  const [state, formAction, pending] = useActionState(
    createTemplate,
    initialState,
  );
  const [fields, setFields] = useState<TemplateField[]>([]);

  function updateField(id: string, patch: Partial<TemplateField>) {
    setFields((current) =>
      current.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  function removeField(id: string) {
    setFields((current) => current.filter((f) => f.id !== id));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-8">
      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="name" className="text-sm font-medium text-zinc-300">
          Template name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Adventurer"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="text-sm font-medium text-zinc-300"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="What kind of character is this template for?"
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-300">Fields</span>
          <button
            type="button"
            onClick={() => setFields((current) => [...current, createField()])}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            Add field
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-zinc-500">
            No fields yet. Add fields like &ldquo;Age&rdquo;,
            &ldquo;Appearance&rdquo;, or &ldquo;Theme Song&rdquo;.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {fields.map((field, index) => (
              <FieldRow
                key={field.id}
                field={field}
                index={index}
                total={fields.length}
                onChange={(patch) => updateField(field.id, patch)}
                onRemove={() => removeField(field.id)}
                onMove={(direction) => moveField(index, direction)}
              />
            ))}
          </div>
        )}
      </div>

      <input type="hidden" name="fields" value={JSON.stringify(fields)} />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center self-start rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving template..." : "Save Template"}
      </button>
    </form>
  );
}
