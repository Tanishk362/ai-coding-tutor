import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, truncate } from '@/src/lib/prompt';

const bot: any = {
  name: 'Test Bot',
  directive: 'Be helpful.',
  knowledge_base: 'Knowledge'.repeat(1000),
};

describe('prompt utils', () => {
  it('truncates properly', () => {
    const s = 'a'.repeat(9000);
    expect(truncate(s).length).toBe(8000);
  });

  it('buildSystemPrompt includes directive and context', () => {
    const p = buildSystemPrompt(bot);
    expect(p).toContain('You are Test Bot.');
    expect(p).toContain('Be helpful.');
    expect(p).toContain('Context:');
  });
});

