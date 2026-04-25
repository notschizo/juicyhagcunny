import { describe, expect, it } from 'vitest';
import {
  decodeCommentCursor,
  decodeProfileCursor,
  encodeCommentCursor,
  encodeProfileCursor
} from '../src/providers/instagram/cursors';

describe('instagram cursors', () => {
  it('roundtrips profile cursor', () => {
    const cur = {
      v: 1 as const,
      k: 't' as const,
      uid: '173560420',
      u: 'cristiano',
      a: 'CURSOR123',
      c: 12
    };
    const enc = encodeProfileCursor(cur);
    expect(decodeProfileCursor(enc)).toEqual(cur);
  });

  it('roundtrips comment cursor', () => {
    const cur = {
      v: 1 as const,
      mediaId: '3881689364048676894',
      shortcode: 'DXeh-kYiIge',
      sort: 'popular' as const,
      after: 'AFTER',
      count: 10
    };
    const enc = encodeCommentCursor(cur);
    expect(decodeCommentCursor(enc)).toEqual(cur);
  });
});
