"use client";

import { cn } from "@/src/components/utils";

type Item = {
  key: string;
  label: string;
};

export function SectionNav({
  items,
  active,
  onChange,
}: {
  items: Item[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <nav className="w-56 shrink-0 border-r border-gray-800 bg-[#0b0b0b] text-sm">
      <div className="p-3 text-gray-300 uppercase tracking-wider text-xs">Build</div>
      <ul className="px-2 space-y-1">
        {items.map((it) => (
          <li key={it.key}>
            <button
              onClick={() => onChange(it.key)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md",
                active === it.key
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-800 text-gray-200"
              )}
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
