"use client";
import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import clipboardCopy from 'clipboard-copy';
import 'katex/dist/katex.min.css';

interface RenderedMessageProps {
  content: string;
  light: boolean;
}

// Code block component with copy button styled similar to ChatGPT's
function CodeBlock({ inline, className, children }: any) {
  const code = String(children).replace(/\n$/, '');
  const langMatch = /language-([a-z0-9]+)/i.exec(className || '');
  const [copied, setCopied] = useState(false);
  const language = langMatch?.[1];
  const handleCopy = async () => {
    try { await clipboardCopy(code); setCopied(true); setTimeout(()=>setCopied(false),1500);} catch {}
  };
  if (inline) {
    return <code className="px-1 py-0.5 rounded bg-neutral-800/60 text-[13px] font-mono">{children}</code>;
  }
  return (
    <div className="group relative my-4 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900/70">
      <div className="flex items-center justify-between px-3 py-2 text-xs bg-neutral-800/70 border-b border-neutral-700 font-medium">
        <span className="text-neutral-300">{language || 'code'}</span>
        <button type="button" onClick={handleCopy} className="opacity-80 hover:opacity-100 transition text-neutral-200 px-2 py-1 rounded bg-neutral-700/60">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto text-sm leading-relaxed p-4 font-mono"><code className={className}>{code}</code></pre>
    </div>
  );
}

function hasMath(text: string): boolean {
  // Cheap check to avoid enabling math pipeline unless necessary
  return /\$\$|\$(?!\s)|\\\(|\\\)/.test(text);
}

// Normalize various math notations into standard $inline$ or $$block$$ so remark-math catches them.
function normalizeMath(raw: string): string {
  let txt = raw;
  // Convert ```math|latex|tex fenced blocks to display math $$...$$ before markdown parsing
  txt = txt.replace(/```\s*(math|latex|tex)\s*\n([\s\S]*?)```/gi, (_m, _lang, inner) => {
    const body = String(inner ?? '').trim();
    return body ? `$$\n${body}\n$$` : '';
  });
  // Convert \( ... \) inline delimiters to $ ... $
  txt = txt.replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner) => `$${String(inner ?? '').trim()}$`);
  // Fix common LLM mistake: \left$ ... \right$ -> \left[ ... \right]
  // Allow optional whitespace between command and '$'
    // Fix common LLM mistake intended for evaluation bar at bounds:
    // e.g., "\\left$ f(x) \\right$_0^1" should be "\\left. f(x) \\right|_0^1"
    // Convert \left$ -> \left.  and \right$ -> \right|
    txt = txt.replace(/\\left\s*\$/g, '\\left.');
    txt = txt.replace(/\\right\s*\$/g, '\\right\\|');
  // Convert standalone \[ ... \] to $$ ... $$
  // Use [\s\S] instead of dot-all flag for broader TS target compatibility
  txt = txt.replace(/\\\[([\s\S]+?)\\\]/g, (_, inner) => `$$${inner.trim()}$$`);
  // Convert bare [ ... ] that appear to contain LaTeX (heuristic: contains \\ or ^ or _ or frac)
  txt = txt.replace(/\[(?:\s*)([^\n\]]*?\\[a-zA-Z]+[^\]]*?|[^\]]*?\^.+?[^\]]*?|[^\]]*?_.*?[^\]]*?)\]/g, (m, inner) => {
    const content = inner.trim();
    if (!content) return m; // leave as-is if empty
    // Avoid capturing markdown links [text](url)
    if (/\]\(/.test(m)) return m;
    // If it already contains inline/block math delimiters, skip
    if (/\$.*\$/.test(content)) return m;
    return `$${content}$`;
  });
  // Wrap standalone LaTeX environments not already within $$ ... $$
  // 1) Temporarily mask existing $$...$$ blocks to avoid double-wrapping
  const mathPlaceholders: string[] = [];
  txt = txt.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => {
    const i = mathPlaceholders.push(String(inner)) - 1;
    return `@@MATH_BLOCK_${i}@@`;
  });
  // 2) Wrap any remaining \begin{env}...\end{env} with $$...$$
  txt = txt.replace(/\\begin\{([a-zA-Z*]+)\}([\s\S]*?)\\end\{\1\}/g, (m) => `$$${m}$$`);
  // 3) Restore placeholders
  txt = txt.replace(/@@MATH_BLOCK_(\d+)@@/g, (_m, d) => `$$${mathPlaceholders[Number(d)]}$$`);
  // 4) Balance stray/unmatched $$ to avoid KaTeX error rendering
  const dd = [...txt.matchAll(/\$\$/g)].map(m => m.index ?? -1).filter(i => i >= 0);
  if (dd.length % 2 === 1) {
    const last = dd[dd.length - 1];
    txt = txt.slice(0, last) + txt.slice(last + 2);
  }
    // Heuristics inside $$ ... $$ blocks to fix common LLM omissions
    txt = txt.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => {
      let s = String(inner ?? '');
      // If there's an \end{bmatrix} but no \begin{bmatrix}, inject the begin
      if (/\\end\{bmatrix\}/.test(s) && !/\\begin\{bmatrix\}/.test(s)) {
        s = `\\begin{bmatrix}\n${s}`;
      }
      // If it looks like an align block (contains & and \\) without explicit env, wrap with aligned
      const hasEnvBegin = /\\begin\{[a-zA-Z*]+\}/.test(s);
      const hasEnvEnd = /\\end\{[a-zA-Z*]+\}/.test(s);
      if (!hasEnvBegin && !hasEnvEnd && /&/.test(s) && /\\\\/.test(s)) {
        s = `\\begin{aligned}\n${s}\n\\end{aligned}`;
      }
      return `$$${s}$$`;
    });
  return txt;
}

