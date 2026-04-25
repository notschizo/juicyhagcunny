import { describe, expect, it } from 'vitest';
import { instagramShortcodeToPk, normalizeInstagramPostId } from '../src/providers/instagram/shortcode';

describe('normalizeInstagramPostId', () => {
  it('extracts shortcode from /p/ URL', () => {
    expect(normalizeInstagramPostId('https://www.instagram.com/cristiano/p/DXeh-kYiIge/')).toBe(
      'DXeh-kYiIge'
    );
  });
  it('extracts shortcode from /reel/ URL', () => {
    expect(normalizeInstagramPostId('https://www.instagram.com/reel/ABCdef12/')).toBe('ABCdef12');
  });
  it('returns bare shortcode', () => {
    expect(normalizeInstagramPostId('DXeh-kYiIge')).toBe('DXeh-kYiIge');
  });
});

describe('instagramShortcodeToPk', () => {
  it('decodes known Cristiano sample shortcode to media pk', () => {
    const pk = instagramShortcodeToPk('DXeh-kYiIge');
    expect(pk.toString()).toBe('3881689364048676894');
  });
});
