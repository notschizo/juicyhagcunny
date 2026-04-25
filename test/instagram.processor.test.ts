import { describe, expect, it } from 'vitest';
import {
  commentRecordToSubstatus,
  fullUserFromWebProfile,
  instagramNodeToStatus,
  mapCommentEdges
} from '../src/providers/instagram/processor';

describe('instagram processor', () => {
  const ownerFb = {
    id: '173560420',
    username: 'cristiano',
    fullName: 'CR7',
    pic: 'https://cdn.example/p.jpg'
  };

  it('maps graph-style media node to status', () => {
    const node: Record<string, unknown> = {
      shortcode: 'DXeh-kYiIge',
      id: '3881689364048676894_173560420',
      taken_at_timestamp: 1776953871,
      is_video: false,
      owner: { id: '173560420', username: 'cristiano' },
      edge_media_to_caption: {
        edges: [{ node: { text: 'Caption line' } }]
      },
      edge_liked_by: { count: 10 },
      edge_media_to_comment: { count: 3 },
      display_url: 'https://cdn.example/post.jpg',
      dimensions: { width: 640, height: 1136 }
    };
    const s = instagramNodeToStatus(node, ownerFb);
    expect(s).toBeTruthy();
    expect(s!.id).toBe('DXeh-kYiIge');
    expect(s!.provider).toBe('instagram');
    expect(s!.likes).toBe(10);
    expect(s!.replies).toBe(3);
    expect(s!.text).toBe('Caption line');
    expect(s!.media_pk).toBe('3881689364048676894');
  });

  it('maps comment node to substatus', () => {
    const sub = commentRecordToSubstatus(
      {
        pk: '17915753442361302',
        text: 'Great post',
        created_at: 1776954000,
        user: { pk: '99', username: 'fan', profile_pic_url: null }
      },
      'DXeh-kYiIge'
    );
    expect(sub).toBeTruthy();
    expect(sub!.type).toBe('substatus');
    expect(sub!.parent_id).toBe('DXeh-kYiIge');
    expect(sub!.provider).toBe('instagram');
    expect(sub!.replying_to?.status).toBe('DXeh-kYiIge');
  });

  it('maps comment edges', () => {
    const edges = [{ node: { pk: '1', text: 'a', created_at: 1, user: { pk: '2', username: 'u' } } }];
    const out = mapCommentEdges(edges, 'SC');
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe('1');
  });

  it('parses web_profile_info envelope to API user', () => {
    const json = {
      data: {
        user: {
          id: '173560420',
          username: 'cristiano',
          full_name: 'Cristiano Ronaldo',
          biography: 'Bio',
          edge_followed_by: { count: 100 },
          edge_follow: { count: 5 },
          edge_owner_to_timeline_media: { count: 10 },
          profile_pic_url: 'https://cdn.example/a.jpg',
          is_verified: true,
          is_private: false
        }
      }
    };
    const u = fullUserFromWebProfile(json as Record<string, unknown>);
    expect(u).toBeTruthy();
    expect(u!.screen_name).toBe('cristiano');
    expect(u!.followers).toBe(100);
    expect(u!.protected).toBe(false);
  });
});
