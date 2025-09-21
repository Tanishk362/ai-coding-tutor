import { describe, it, expect, vi } from 'vitest';

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ count: 0, error: null }) }) }),
    }),
  },
}));

import { slugify, isSlugAvailable } from '@/src/data/chatbots';

describe('slugify', () => {
  it('creates kebab case and strips invalid chars', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
    expect(slugify('  My__Bot  ')).toBe('my-bot');
  });
});

describe('isSlugAvailable', () => {
  it('returns true when count is zero', async () => {
    const ok = await isSlugAvailable('hello');
    expect(ok).toBe(true);
  });
});

