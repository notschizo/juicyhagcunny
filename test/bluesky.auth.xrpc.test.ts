import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateDpopKeypair } from '@fxembed/atmosphere/providers/bluesky/auth/dpop';
import { authenticatedXrpc } from '@fxembed/atmosphere/providers/bluesky/auth/xrpc-authenticated';
import type { BlueskyAuthSession } from '@fxembed/atmosphere/providers/bluesky/auth/types';
import { refreshBlueskyTokens } from '@fxembed/atmosphere/providers/bluesky/auth/tokens';

async function baseSession(): Promise<BlueskyAuthSession> {
  const dpop = await generateDpopKeypair();
  return {
    did: 'did:plc:test',
    pdsOrigin: 'https://pds.example',
    authServerOrigin: 'https://as.example',
    oauthClientId: 'https://app.example/client-metadata.json',
    tokenEndpoint: 'https://as.example/token',
    accessToken: 'access.token.test',
    refreshToken: 'refresh.token.test',
    accessExpiresAtMs: Date.now() + 3_600_000,
    dpop
  };
}

describe('authenticatedXrpc', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization DPoP and DPoP proof headers', async () => {
    const session = await baseSession();
    const headersSeen: { auth: string; dpop: string }[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const h = init?.headers;
      if (h instanceof Headers) {
        headersSeen.push({
          auth: h.get('Authorization') ?? '',
          dpop: h.get('DPoP') ?? ''
        });
      } else if (h && typeof h === 'object' && !Array.isArray(h)) {
        const o = h as Record<string, string>;
        headersSeen.push({
          auth: o.Authorization ?? o.authorization ?? '',
          dpop: o.DPoP ?? o.dpop ?? ''
        });
      }
      return Response.json({ feed: [], cursor: undefined });
    });

    await authenticatedXrpc<{ feed: unknown[] }>({
      session,
      lexiconMethod: 'app.bsky.feed.getTimeline',
      method: 'GET',
      query: { limit: 10 },
      fetchImpl: globalThis.fetch
    });

    expect(headersSeen.length).toBeGreaterThanOrEqual(1);
    expect(headersSeen[0]!.auth.startsWith('DPoP ')).toBe(true);
    expect(headersSeen[0]!.dpop.length).toBeGreaterThan(20);
  });

  it('refreshes on 401 then retries XRPC', async () => {
    const session = await baseSession();
    let xrpc = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.includes('/xrpc/app.bsky.notification.getUnreadCount')) {
        xrpc += 1;
        if (xrpc === 1) {
          return new Response(JSON.stringify({ error: 'ExpiredToken', message: 'exp' }), {
            status: 401
          });
        }
        return Response.json({ count: 3 });
      }
      if (url.includes('/token')) {
        return Response.json({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600
        });
      }
      return new Response('not found', { status: 404 });
    });

    const { data, session: out } = await authenticatedXrpc<{ count: number }>({
      session,
      lexiconMethod: 'app.bsky.notification.getUnreadCount',
      method: 'GET',
      query: {},
      fetchImpl: globalThis.fetch,
      refreshSkewMs: 0
    });
    expect(data.count).toBe(3);
    expect(out.accessToken).toBe('new-access');
    expect(out.refreshToken).toBe('new-refresh');
    expect(xrpc).toBe(2);
  });
});

describe('refreshBlueskyTokens', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws refresh_invalid on invalid_grant', async () => {
    const session = await baseSession();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('invalid_grant', { status: 400, statusText: 'Bad Request' })
    );
    await expect(
      refreshBlueskyTokens({ session, fetchImpl: globalThis.fetch })
    ).rejects.toMatchObject({
      kind: 'refresh_invalid'
    });
  });
});
