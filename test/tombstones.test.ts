import { afterEach, expect, test, vi } from 'vitest';
import { app } from '../src/worker';
import { botHeaders } from './helpers/data';
import harness from './helpers/harness';
import { stripTombstones } from '../src/helpers/tombstone';
import { DataProvider } from '../src/enum';
import threadQuoteNotfound from './fixtures/bluesky/thread-quote-notfound.json';
import { statusesToFeedItems } from '../src/helpers/syndicationFeeds';
import type { APIStatusTombstone, APITwitterStatus } from '../src/realms/api/schemas';

afterEach(() => {
  vi.restoreAllMocks();
});

const tombstone = (reason: APIStatusTombstone['reason']): APIStatusTombstone => ({
  type: 'tombstone',
  provider: 'twitter',
  reason,
  message: `msg-${reason}`,
  id: 't1'
});

const minimalTwitterStatus = (overrides: Partial<APITwitterStatus> = {}): APITwitterStatus =>
  ({
    type: 'status',
    id: '1',
    url: 'https://x.com/x/status/1',
    text: 'hello',
    created_at: 'Mon Jan 01 00:00:00 +0000 2024',
    created_timestamp: 1704067200,
    likes: 0,
    reposts: 0,
    replies: 0,
    author: {
      id: '12',
      name: 'A',
      screen_name: 'a',
      url: 'https://x.com/a',
      avatar_url: '',
      banner_url: null,
      followers: 0,
      following: 0,
      statuses: 0,
      joined: null,
      location: null,
      website: null,
      verified: false,
      protected: false,
      possibly_sensitive: false
    },
    media: {},
    raw_text: { text: 'hello', facets: [] },
    lang: 'en',
    possibly_sensitive: false,
    replying_to: null,
    source: null,
    embed_card: 'summary',
    provider: DataProvider.Twitter,
    ...overrides
  }) as APITwitterStatus;

test('stripTombstones removes nested quote tombstones and thread items', () => {
  const innerTomb = tombstone('deleted');
  const quoted = minimalTwitterStatus({ id: '2', quote: innerTomb });
  const outer = minimalTwitterStatus({ id: '3', quote: quoted });
  const th = tombstone('unavailable');
  const thread = {
    code: 200 as const,
    status: outer,
    thread: [outer, th, minimalTwitterStatus({ id: '4' })],
    author: outer.author
  };

  stripTombstones(thread);

  expect((thread.status.quote as APITwitterStatus | undefined)?.quote).toBeUndefined();
  expect(thread.thread?.length).toBe(2);
  expect(thread.thread?.every(t => (t as { type?: string }).type !== 'tombstone')).toBe(true);
});

test('API v2 /2/status empty quoted_status_result yields tombstone quote', async () => {
  const res = await app.request(
    new Request('https://api.fxtwitter.com/2/status/991001', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { status: APITwitterStatus };
  expect(body.status.quote).toMatchObject({
    type: 'tombstone',
    reason: 'unavailable',
    id: '991888'
  });
  expect(body.status.quote && 'url' in body.status.quote ? body.status.quote.url : '').toContain(
    '991888'
  );
});

test('API v2 /2/status TweetUnavailable Suspended quote yields suspended tombstone', async () => {
  const res = await app.request(
    new Request('https://api.fxtwitter.com/2/status/991004', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as { status: APITwitterStatus };
  expect(body.status.quote).toMatchObject({
    type: 'tombstone',
    reason: 'suspended'
  });
});

test('API v2 /2/thread includes tombstone between chain tweets', async () => {
  const res = await app.request(
    new Request('https://api.fxtwitter.com/2/thread/991202', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(res.status).toBe(200);
  const body = (await res.json()) as {
    thread: unknown[] | null;
  };
  expect(body.thread?.length).toBeGreaterThanOrEqual(2);
  const threadTombs = body.thread?.filter(
    (x): x is APIStatusTombstone =>
      typeof x === 'object' && x !== null && (x as APIStatusTombstone).type === 'tombstone'
  );
  expect(threadTombs?.length).toBe(1);
  expect(threadTombs?.[0]?.reason).toBe('deleted');
});

test('syndication feed HTML includes tombstone quote message', () => {
  const status = minimalTwitterStatus({
    quote: tombstone('blocked')
  });
  const items = statusesToFeedItems([status], {});
  expect(items[0]?.htmlContent).toContain('msg-blocked');
  expect(items[0]?.htmlContent).toContain('<blockquote>');
});

test('GET /2/status Bluesky quote viewNotFound yields tombstone', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo) => {
    const u = typeof input === 'string' ? input : input.url;
    if (u.includes('app.bsky.feed.getPostThread')) {
      return new Response(JSON.stringify(threadQuoteNotfound), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (u.includes('app.bsky.actor.getProfiles')) {
      return new Response(JSON.stringify({ profiles: [] }), { status: 200 });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  });

  const res = await app.request('https://api.fxbsky.app/2/status/author.test/rkeyquotehost', {
    headers: { 'User-Agent': 'FxEmbedTest/1.0' }
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { status: { quote?: APIStatusTombstone } };
  expect(body.status.quote?.type).toBe('tombstone');
  expect(body.status.quote?.reason).toBe('deleted');
  expect(body.status.quote?.at_uri).toContain('rkeygone');
});
