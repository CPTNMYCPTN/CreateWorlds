"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ActionMenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
};

export function ActionMenu({
  items,
  align = "end",
  className,
}: {
  items: ActionMenuItem[];
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Actions"
        className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 py-1 shadow-xl ${
              align === "end" ? "right-0" : "left-0"
            }`}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  item.danger
                    ? "text-red-400 hover:bg-red-500/10"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
