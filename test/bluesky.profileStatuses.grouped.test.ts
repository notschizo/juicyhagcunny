import { describe, expect, it } from 'vitest';
import { groupConsecutiveSelfReplies } from '../src/providers/bluesky/profileStatuses';

const postView = (
  uri: string,
  authorDid: string,
  replyParentUri: string | null,
  replyRootUri: string | null
): BlueskyFeedViewPost => ({
  post: {
    uri,
    cid: `cid-${uri}`,
    author: { did: authorDid, handle: 'a.bsky.social', displayName: 'A' },
    record: {
      $type: 'app.bsky.feed.post',
      text: uri,
      createdAt: '2024-01-01T00:00:00.000Z',
      ...(replyParentUri || replyRootUri
        ? {
            reply: {
              parent: replyParentUri ? { cid: 'p', uri: replyParentUri } : undefined,
              root: replyRootUri ? { cid: 'r', uri: replyRootUri } : undefined
            }
          }
        : {})
    },
    indexedAt: '2024-01-01T00:00:00.000Z',
    labels: []
  }
});

describe('groupConsecutiveSelfReplies', () => {
  it('groups a newest-first self-reply chain', () => {
    const did = 'did:plc:abc';
    const rootUri = 'at://did:plc:abc/app.bsky.feed.post/root1';
    const midUri = 'at://did:plc:abc/app.bsky.feed.post/mid2';
    const leafUri = 'at://did:plc:abc/app.bsky.feed.post/leaf3';
    const feed: BlueskyFeedViewPost[] = [
      postView(leafUri, did, midUri, rootUri),
      postView(midUri, did, rootUri, rootUri),
      postView(rootUri, did, null, null),
      postView('at://did:plc:other/app.bsky.feed.post/o1', 'did:plc:other', null, null)
    ];
    const groups = groupConsecutiveSelfReplies(feed);
    expect(groups).toHaveLength(2);
    expect(groups[0].map(g => g.post?.uri)).toEqual([leafUri, midUri, rootUri]);
    expect(groups[1].map(g => g.post?.uri)).toEqual(['at://did:plc:other/app.bsky.feed.post/o1']);
  });

  it('does not merge when reply parent is not the adjacent older post', () => {
    const did = 'did:plc:abc';
    const a = 'at://did:plc:abc/app.bsky.feed.post/a';
    const b = 'at://did:plc:abc/app.bsky.feed.post/b';
    const c = 'at://did:plc:abc/app.bsky.feed.post/c';
    const feed: BlueskyFeedViewPost[] = [
      postView(c, did, b, a),
      postView(a, did, null, null),
      postView(b, did, a, a)
    ];
    const groups = groupConsecutiveSelfReplies(feed);
    expect(groups).toHaveLength(3);
  });
});
