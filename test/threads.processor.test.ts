import { describe, expect, it } from 'vitest';
import {
  textAndFacetsFromThreadsPost,
  threadsPostToStatus,
  userFromThreadsProfilePayload,
  xdtThreadEdgeToSubstatus
} from '../src/providers/threads/processor';

describe('threads processor', () => {
  const ownerFb = {
    id: '63398805919',
    username: 'spiramidgareorzea',
    fullName: 'Gem',
    pic: 'https://cdn.example/p.jpg'
  };

  it('maps text_fragments plaintext to status text', () => {
    const body = 'Hello threads';
    const post: Record<string, unknown> = {
      pk: '3882494318431583186',
      code: 'DXhZAMkljvS',
      user: {
        pk: '63398805919',
        id: '63398805919',
        username: 'spiramidgareorzea',
        full_name: 'Gem'
      },
      taken_at: 1777049411,
      like_count: 1,
      text_post_app_info: {
        direct_reply_count: 0,
        quote_count: 0,
        repost_count: 0,
        text_fragments: {
          fragments: [
            {
              fragment_type: 'plaintext',
              plaintext: body,
              mention_fragment: null,
              link_fragment: null
            }
          ]
        }
      },
      image_versions2: { candidates: [] },
      media_type: 19
    };
    const s = threadsPostToStatus(post, ownerFb);
    expect(s).toBeTruthy();
    expect(s!.id).toBe('DXhZAMkljvS');
    expect(s!.provider).toBe('threads');
    expect(s!.text).toBe(body);
    expect(s!.url).toContain('/@spiramidgareorzea/post/DXhZAMkljvS/');
    expect(s!.media_pk).toBe('3882494318431583186');
  });

  it('maps XDT thread edge to substatus with shortcode id and media_pk', () => {
    const body = 'Reply text';
    const post: Record<string, unknown> = {
      pk: '3882494318431583186_63398805919',
      code: 'DXhZAMkljvS',
      user: {
        pk: '63398805919',
        id: '63398805919',
        username: 'spiramidgareorzea',
        full_name: 'Gem'
      },
      taken_at: 1777049411,
      like_count: 0,
      text_post_app_info: {
        direct_reply_count: 0,
        quote_count: 0,
        repost_count: 0,
        text_fragments: {
          fragments: [
            {
              fragment_type: 'plaintext',
              plaintext: body,
              mention_fragment: null,
              link_fragment: null
            }
          ]
        }
      },
      image_versions2: { candidates: [] },
      media_type: 19
    };
    const edge = { node: { thread_items: [{ post }] } };
    const sub = xdtThreadEdgeToSubstatus(edge, 'PARENTCODE', 'spiramidgareorzea');
    expect(sub).toBeTruthy();
    expect(sub!.id).toBe('DXhZAMkljvS');
    expect(sub!.url).toContain('/post/DXhZAMkljvS/');
    expect(sub!.parent_id).toBe('PARENTCODE');
    expect(sub!.media_pk).toBe('3882494318431583186');
  });

  it('prefers text_fragments over caption when both exist (keeps facets)', () => {
    const { text, facets } = textAndFacetsFromThreadsPost({
      caption: { text: 'Caption only' },
      text_post_app_info: {
        text_fragments: {
          fragments: [
            {
              fragment_type: 'mention',
              plaintext: '@someone',
              mention_fragment: {
                mentioned_user: { username: 'someone', id: '1' }
              },
              link_fragment: null
            }
          ]
        }
      }
    } as Record<string, unknown>);
    expect(text).toBe('@someone');
    expect(facets).toHaveLength(1);
    expect(facets[0]).toMatchObject({ type: 'mention', replacement: '@someone' });
  });

  it('extracts facets for mention fragments', () => {
    const { text, facets } = textAndFacetsFromThreadsPost({
      caption: null,
      text_post_app_info: {
        text_fragments: {
          fragments: [
            {
              fragment_type: 'mention',
              plaintext: '@kidcapri101',
              mention_fragment: {
                mentioned_user: { username: 'kidcapri101', id: '63059539459' }
              },
              link_fragment: null
            },
            {
              fragment_type: 'plaintext',
              plaintext: ' hello',
              mention_fragment: null,
              link_fragment: null
            }
          ]
        }
      }
    } as Record<string, unknown>);
    expect(text).toBe('@kidcapri101 hello');
    expect(facets.some(f => f.type === 'mention')).toBe(true);
  });

  it('maps profile user payload to APIUser', () => {
    const u = userFromThreadsProfilePayload({
      pk: '68064311167',
      id: '68064311167',
      username: 'deedeeandbridget',
      full_name: 'Dee Dee James',
      biography: 'Bio line',
      follower_count: 49,
      is_verified: false,
      text_post_app_is_private: false,
      profile_pic_url: 'https://cdn.example/avatar.jpg'
    });
    expect(u).toBeTruthy();
    expect(u!.screen_name).toBe('deedeeandbridget');
    expect(u!.followers).toBe(49);
    expect(u!.description).toBe('Bio line');
    expect(u!.raw_description.text).toBe('Bio line');
    expect(u!.raw_description.facets).toEqual([]);
  });

  it('maps text_app_biography fragments to description and raw_description facets', () => {
    const u = userFromThreadsProfilePayload({
      pk: '1',
      id: '1',
      username: 'someone',
      full_name: 'Someone',
      biography: '',
      text_app_biography: {
        text_fragments: {
          fragments: [
            {
              fragment_type: 'mention',
              plaintext: '@kidcapri101',
              mention_fragment: {
                mentioned_user: { username: 'kidcapri101', id: '63059539459' }
              },
              link_fragment: null
            },
            {
              fragment_type: 'plaintext',
              plaintext: ' hello',
              mention_fragment: null,
              link_fragment: null
            }
          ]
        }
      },
      follower_count: 0,
      is_verified: false,
      text_post_app_is_private: false,
      profile_pic_url: 'https://cdn.example/avatar.jpg'
    } as Record<string, unknown>);
    expect(u).toBeTruthy();
    expect(u!.description).toBe('@kidcapri101 hello');
    expect(u!.raw_description.text).toBe('@kidcapri101 hello');
    expect(u!.raw_description.facets.some(f => f.type === 'mention')).toBe(true);
  });
});
