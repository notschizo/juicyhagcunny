import type { APISearchResultsThreads, UserAPIResponse } from '../../realms/api/schemas';
import {
  fetchThreadsProfilePage,
  fetchThreadsProfileTimeline,
  fetchThreadsSession,
  fetchThreadsUserByUsername
} from './client';
import { decodeThreadsProfileTimelineCursor, encodeThreadsProfileTimelineCursor } from './cursors';
import { threadsPostToStatus, userFromThreadsProfilePayload } from './processor';

function userIdFromHovercard(json: unknown): string | null {
  const u = (json as { data?: { user?: Record<string, unknown> } })?.data?.user;
  if (!u || typeof u !== 'object') return null;
  return String(u.pk ?? u.id ?? '') || null;
}

function profileUserFromPage(json: unknown): Record<string, unknown> | null {
  const u = (json as { data?: { user?: Record<string, unknown> } })?.data?.user;
  if (!u || typeof u !== 'object') return null;
  return u;
}

function parseProfileTimeline(json: unknown): {
  edges: unknown[];
  page_info: { has_next_page: boolean; end_cursor: string | null };
} {
  const md = (json as { data?: { mediaData?: Record<string, unknown> } })?.data?.mediaData;
  if (!md || typeof md !== 'object') {
    return { edges: [], page_info: { has_next_page: false, end_cursor: null } };
  }
  const edges = Array.isArray(md.edges) ? md.edges : [];
  const pi = md.page_info as Record<string, unknown> | undefined;
  return {
    edges,
    page_info: {
      has_next_page: Boolean(pi?.has_next_page),
      end_cursor: typeof pi?.end_cursor === 'string' ? pi.end_cursor : null
    }
  };
}

function postFromTimelineEdge(edge: unknown): Record<string, unknown> | null {
  const n = (edge as { node?: Record<string, unknown> })?.node;
  const items = n?.thread_items as unknown[] | undefined;
  if (!Array.isArray(items) || items.length === 0) return null;
  const last = items[items.length - 1] as { post?: Record<string, unknown> };
  return last.post ?? null;
}

export async function constructThreadsProfile(
  username: string,
  userAgent: string | undefined
): Promise<UserAPIResponse> {
  const session = await fetchThreadsSession(userAgent);
  if (!session) {
    return { code: 500, message: 'Threads session failed' };
  }

  const hover = await fetchThreadsUserByUsername({
    username: username.replace(/^@/, ''),
    session,
    userAgent
  });
  if (!hover.ok || hover.json == null) {
    if (hover.status === 404) return { code: 404, message: 'User not found' };
    return { code: 500, message: 'Threads profile lookup failed' };
  }

  const userId = userIdFromHovercard(hover.json);
  if (!userId) {
    return { code: 404, message: 'User not found' };
  }

  const page = await fetchThreadsProfilePage({ userId, session, userAgent });
  if (!page.ok || page.json == null) {
    if (page.status === 404) return { code: 404, message: 'User not found' };
    return { code: 500, message: 'Threads profile page failed' };
  }

  const rec = profileUserFromPage(page.json);
  if (!rec) {
    return { code: 404, message: 'User not found' };
  }

  const user = userFromThreadsProfilePayload(rec);
  if (!user) {
    return { code: 404, message: 'User not found' };
  }
  return { code: 200, message: 'OK', user };
}

export async function constructThreadsProfileStatuses(
  username: string,
  options: { count: number; cursor: string | null; userAgent?: string }
): Promise<APISearchResultsThreads> {
  const count = Math.min(100, Math.max(1, Math.floor(options.count)));
  const session = await fetchThreadsSession(options.userAgent);
  if (!session) {
    return { code: 500, results: [], cursor: { top: null, bottom: null } };
  }

  let userId: string;
  let after: string | null = null;
  let uname = username.replace(/^@/, '');

  if (options.cursor) {
    const cur = decodeThreadsProfileTimelineCursor(options.cursor);
    if (!cur) {
      return { code: 400, results: [], cursor: { top: null, bottom: null } };
    }
    userId = cur.userId;
    after = cur.after;
    uname = cur.username;
  } else {
    const hover = await fetchThreadsUserByUsername({
      username: uname,
      session,
      userAgent: options.userAgent
    });
    if (!hover.ok || hover.json == null) {
      if (hover.status === 404)
        return { code: 404, results: [], cursor: { top: null, bottom: null } };
      return { code: 500, results: [], cursor: { top: null, bottom: null } };
    }
    const id = userIdFromHovercard(hover.json);
    if (!id) {
      return { code: 404, results: [], cursor: { top: null, bottom: null } };
    }
    userId = id;
  }

  const ownerFb = { id: userId, username: uname, pic: null as string | null };
  const tl = await fetchThreadsProfileTimeline({
    userId,
    first: Math.max(count, 12),
    after,
    session,
    userAgent: options.userAgent
  });
  if (!tl.ok || tl.json == null) {
    if (tl.status === 404) return { code: 404, results: [], cursor: { top: null, bottom: null } };
    return { code: 500, results: [], cursor: { top: null, bottom: null } };
  }

  const { edges, page_info } = parseProfileTimeline(tl.json);
  const results = edges
    .map(e => {
      const post = postFromTimelineEdge(e);
      return post ? threadsPostToStatus(post, ownerFb) : null;
    })
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .slice(0, count);

  const bottom =
    page_info.has_next_page && page_info.end_cursor
      ? encodeThreadsProfileTimelineCursor({
          v: 1,
          userId,
          username: uname,
          after: page_info.end_cursor,
          count
        })
      : null;

  return { code: 200, results, cursor: { top: null, bottom } };
}
