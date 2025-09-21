import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/src/lib/supabase', () => {
  const state = { lastSlug: '', neqCalled: false };
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((col: string, val: any) => {
      if (col === 'slug') state.lastSlug = String(val);
      return chain;
    }),
    neq: vi.fn((_col: string, _val: any) => { state.neqCalled = true; return chain; }),
    then: (resolve: any) => resolve({ count: state.lastSlug.includes('taken') ? 1 : 0, error: null }),
  };
  const supabase = { from: vi.fn((_t: string) => chain) } as any;
  return { supabase, __state: state };
});

import { isSlugAvailable } from '@/src/data/chatbots';
import { __state as supaState } from '@/src/lib/supabase';

describe('isSlugAvailable', () => {
  beforeEach(() => { supaState.lastSlug = ''; supaState.neqCalled = false; });

  it('returns true when slug free', async () => {
    const ok = await isSlugAvailable('free-slug');
    expect(ok).toBe(true);
  });

  it('returns false when slug taken', async () => {
    const ok = await isSlugAvailable('already-taken');
    expect(ok).toBe(false);
  });

  it('applies excludeId via neq', async () => {
    const ok = await isSlugAvailable('already-taken', 'some-id');
    expect(ok).toBe(false);
    expect(supaState.neqCalled).toBe(true);
  });
});

