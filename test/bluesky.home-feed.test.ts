import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setBlueskyProviderEnv,
  setBlueskyProxyRuntime
} from '@fxembed/atmosphere/providers/bluesky-runtime';
import { generateDpopKeypair } from '@fxembed/atmosphere/providers/bluesky/auth/dpop';
import { fetchBlueskyHomeFeed } from '@fxembed/atmosphere/providers/bluesky/home-feed';
import type { BlueskyAuthSession } from '@fxembed/atmosphere/providers/bluesky/auth/types';
import type { BlueskyBuildHost } from '@fxembed/atmosphere/providers/bluesky/build-host';

const credMocks = vi.hoisted(() => ({
  initCredentials: vi.fn().mockResolvedValue(undefined),
  hasBundledEncryptedCredentials: vi.fn(() => false),
  hasBlueskyProxyAccounts: vi.fn(() => false),
  getShuffledBlueskyAccounts: vi.fn(
    () => [] as { identifier: string; appPassword: string; service: string }[]
  ),
  blueskyProxyServiceHostname: vi.fn(() => '')
}));

beforeEach(() => {
  setBlueskyProviderEnv({
    apiRoot: 'https://public.api.bsky.app',
    webRoot: 'https://bsky.app',
    videoBase: 'https://video.bsky.app',
    mosaicBskyDomainList: [],
    polyglotDomainList: []
  });
  setBlueskyProxyRuntime({
    initCredentials: credMocks.initCredentials,
    hasBundledEncryptedCredentials: credMocks.hasBundledEncryptedCredentials,
    hasBlueskyProxyAccounts: credMocks.hasBlueskyProxyAccounts,
    getShuffledBlueskyAccounts: credMocks.getShuffledBlueskyAccounts,
    blueskyProxyServiceHostname: credMocks.blueskyProxyServiceHostname
  });
});

describe('fetchBlueskyHomeFeed', () => {
  it('maps feed to results and returns session', async () => {
    const dpop = await generateDpopKeypair();
    const session: BlueskyAuthSession = {
      did: 'did:plc:abc',
      handle: 'user.bsky.social',
      pdsOrigin: 'https://pds.example',
      authServerOrigin: 'https://as.example',
      oauthClientId: 'https://app.example/cm.json',
      tokenEndpoint: 'https://as.example/token',
      accessToken: 'at',
      refreshToken: 'rt',
      accessExpiresAtMs: Date.now() + 3600_000,
      dpop
    };

    const stubPost: BlueskyPost = {
      uri: 'at://did:plc:abc/app.bsky.feed.post/3abc',
      cid: 'cid123',
      author: {
        did: 'did:plc:abc',
        handle: 'user.bsky.social',
        displayName: 'User',
        avatar: 'https://cdn.example/a.jpg',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      record: { text: 'hello', createdAt: '2024-01-01T00:00:00.000Z', $type: 'app.bsky.feed.post' },
      indexedAt: '2024-01-01T00:00:00.000Z',
      labels: [],
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      quoteCount: 0
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        feed: [{ post: stubPost }],
        cursor: 'next-cursor'
      })
    );

    const host: BlueskyBuildHost = {
      t: k => k,
      credentialKey: undefined
    };

    const { response, session: out } = await fetchBlueskyHomeFeed({
      session,
      host,
      limit: 10,
      fetchImpl: globalThis.fetch
    });
    expect(response.code).toBe(200);
    expect(response.results.length).toBe(1);
    expect(response.results[0]!.text).toBe('hello');
    expect(response.cursor.bottom).toBe('next-cursor');
    expect(out.accessToken).toBe('at');
  });
});
