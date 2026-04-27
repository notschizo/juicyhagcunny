import { withTimeout } from '../../helpers/with-timeout.js';
import {
  INSTAGRAM_COMMENT_PAGINATION_DOC_ID,
  INSTAGRAM_ORIGIN,
  INSTAGRAM_TIMELINE_QUERY_HASH,
  INSTAGRAM_WEB_APP_ID
} from './constants.js';

const DEFAULT_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function readSetCookieNames(headers: Headers): Map<string, string> {
  const map = new Map<string, string>();
  const h = headers as Headers & { getSetCookie?: () => string[] };
  const parts =
    typeof h.getSetCookie === 'function'
      ? h.getSetCookie()
      : (() => {
          const single = headers.get('set-cookie');
          return single ? [single] : [];
        })();
  for (const line of parts) {
    const first = line.split(';')[0]?.trim();
    if (!first?.includes('=')) continue;
    const eq = first.indexOf('=');
    map.set(first.slice(0, eq), first.slice(eq + 1));
  }
  return map;
}

export async function fetchInstagramCsrfToken(
  userAgent: string | undefined
): Promise<string | null> {
  try {
    const res = await withTimeout(signal =>
      fetch(`${INSTAGRAM_ORIGIN}/`, {
        method: 'GET',
        redirect: 'follow',
        signal,
        headers: {
          'User-Agent': userAgent ?? DEFAULT_UA,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-IG-App-ID': INSTAGRAM_WEB_APP_ID
        }
      })
    );
    return readSetCookieNames(res.headers).get('csrftoken') ?? null;
  } catch (err) {
    console.error('[instagram] fetchInstagramCsrfToken failed', {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined
    });
    return null;
  }
}

/**
 * One logged-out navigation to the homepage to collect cookies (`csrftoken`, `mid`, `ig_did`, …).
 * Post permalink HTML often does not embed `xdt_api__v1__media__shortcode__web_info` without them.
 */
export async function fetchInstagramLoggedOutSession(
  userAgent: string | undefined
): Promise<string> {
  try {
    const res = await withTimeout(signal =>
      fetch(`${INSTAGRAM_ORIGIN}/`, {
        method: 'GET',
        redirect: 'follow',
        signal,
        headers: {
          'User-Agent': userAgent ?? DEFAULT_UA,
          'Accept':
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-IG-App-ID': INSTAGRAM_WEB_APP_ID,
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      })
    );
    const m = readSetCookieNames(res.headers);
    const out: string[] = [];
    for (const [k, v] of m) {
      out.push(`${k}=${v}`);
    }
    return out.join('; ');
  } catch (err) {
    console.error('[instagram] fetchInstagramLoggedOutSession failed', {
      message: err instanceof Error ? err.message : String(err)
    });
    return '';
  }
}

export type FetchInstagramHtmlOptions = {
  /** `Cookie` header from {@link fetchInstagramLoggedOutSession} (semicolon-separated). */
  cookies?: string;
};

export async function fetchInstagramHtml(
  path: string,
  userAgent: string | undefined,
  options?: FetchInstagramHtmlOptions
): Promise<{ ok: boolean; status: number; html: string }> {
  try {
    const cookieHeader = options?.cookies;
    const headers: Record<string, string> = {
      'User-Agent': userAgent ?? DEFAULT_UA,
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': `${INSTAGRAM_ORIGIN}/`,
      'X-IG-App-ID': INSTAGRAM_WEB_APP_ID
    };
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
      headers['Sec-Fetch-Dest'] = 'document';
      headers['Sec-Fetch-Mode'] = 'navigate';
      headers['Sec-Fetch-Site'] = 'same-origin';
      headers['Sec-Fetch-User'] = '?1';
      headers['Upgrade-Insecure-Requests'] = '1';
    }
    const res = await withTimeout(signal =>
      fetch(`${INSTAGRAM_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`, {
        method: 'GET',
        redirect: 'follow',
        signal,
        headers
      })
    );
    const html = await res.text();
    return { ok: res.ok, status: res.status, html };
  } catch (err) {
    console.error('[instagram] fetchInstagramHtml failed', {
      path,
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined
    });
    return { ok: false, status: 500, html: '' };
  }
}

