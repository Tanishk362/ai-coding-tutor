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
    <nav className="w-64 shrink-0 bg-gray-900 shadow-xl">
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-2">Chatbot Builder</h2>
          <p className="text-sm text-gray-400">Configure your AI assistant</p>
        </div>
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Build Settings</div>
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.key}>
                <button
                  onClick={() => onChange(it.key)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    active === it.key
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-[1.02]"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white hover:transform hover:scale-[1.01]"
                  )}
                >
                  {it.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
