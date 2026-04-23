import { test, expect } from 'vitest';
import { app } from '../src/worker';
import { botHeaders } from './helpers/data';
import harness from './helpers/harness';

test('GET /2/openapi.json returns OpenAPI 3 document with v2 paths', async () => {
  const result = await app.request(
    new Request('https://api.fxtwitter.com/2/openapi.json', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(result.status).toBe(200);
  expect(result.headers.get('content-type')).toContain('application/json');
  const doc = (await result.json()) as {
    openapi: string;
    info: { title: string; version: string };
    paths: Record<string, unknown>;
  };
  expect(doc.openapi).toMatch(/^3\.0\./);
  expect(doc.info.title).toBe('FxTwitter API');
  expect(doc.paths['/2/status/{id}']).toBeDefined();
  expect(doc.paths['/2/status/{id}/reposts']).toBeDefined();
  expect(doc.paths['/2/status/{id}/quotes']).toBeDefined();
  expect(doc.paths['/2/openapi.json']).toBeUndefined();
  expect(doc.paths['/2/owoembed']).toBeUndefined();
  expect(doc.paths['/2/hit']).toBeUndefined();
  expect(doc.paths['/2/go']).toBeUndefined();
});

test('FxTwitter OpenAPI includes grouped timeline and v2 type discriminators', async () => {
  const result = await app.request(
    new Request('https://api.fxtwitter.com/2/openapi.json', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(result.status).toBe(200);
  const doc = (await result.json()) as {
    components?: {
      schemas?: Record<
        string,
        { properties?: Record<string, unknown>; oneOf?: Array<{ $ref?: string }> }
      >;
    };
  };
  const schemas = doc.components?.schemas;
  expect(schemas?.TimelineEntryTwitter).toBeDefined();
  expect(schemas?.APIGroupedSearchResults).toBeDefined();
  expect(schemas?.APITwitterStatus?.properties?.type).toBeDefined();
  expect(schemas?.APIUser?.properties?.type).toBeDefined();
  const timelineEntry = schemas?.TimelineEntryTwitter as {
    discriminator?: { mapping?: Record<string, string>; propertyName?: string };
    oneOf?: unknown[];
  };
  /* zod-openapi emits discriminated unions as plain `oneOf` (no `discriminator` block) when the
   * branches are wrapped in `z.lazy`, which our self-referential status schemas require. Verify the
   * union still references both branches. */
  const refs = (schemas?.TimelineEntryTwitter?.oneOf ?? []).map(b => b.$ref);
  expect(refs).toContain('#/components/schemas/APITwitterStatus');
  expect(refs).toContain('#/components/schemas/TimelineThreadTwitter');
  expect(timelineEntry?.discriminator?.mapping?.undefined).toBeUndefined();
});

test('FxBluesky OpenAPI includes grouped timeline entry schema', async () => {
  const result = await app.request(
    new Request('https://api.fxbsky.app/2/openapi.json', {
      method: 'GET',
      headers: botHeaders
    }),
    undefined,
    harness
  );
  expect(result.status).toBe(200);
  const doc = (await result.json()) as {
    components?: { schemas?: Record<string, { oneOf?: Array<{ $ref?: string }> }> };
  };
  expect(doc.components?.schemas?.TimelineEntryBluesky).toBeDefined();
  expect(doc.components?.schemas?.APIGroupedSearchResultsBluesky).toBeDefined();
  const entry = doc.components?.schemas?.TimelineEntryBluesky as {
    discriminator?: { mapping?: Record<string, string> };
    oneOf?: unknown[];
  };
  const bskyMapping = entry?.discriminator?.mapping;
  if (bskyMapping?.status) {
    expect(bskyMapping.status).toBe('#/components/schemas/APIBlueskyStatus');
  } else {
    expect(entry).toBeDefined();
    const refs = (doc.components?.schemas?.TimelineEntryBluesky?.oneOf ?? []).map(b => b.$ref);
    expect(refs).toContain('#/components/schemas/APIBlueskyStatus');
    expect(refs).toContain('#/components/schemas/TimelineThreadBluesky');
  }
  expect(entry?.discriminator?.mapping?.undefined).toBeUndefined();
});
