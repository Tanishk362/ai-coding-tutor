"use client";
import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';

interface RenderedMessageProps {
  content: string;
  light: boolean;
}

// Helper to clean up and normalize content inside a $$ ... $$ math block
function fixDisplayMathBlock(innerRaw: string): string {
  let s = String(innerRaw ?? '');
  // 0) Trim leading/trailing whitespace and stray punctuation at the very edges
  s = s.trim();
  s = s.replace(/^\s*[,:;]\s*/, "");
  s = s.replace(/\s*[,:;]\s*$/, "");

  // 1) If there's an env end but no corresponding begin, inject the begin for common matrix envs
  const envs = ["bmatrix", "pmatrix", "Bmatrix", "vmatrix", "Vmatrix"] as const;
  for (const env of envs) {
    const endRe = new RegExp(String.raw`\\end\{${env}\}`);
    const beginRe = new RegExp(String.raw`\\begin\{${env}\}`);
    if (endRe.test(s) && !beginRe.test(s)) {
      s = `\\begin{${env}}\n${s}`;
    }
  }

  // 2) If it looks like an align block (contains & and \\) without explicit env, wrap with aligned
  const hasEnvBegin = /\\begin\{[a-zA-Z*]+\}/.test(s);
  const hasEnvEnd = /\\end\{[a-zA-Z*]+\}/.test(s);
  if (!hasEnvBegin && !hasEnvEnd && /&/.test(s) && /\\\\/.test(s)) {
    s = `\\begin{aligned}\n${s}\n\\end{aligned}`;
  }

  // 3) Balance braces conservatively inside the display block
  const unescapedOpen = (s.match(/(?<!\\)\{/g) || []).length;
  const unescapedClose = (s.match(/(?<!\\)\}/g) || []).length;
  if (unescapedClose > unescapedOpen) {
    // remove extra closing braces from the end
    let toRemove = unescapedClose - unescapedOpen;
    let i = s.length - 1;
    const chars = s.split("");
    while (i >= 0 && toRemove > 0) {
      if (chars[i] === '}' && (i === 0 || chars[i - 1] !== '\\')) {
        chars.splice(i, 1);
        toRemove--;
      }
      i--;
    }
    s = chars.join("");
  } else if (unescapedOpen > unescapedClose) {
    s = s + "}".repeat(unescapedOpen - unescapedClose);
  }

  // Return as a proper block-level display math with surrounding newlines so remark-math treats it as display math
  return `\n$$\n${s}\n$$\n`;
}

