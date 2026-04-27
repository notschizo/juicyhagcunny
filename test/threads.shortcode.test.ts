import { describe, expect, it } from 'vitest';
import {
  normalizeThreadsPostId,
  threadsShortcodeToMediaId
} from '../src/providers/threads/shortcode';

describe('normalizeThreadsPostId', () => {
  it('extracts shortcode from /@user/post/ URL', () => {
    expect(
      normalizeThreadsPostId('https://www.threads.com/@spiramidgareorzea/post/DXhZAMkljvS/')
    ).toBe('DXhZAMkljvS');
  });

  it('extracts shortcode from threads.net', () => {
    expect(normalizeThreadsPostId('https://www.threads.net/@user/post/ABCdef12/')).toBe('ABCdef12');
  });

  it('returns bare shortcode', () => {
    expect(normalizeThreadsPostId('DXhZAMkljvS')).toBe('DXhZAMkljvS');
  });
});

describe('threadsShortcodeToMediaId', () => {
  it('decodes known sample shortcode to media pk string', () => {
    expect(threadsShortcodeToMediaId('DXhZAMkljvS')).toBe('3882494318431583186');
  });
});