export const RenderedMessage = React.memo(function RenderedMessage({ content, light }: RenderedMessageProps): React.ReactElement {
  const normalized = useMemo(() => normalizeMath(content), [content]);
  const remarkPlugins = useMemo(() => {
    return hasMath(normalized) ? [remarkGfm, remarkMath] : [remarkGfm];
  }, [normalized]);

  const rehypePlugins = useMemo(() => {
    return hasMath(normalized)
      ? [[rehypeKatex as any, { strict: false, throwOnError: false }]]
      : [];
  }, [normalized]);

  const components = useMemo(() => ({
    code: CodeBlock,
    img: ({node, ...props}: any) => {
      // Avoid React 19 warning for empty src; skip rendering if empty
      if (!props.src) return null;
      return <img {...props} alt={props.alt || 'image'} />;
    },
    p: ({node, ...props}: any) => <p className="mb-3" {...props} />,
    ul: ({node, ...props}: any) => <ul className="mb-3 list-disc list-inside space-y-1" {...props} />,
    ol: ({node, ...props}: any) => <ol className="mb-3 list-decimal list-inside space-y-1" {...props} />,
    li: ({node, ...props}: any) => <li className="ml-1" {...props} />,
    h1: ({node, ...props}: any) => <h1 className="mt-6 mb-3 text-2xl font-bold" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="mt-6 mb-3 text-xl font-semibold" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="mt-5 mb-2 text-lg font-semibold" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="pl-4 border-l-4 border-neutral-500/60 italic my-3" {...props} />,
    table: ({node, ...props}: any) => <div className="overflow-auto my-4"><table className="w-full text-sm border-collapse" {...props} /></div>,
    th: ({node, ...props}: any) => <th className="border border-neutral-600 px-2 py-1 bg-neutral-800" {...props} />,
    td: ({node, ...props}: any) => <td className="border border-neutral-700 px-2 py-1" {...props} />,
    a: ({node, ...props}: any) => <a className="text-sky-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    hr: ({node, ...props}: any) => <hr className="my-6 border-neutral-700" {...props} />,
  }), []);

  return (
    <div className={`markdown-body text-[15px] leading-7 ${light ? 'text-gray-800' : 'text-gray-200'}`}>
      <ReactMarkdown
        // Skip any raw HTML in content for safety/perf
        skipHtml
        remarkPlugins={remarkPlugins as any}
        rehypePlugins={rehypePlugins as any}
        components={components as any}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
});