// Simple code block renderer without copy UI
function CodeBlock({ inline, className, children }: any) {
  const code = String(children).replace(/\n$/, '');
  const langMatch = /language-([a-z0-9]+)/i.exec(className || '');
  const language = langMatch?.[1];
  if (inline) {
    return <code className="px-1 py-0.5 rounded bg-neutral-800/60 text-[13px] font-mono">{children}</code>;
  }
  return (
    <div className="group relative my-4 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900/70">
      <div className="flex items-center justify-between px-3 py-2 text-xs bg-neutral-800/70 border-b border-neutral-700 font-medium">
        <span className="text-neutral-300">{language || 'code'}</span>
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
  // 0) Protect fenced code blocks and inline code from any math normalization
  type CodeFenceEntry = { lang: string; body: string };
  const codeFencePlaceholders: CodeFenceEntry[] = [];
  txt = txt.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_m, info, body) => {
    const lang = String(info || '').trim().toLowerCase();
    const entry: CodeFenceEntry = { lang, body: String(body ?? '') };
    const i = codeFencePlaceholders.push(entry) - 1;
    return `@@CODE_FENCE_${i}@@`;
  });
  const inlineCodePlaceholders: string[] = [];
  txt = txt.replace(/`([^`]+?)`/g, (_m, inner) => {
    const i = inlineCodePlaceholders.push(String(inner ?? '')) - 1;
    return `@@INLINE_CODE_${i}@@`;
  });
  // helper to balance unescaped braces in a math snippet
  const balanceBraces = (s: string): string => {
    let open = 0, close = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const prev = i > 0 ? s[i - 1] : '';
      if (ch === '{' && prev !== '\\') open++;
      else if (ch === '}' && prev !== '\\') close++;
    }
    if (close > open) {
      // Trim extra '}' from the end preferentially
      let toTrim = close - open;
      let out = s;
      for (let i = out.length - 1; i >= 0 && toTrim > 0; i--) {
        if (out[i] === '}' && (i === 0 || out[i - 1] !== '\\')) {
          out = out.slice(0, i) + out.slice(i + 1);
          toTrim--;
        }
      }
      return out;
    } else if (open > close) {
      return s + '}'.repeat(open - close);
    }
    return s;
  };
  // Note: fenced code blocks were masked; we will restore them at the end, converting
  // only math/latex/tex fences to display math.
  // Convert \( ... \) inline delimiters to $ ... $
  txt = txt.replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner) => `$${String(inner ?? '').trim()}$`);
  // Fix common LLM mistake: \left$ ... \right$ -> \left[ ... \right]
  // Allow optional whitespace between command and '$'
    // Fix common LLM mistake intended for evaluation bar at bounds:
    // e.g., "\\left$ f(x) \\right$_0^1" should be "\\left. f(x) \\right|_0^1"
    // Convert \left$ -> \left.  and \right$ -> \right|
    txt = txt.replace(/\\left\s*\$/g, '\\left.');
    txt = txt.replace(/\\right\s*\$/g, '\\right\\|');
  // Also guard against accidental inline '$' immediately after \left or \right caused by earlier markup
  txt = txt.replace(/(\\left)\s*\$/g, '$1.');
  txt = txt.replace(/(\\right)\s*\$/g, '$1\\|');
  // Convert standalone \[ ... \] to $$ ... $$
  // Use [\s\S] instead of dot-all flag for broader TS target compatibility
  txt = txt.replace(/\\\[([\s\S]+?)\\\]/g, (_, inner) => `$$${inner.trim()}$$`);
  // NOTE: We intentionally DO NOT auto-convert bare [ ... ] to inline math, because it can
  // break patterns like "\\left[ ... \\right]" by introducing a stray '$' (leading to \\left$ errors).
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
  // If text ends with a dangling '$$' (common when LLMs append a closing marker), drop it
  txt = txt.replace(/\$\$\s*$/g, '');
  // 5) If a closing right lacks a delimiter (e.g., "\\right " or "\\right_"), coerce to evaluation bar
  txt = txt.replace(/\\right(?![\s\S])/g, '\\right\\|');
  txt = txt.replace(/\\right(\s*[_^])/g, '\\right\\|$1');

  // 6) Balance braces inside inline $...$ segments, without touching $$...$$ or escaped \$.
  {
    const chars = Array.from(txt);
    let result = '';
    let i = 0;
    while (i < chars.length) {
      const ch = chars[i];
      const prev = i > 0 ? chars[i - 1] : '';
      if (ch === '$' && prev !== '\\') {
        // If it's a $$ block start, skip; handled elsewhere
        if (i + 1 < chars.length && chars[i + 1] === '$') {
          result += '$$';
          i += 2;
          continue;
        }
        // Start of inline math; find the next unescaped '$' not part of '$$'
        let j = i + 1;
        let found = -1;
        while (j < chars.length) {
          if (chars[j] === '$' && chars[j - 1] !== '\\') {
            // ensure not a '$$'
            if (!(j + 1 < chars.length && chars[j + 1] === '$')) {
              found = j;
              break;
            }
          }
          j++;
        }
        if (found !== -1) {
          const inner = chars.slice(i + 1, found).join('');
          const balanced = balanceBraces(inner);
          result += '$' + balanced + '$';
          i = found + 1;
          continue;
        } else {
          // No closing '$' found; treat the rest as normal text
          result += ch;
          i++;
          continue;
        }
      }
      result += ch;
      i++;
    }
    txt = result;
  }
    // Heuristics inside $$ ... $$ blocks to fix common LLM omissions
    txt = txt.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => fixDisplayMathBlock(String(inner ?? '')));
  // 7) Restore fenced and inline code placeholders
  txt = txt.replace(/@@CODE_FENCE_(\d+)@@/g, (_m, d) => {
    const idx = Number(d);
    const entry = codeFencePlaceholders[idx] || { lang: '', body: '' };
    const lang = (entry.lang || '').toLowerCase();
    const body = entry.body;
    if (lang === 'math' || lang === 'latex' || lang === 'tex') {
      return fixDisplayMathBlock(body);
    }
    // Restore as normal fenced code block
    const header = entry.lang ? entry.lang + '\n' : '\n';
    return '```' + header + body + '```';
  });
  txt = txt.replace(/@@INLINE_CODE_(\d+)@@/g, (_m, d) => '`' + (inlineCodePlaceholders[Number(d)] || '') + '`');
  return txt;
}

export const RenderedMessage = React.memo(function RenderedMessage({ content, light }: RenderedMessageProps): React.ReactElement {
  const normalized = useMemo(() => normalizeMath(content), [content]);
  const remarkPlugins = useMemo(() => {
    // Important: remark-math should run before GFM so $...$ is parsed as math, not GFM text
    return hasMath(normalized)
      ? [[remarkMath as any, { singleDollarTextMath: true }], remarkGfm]
      : [remarkGfm];
  }, [normalized]);

  const rehypePlugins = useMemo(() => {
    return hasMath(normalized)
      ? [[rehypeKatex as any, { strict: false, throwOnError: false, errorColor: 'inherit' }]]
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
    <div className={`markdown-body text-[15px] leading-7 ${light ? 'text-gray-900' : 'text-gray-200'}`}>
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

