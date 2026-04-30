import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveHandleToDid } from '@fxembed/atmosphere/providers/bluesky/auth/identity';

describe('resolveHandleToDid', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses HTTPS well-known when present', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url === 'https://alice.example/.well-known/atproto-did') {
        return new Response('did:plc:abc123\n', { status: 200 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const did = await resolveHandleToDid('alice.example', globalThis.fetch);
    expect(did).toBe('did:plc:abc123');
  });

  it('falls back to public.api.bsky.app when well-known is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url === 'https://wuff.gay/.well-known/atproto-did') {
        return new Response('Not Found', { status: 404 });
      }
      if (
        url.startsWith('https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle') &&
        url.includes('handle=wuff.gay')
      ) {
        return Response.json({ did: 'did:plc:zwtueiiirvltofxf65pemf5f' });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const did = await resolveHandleToDid('wuff.gay', globalThis.fetch);
    expect(did).toBe('did:plc:zwtueiiirvltofxf65pemf5f');
  });
});
