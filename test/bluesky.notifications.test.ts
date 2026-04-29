import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setBlueskyProviderEnv,
  setBlueskyProxyRuntime
} from '@fxembed/atmosphere/providers/bluesky-runtime';
import { generateDpopKeypair } from '@fxembed/atmosphere/providers/bluesky/auth/dpop';
import {
  fetchBlueskyNotifications,
  getBlueskyNotificationUnreadCount,
  updateBlueskyNotificationSeen
} from '@fxembed/atmosphere/providers/bluesky/notifications';
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

async function session(): Promise<BlueskyAuthSession> {
  const dpop = await generateDpopKeypair();
  return {
    did: 'did:plc:abc',
    pdsOrigin: 'https://pds.example',
    authServerOrigin: 'https://as.example',
    oauthClientId: 'https://app.example/cm.json',
    tokenEndpoint: 'https://as.example/token',
    accessToken: 'at',
    refreshToken: 'rt',
    accessExpiresAtMs: Date.now() + 3600_000,
    dpop
  };
}

describe('Bluesky notifications API', () => {
  it('fetchBlueskyNotifications hydrates like subject', async () => {
    const s = await session();
    const subjectUri = 'at://did:plc:abc/app.bsky.feed.post/subj1';
    const stubPost: BlueskyPost = {
      uri: subjectUri,
      cid: 'subcid',
      author: {
        did: 'did:plc:other',
        handle: 'other.bsky.social',
        displayName: 'Other',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      record: {
        text: 'liked post',
        createdAt: '2024-01-01T00:00:00.000Z',
        $type: 'app.bsky.feed.post'
      },
      indexedAt: '2024-01-01T00:00:00.000Z',
      labels: [],
      likeCount: 1,
      repostCount: 0,
      replyCount: 0,
      quoteCount: 0
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      const url = String(input);
      if (url.includes('listNotifications')) {
        return Response.json({
          notifications: [
            {
              uri: 'at://did:plc:abc/app.bsky.notification.listNotifications/n1',
              cid: 'ncid',
              author: {
                did: 'did:plc:liker',
                handle: 'liker.bsky.social',
                displayName: 'Liker',
                createdAt: '2024-01-02T00:00:00.000Z'
              },
              reason: {
                $type: 'app.bsky.notification.like#reasonLike',
                subject: subjectUri,
                like: 'at://did:plc:liker/app.bsky.feed.like/xyz'
              },
              indexedAt: '2024-01-02T00:00:00.000Z',
              isRead: false
            }
          ],
          cursor: 'c1'
        });
      }
      if (url.includes('getPosts')) {
        return Response.json({ posts: [stubPost] });
      }
      return new Response('not found', { status: 404 });
    });

    const host: BlueskyBuildHost = { t: k => k };
    const { response, session: out } = await fetchBlueskyNotifications({
      session: s,
      host,
      fetchImpl: globalThis.fetch
    });
    expect(response.code).toBe(200);
    expect(response.results.length).toBe(1);
    expect(response.results[0]!.reason).toBe('like');
    expect(response.results[0]!.subject_status?.text).toBe('liked post');
    expect(response.cursor.bottom).toBe('c1');
    expect(out.accessToken).toBe('at');
  });

  it('getBlueskyNotificationUnreadCount returns count', async () => {
    const s = await session();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ count: 7 }));
    const { count, session: out } = await getBlueskyNotificationUnreadCount({
      session: s,
      fetchImpl: globalThis.fetch
    });
    expect(count).toBe(7);
    expect(out.accessToken).toBe('at');
  });

  it('updateBlueskyNotificationSeen posts body', async () => {
    const s = await session();
    let body = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      body = typeof init?.body === 'string' ? init.body : '';
      return Response.json({});
    });
    const { session: out } = await updateBlueskyNotificationSeen({
      session: s,
      seenAt: '2024-01-03T00:00:00.000Z',
      fetchImpl: globalThis.fetch
    });
    expect(JSON.parse(body)).toEqual({ seenAt: '2024-01-03T00:00:00.000Z' });
    expect(out.accessToken).toBe('at');
  });
});
