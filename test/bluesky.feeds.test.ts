import { test, expect, vi, afterEach } from 'vitest';
import { app } from '../src/worker';
import { botHeaders } from './helpers/data';
import harness from './helpers/harness';
import authorFeed from './fixtures/bluesky/author-feed.json';

afterEach(() => {
  vi.restoreAllMocks();
});

test('Bluesky realm serves RSS for profile feed.xml', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo) => {
    const u = typeof input === 'string' ? input : input.url;
    if (u.includes('app.bsky.feed.getAuthorFeed')) {
      return new Response(JSON.stringify(authorFeed), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  });

  const res = await app.request(
    new Request('https://fxbsky.app/profile/author.test/feed.xml', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('application/rss+xml');
  const text = await res.text();
  expect(text).toContain('<rss version="2.0"');
  expect(text).toContain('<atom:link');
  expect(text).toContain('rel="self"');
  expect(text).toContain('/profile/author.test/feed.xml');
  expect(text).toMatch(/post\/rkey/);
});

test('Bluesky realm serves Atom for profile feed.atom.xml', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo) => {
    const u = typeof input === 'string' ? input : input.url;
    if (u.includes('app.bsky.feed.getAuthorFeed')) {
      return new Response(JSON.stringify(authorFeed), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  });

  const res = await app.request(
    new Request('https://fxbsky.app/profile/author.test/feed.atom.xml', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('application/atom+xml');
  const text = await res.text();
  expect(text).toContain('xmlns="http://www.w3.org/2005/Atom"');
  expect(text).toContain('rel="self"');
  expect(text).toContain('/profile/author.test/feed.atom.xml');
});

test('Bluesky realm serves RSS for profile media.xml', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo) => {
    const u = typeof input === 'string' ? input : input.url;
    if (u.includes('app.bsky.feed.getAuthorFeed')) {
      expect(u).toContain('filter=posts_with_media');
      return new Response(JSON.stringify(authorFeed), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw new Error(`Unexpected fetch: ${u}`);
  });

  const res = await app.request(
    new Request('https://fxbsky.app/profile/author.test/media.xml', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('application/rss+xml');
  const text = await res.text();
  expect(text).toContain('<rss version="2.0"');
  expect(text).toContain('/profile/author.test/media.xml');
  expect(text).toContain('rel="self"');
});