export async function fetchWebProfileInfo(
  username: string,
  userAgent: string | undefined
): Promise<{ ok: boolean; status: number; json: unknown | null }> {
  try {
    const url = new URL(`${INSTAGRAM_ORIGIN}/api/v1/users/web_profile_info/`);
    url.searchParams.set('username', username);
    const res = await withTimeout(signal =>
      fetch(url, {
        method: 'GET',
        signal,
        headers: {
          'User-Agent': userAgent ?? DEFAULT_UA,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': `${INSTAGRAM_ORIGIN}/${encodeURIComponent(username)}/`,
          'X-IG-App-ID': INSTAGRAM_WEB_APP_ID
        }
      })
    );
    if (!res.ok) {
      return { ok: false, status: res.status, json: null };
    }
    return { ok: true, status: res.status, json: (await res.json()) as unknown };
  } catch (err) {
    console.error('[instagram] fetchWebProfileInfo failed', {
      username,
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined
    });
    return { ok: false, status: 500, json: null };
  }
}

export async function fetchTimelineGraphqlPage(params: {
  userId: string;
  first: number;
  after: string | null;
  userAgent: string | undefined;
  refererUsername: string;
  csrfToken: string | null;
}): Promise<{ ok: boolean; status: number; json: unknown | null }> {
  const variables = {
    id: params.userId,
    first: params.first,
    ...(params.after ? { after: params.after } : {})
  };
  const url = new URL(`${INSTAGRAM_ORIGIN}/graphql/query/`);
  url.searchParams.set('query_hash', INSTAGRAM_TIMELINE_QUERY_HASH);
  url.searchParams.set('variables', JSON.stringify(variables));
  try {
    const headers: Record<string, string> = {
      'User-Agent': params.userAgent ?? DEFAULT_UA,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': `${INSTAGRAM_ORIGIN}/${encodeURIComponent(params.refererUsername)}/`,
      'Origin': INSTAGRAM_ORIGIN,
      'X-IG-App-ID': INSTAGRAM_WEB_APP_ID
    };
    if (params.csrfToken) {
      headers['X-CSRFToken'] = params.csrfToken;
    }
    const res = await withTimeout(signal =>
      fetch(url.toString(), {
        method: 'GET',
        signal,
        headers
      })
    );
    if (!res.ok) {
      return { ok: false, status: res.status, json: null };
    }
    return { ok: true, status: res.status, json: (await res.json()) as unknown };
  } catch (err) {
    console.error('[instagram] fetchTimelineGraphqlPage failed', {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined
    });
    return { ok: false, status: 500, json: null };
  }
}

export async function fetchCommentPageGraphql(params: {
  mediaId: string;
  after: string | null;
  first: number;
  sortOrder: 'popular' | 'recent';
  refererPath: string;
  userAgent: string | undefined;
  csrfToken: string | null;
  lsd: string;
}): Promise<{ ok: boolean; status: number; json: unknown | null }> {
  const variables: Record<string, unknown> = {
    media_id: params.mediaId,
    first: params.first,
    last: null,
    before: null,
    sort_order: params.sortOrder,
    __relay_internal__pv__PolarisIsLoggedInrelayprovider: false
  };
  if (params.after) {
    variables.after = params.after;
  }
  const body = new URLSearchParams({
    lsd: params.lsd,
    fb_api_req_friendly_name: 'PolarisPostCommentsPaginationQuery',
    variables: JSON.stringify(variables),
    doc_id: INSTAGRAM_COMMENT_PAGINATION_DOC_ID
  });
  try {
    const headers: Record<string, string> = {
      'User-Agent': params.userAgent ?? DEFAULT_UA,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': INSTAGRAM_ORIGIN,
      'Referer': `${INSTAGRAM_ORIGIN}${params.refererPath.startsWith('/') ? params.refererPath : `/${params.refererPath}`}`,
      'X-IG-App-ID': INSTAGRAM_WEB_APP_ID,
      'X-FB-LSD': params.lsd
    };
    if (params.csrfToken) {
      headers['X-CSRFToken'] = params.csrfToken;
    }
    const res = await withTimeout(signal =>
      fetch(`${INSTAGRAM_ORIGIN}/api/graphql`, {
        method: 'POST',
        signal,
        headers,
        body: body.toString()
      })
    );
    if (!res.ok) {
      return { ok: false, status: res.status, json: null };
    }
    return { ok: true, status: res.status, json: (await res.json()) as unknown };
  } catch (err) {
    console.error('[instagram] fetchCommentPageGraphql failed', {
      message: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : undefined
    });
    return { ok: false, status: 500, json: null };
  }
}
