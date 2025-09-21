import { describe, it, expect, vi } from 'vitest';

vi.mock('openai', () => {
  class OpenAI {
    chat = { completions: { create: async () => ({ choices: [{ message: { content: 'ok' } }] }) } } as any;
  }
  return { default: OpenAI };
});

const mockBuild = vi.fn(() => 'SYSTEM');
vi.mock('@/src/lib/prompt', () => ({ buildSystemPrompt: (bot: any) => { (mockBuild as any)(bot); return 'SYSTEM'; } }));

describe('preview API uses buildSystemPrompt', async () => {
  const { POST } = await import('@/app/api/preview/chat/route');
  it('calls buildSystemPrompt with payload', async () => {
    const body = { bot: { name: 'X', directive: 'Y', knowledge_base: 'Z' }, messages: [] };
    const req = new Request('http://test/api/preview/chat', { method: 'POST', body: JSON.stringify(body) });
    // inject fake env for key
    (process as any).env.OPENAI_API_KEY = 'sk-test';
    const res = await POST(req as any);
    expect(mockBuild).toHaveBeenCalled();
  });
});
