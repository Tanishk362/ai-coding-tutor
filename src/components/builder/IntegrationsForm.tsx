"use client";

import { useFormContext } from "react-hook-form";

export function IntegrationsForm() {
  const form = useFormContext<any>();

  return (
    <div className="space-y-3">
      {[
        { key: "google_drive", label: "Google Drive" },
        { key: "slack", label: "Slack" },
        { key: "notion", label: "Notion" },
      ].map((i) => (
        <label key={i.key} className="flex items-center gap-3">
          <input type="checkbox" {...form.register(`integrations.${i.key}`)} />
          <span className="text-sm">{i.label}</span>
        </label>
      ))}
    </div>
  );
}
