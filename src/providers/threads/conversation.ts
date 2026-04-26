import type { SocialConversation } from '../../types/apiStatus';
import { fetchThreadsPostPage, fetchThreadsSession } from './client';
import { decodeThreadsConversationCursor, encodeThreadsConversationCursor } from './cursors';
import { buildThreadsTombstone, threadsPostToStatus, xdtThreadEdgeToSubstatus } from './processor';
import { normalizeThreadsPostId, threadsShortcodeToMediaId } from './shortcode';

function extractPostPage(json: unknown): {
  edges: { node?: Record<string, unknown> }[];
  page_info: { has_next_page?: boolean; end_cursor?: string | null };
} {
  const data = (json as { data?: { data?: Record<string, unknown> } })?.data?.data;
  if (!data || typeof data !== 'object') {
    return { edges: [], page_info: {} };
  }
  const edges = Array.isArray(data.edges)
    ? (data.edges as { node?: Record<string, unknown> }[])
    : [];
  const pi = data.page_info as Record<string, unknown> | undefined;
  return {
    edges,
    page_info: {
      has_next_page: Boolean(pi?.has_next_page),
      end_cursor: typeof pi?.end_cursor === 'string' ? pi.end_cursor : null
    }
  };
}

export type ThreadsConversationResult =
  | { ok: true; data: SocialConversation }
  | { ok: false; message: string; data?: SocialConversation };

export async function constructThreadsConversation(
  rawId: string,
  options: {
    cursor: string | null;
    count: number;
    sortOrder: 'top' | 'recent';
    userAgent?: string;
  }
): Promise<ThreadsConversationResult> {
  const shortcode = normalizeThreadsPostId(rawId);
  let mediaId: string;
  try {
    mediaId = threadsShortcodeToMediaId(shortcode);
  } catch {
    return { ok: false, message: 'Invalid post id' };
  }

  const count = Math.min(100, Math.max(1, Math.floor(options.count)));
  const sortGraphql: 'TOP' | 'RECENT' = options.sortOrder === 'recent' ? 'RECENT' : 'TOP';

  const session: ThreadsSession | null = await fetchThreadsSession(options.userAgent);
  if (!session) {
    return {
      ok: true,
      data: {
        code: 500,
        status: null,
        thread: null,
        replies: null,
        author: null,
        cursor: null
      }
    };
  }

  let after: string | null = null;
  if (options.cursor) {
    const decoded = decodeThreadsConversationCursor(options.cursor);
    if (!decoded || decoded.shortcode !== shortcode) {
      return {
        ok: false,
        message: 'Invalid cursor',
        data: {
          code: 400,
          status: null,
          thread: null,
          replies: null,
          author: null,
          cursor: null
        }
      };
    }
    after = decoded.after;
  }

  const res = await fetchThreadsPostPage({
    mediaId,
    sortOrder: sortGraphql,
    after,
    first: null,
    session,
    userAgent: options.userAgent
  });

  if (!res.ok || res.json == null) {
    return {
      ok: true,
      data: {
        code: res.status === 404 ? 404 : 500,
        status: null,
        thread: null,
        replies: null,
        author: null,
        cursor: null
      }
    };
  }

  const { edges, page_info } = extractPostPage(res.json);
  if (!edges.length) {
    return {
      ok: true,
      data: {
        code: 404,
        status: null,
        thread: null,
        replies: null,
        author: null,
        cursor: null
      }
    };
  }

  const focalNode = edges[0]?.node;
  const items = (focalNode?.thread_items as unknown[]) ?? [];
  const firstPost = (items[0] as { post?: Record<string, unknown> })?.post;
  const owner = firstPost?.user as Record<string, unknown> | undefined;
  const ownerFb = {
    id: String(owner?.pk ?? owner?.id ?? ''),
    username: String(owner?.username ?? ''),
    fullName: typeof owner?.full_name === 'string' ? owner.full_name : undefined,
    pic: typeof owner?.profile_pic_url === 'string' ? owner.profile_pic_url : null
  };

  const chainStatuses = items
    .map(it => {
      const p = (it as { post?: Record<string, unknown> }).post;
      return p ? threadsPostToStatus(p, ownerFb) : null;
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  if (!chainStatuses.length) {
    return {
      ok: true,
      data: {
        code: 404,
        status: buildThreadsTombstone('unavailable', { id: shortcode }),
        thread: null,
        replies: null,
        author: null,
        cursor: null
      }
    };
  }

  const status = chainStatuses[chainStatuses.length - 1]!;
  const threadPrefix =
    chainStatuses.length > 1 ? chainStatuses.slice(0, -1) : ([] as typeof chainStatuses);

  const replyEdges = edges.slice(1);
  const replies = replyEdges
    .map(e => xdtThreadEdgeToSubstatus(e as Record<string, unknown>, shortcode, ownerFb.username))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .slice(0, count);

  const hasNext = Boolean(page_info.has_next_page) && Boolean(page_info.end_cursor);
  const bottom =
    hasNext && page_info.end_cursor
      ? encodeThreadsConversationCursor({
          v: 1,
          postId: mediaId,
          shortcode,
          sort: sortGraphql,
          after: page_info.end_cursor,
          count
        })
      : null;

  return {
    ok: true,
    data: {
      code: 200,
      status,
      thread: threadPrefix.length ? threadPrefix : [status],
      replies,
      author: status.author,
      cursor: { bottom }
    }
  };
}
