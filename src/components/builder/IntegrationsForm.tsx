"use client";

import { useFormContext } from "react-hook-form";
import { useMemo, useState } from "react";

export function IntegrationsForm() {
  const form = useFormContext<any>();
  const [mode, setMode] = useState<'float' | 'inline'>('float');
  const slug = form.watch('slug') as string | undefined;
  const brand = form.watch('brand_color') as string | undefined;
  const theme = form.watch('theme_template') as string | undefined;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const embedCode = useMemo(() => {
    const attrs = [
      `data-slug="${slug || ''}"`,
      `data-mode="${mode}"`,
      theme ? `data-theme="${theme}"` : null,
      brand ? `data-brand-color="${brand}"` : null,
      `defer`
    ].filter(Boolean).join(' ');
    const src = `${origin}/embed/widget.js`;
    if (mode === 'inline') {
      return `<div id="my-chatbot" style="width:100%;height:600px"></div>\n<script src="${src}" ${attrs} data-container="#my-chatbot"></script>`;
    }
    return `<script src="${src}" ${attrs}></script>`;
  }, [slug, brand, theme, mode, origin]);

  return (
    <div className="space-y-6">
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

      <div className="mt-6 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="font-medium">Embed</div>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setMode('float')} className={`px-2 py-1 rounded ${mode==='float'?'bg-indigo-600 text-white':'bg-gray-100'}`}>Floating</button>
            <button type="button" onClick={() => setMode('inline')} className={`px-2 py-1 rounded ${mode==='inline'?'bg-indigo-600 text-white':'bg-gray-100'}`}>Inline</button>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600">Copy and paste this snippet into your website. It will render your chatbot with your current theme and settings.</p>
        <textarea readOnly className="mt-3 w-full h-32 text-xs font-mono p-3 border rounded" value={embedCode} />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => { navigator.clipboard.writeText(embedCode); }} className="text-xs px-3 py-1.5 rounded border">Copy</button>
          <a href={`/c/${slug || ''}?embed=1`} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded border">Preview</a>
        </div>
        <div className="mt-2 text-[11px] text-gray-500">Advanced: restrict allowed domains and tokens in a future update.</div>
      </div>
    </div>
  );
}
