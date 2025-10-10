import { describe, it, expect } from 'vitest';
import { instructionsSchema, settingsSchema } from '@/src/components/builder/schemas';

describe('Instructions validation', () => {
  it('rejects empty greeting and long directive', () => {
    const r1 = instructionsSchema.safeParse({ greeting: '', directive: '' });
    expect(r1.success).toBe(false);
    const long = 'x'.repeat(9000);
    const r2 = instructionsSchema.safeParse({ greeting: 'hi', directive: long });
    expect(r2.success).toBe(false);
  });

  it('accepts valid values', () => {
    const r = instructionsSchema.safeParse({ greeting: 'Hello', directive: 'Be helpful' });
    expect(r.success).toBe(true);
  });
});

describe('Settings validation', () => {
  it('requires proper name and slug', () => {
    const r1 = settingsSchema.safeParse({ name: 'ab', slug: 'Bad Slug', is_public: false });
    expect(r1.success).toBe(false);
    const r2 = settingsSchema.safeParse({ name: 'Valid Name', slug: 'valid-slug', is_public: true });
    expect(r2.success).toBe(true);
  });
});

