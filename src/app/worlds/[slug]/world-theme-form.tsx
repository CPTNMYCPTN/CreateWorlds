"use client";

import { useState } from "react";
import { updateWorldTheme, type UpdateWorldThemeState } from "./actions";
import type { WorldTheme } from "./types";

const initialState: UpdateWorldThemeState = { error: null };

const HEADER_STYLE_OPTIONS: { value: WorldTheme["headerStyle"]; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "gradient", label: "Gradient" },
  { value: "transparent", label: "Transparent overlay on banner" },
];

const FONT_FAMILY_OPTIONS: { value: WorldTheme["fontFamily"]; label: string }[] = [
  { value: "default", label: "Default (Inter)" },
  { value: "serif", label: "Serif (Lora)" },
  { value: "mono", label: "Monospace (JetBrains Mono)" },
  { value: "fantasy", label: "Fantasy (Cinzel)" },
];

export function WorldThemeForm({
  worldId,
  worldSlug,
  theme,
}: {
  worldId: string;
  worldSlug: string;
  theme: WorldTheme;
}) {
  const [accentColor, setAccentColor] = useState(theme.accentColor);
  const [bgColor, setBgColor] = useState(theme.bgColor);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setSuccess(false);

    const result = await updateWorldTheme(worldId, worldSlug, initialState, formData);

    setPending(false);

    if (result.error) {
      setError(result.error);
    } else {
      setError(null);
      setSuccess(true);
    }
  }

  return (
    <form action={handleSubmit} className="mt-6 flex flex-col gap-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="accentColor" className="text-sm font-medium text-zinc-300">
            Accent color
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            Used for buttons, active states, links, and highlights.
          </p>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <input
              id="accentColor"
              name="accentColor"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
            />
            <span className="font-mono text-sm text-zinc-400">{accentColor}</span>
          </div>
        </div>

        <div className="flex-1">
          <label htmlFor="bgColor" className="text-sm font-medium text-zinc-300">
            Background color
          </label>
          <p className="mt-1 text-xs text-zinc-500">
            The base background color of the world page.
          </p>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <input
              id="bgColor"
              name="bgColor"
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-white/10 bg-transparent"
            />
            <span className="font-mono text-sm text-zinc-400">{bgColor}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="headerStyle" className="text-sm font-medium text-zinc-300">
            Header style
          </label>
          <select
            id="headerStyle"
            name="headerStyle"
            defaultValue={theme.headerStyle}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none focus:border-violet-400/50"
          >
            {HEADER_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-zinc-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label htmlFor="fontFamily" className="text-sm font-medium text-zinc-300">
            Font family
          </label>
          <select
            id="fontFamily"
            name="fontFamily"
            defaultValue={theme.fontFamily}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-50 outline-none focus:border-violet-400/50"
          >
            {FONT_FAMILY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-zinc-900">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="customCss" className="text-sm font-medium text-zinc-300">
          Custom CSS
        </label>
        <p className="mt-1 text-xs text-zinc-500">
          Advanced: arbitrary CSS injected into this world&apos;s page only.
        </p>
        <textarea
          id="customCss"
          name="customCss"
          rows={10}
          defaultValue={theme.customCss}
          placeholder=".world-page h1 { letter-spacing: 0.05em; }"
          spellCheck={false}
          className="mt-2 w-full resize-y rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm text-zinc-50 outline-none placeholder:text-zinc-500 focus:border-violet-400/50"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && !error && (
        <p className="text-sm text-emerald-400">Theme settings saved.</p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save theme"}
        </button>
      </div>
    </form>
  );
}
