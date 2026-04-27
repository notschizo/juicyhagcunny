import { fetchInstagramHtml, fetchInstagramLoggedOutSession } from './client.js';
import { extractShortcodeWebInfo } from './extractors.js';

export type InstagramWebInfoPage =
  | {
      ok: true;
      status: number;
      html: string;
      item: Record<string, unknown>;
      pathUsed: string;
    }
  | {
      ok: false;
      status: number;
      html: string;
      item: null;
      pathUsed: null;
    };

/**
 * Fetches a logged-out post page and returns the first response whose HTML embeds
 * `xdt_api__v1__media__shortcode__web_info` with a non-empty `items[0]`.
 *
 * Tries `/p/{shortcode}/` then `/reel/{shortcode}/` (same permalink family on igweb).
 * Loads a session cookie first: without `csrftoken` / `mid` / `ig_did`, Instagram
 * often returns 200 HTML that omits embedded `xdt_api__v1__media__shortcode__web_info`.
 */
export async function fetchInstagramPageWithWebInfo(
  shortcode: string,
  userAgent: string | undefined
): Promise<InstagramWebInfoPage> {
  const cookies = await fetchInstagramLoggedOutSession(userAgent);
  const htmlOpts = cookies ? { cookies } : undefined;

  const paths = [
    `/p/${encodeURIComponent(shortcode)}/`,
    `/reel/${encodeURIComponent(shortcode)}/`
  ] as const;
  let last: { ok: boolean; status: number; html: string } = {
    ok: false,
    status: 500,
    html: ''
  };
  let bestAttempt: { ok: boolean; status: number; html: string } | null = null;
  const attempts: { path: string; httpOk: boolean; status: number; hasWebInfoItem: boolean }[] = [];
  for (const path of paths) {
    const r = await fetchInstagramHtml(path, userAgent, htmlOpts);
    last = r;
    const item = r.ok ? extractShortcodeWebInfo(r.html) : null;
    attempts.push({
      path,
      httpOk: r.ok,
      status: r.status,
      hasWebInfoItem: Boolean(item)
    });
    if (r.ok && item) {
      return { ok: true, status: r.status, html: r.html, item, pathUsed: path };
    }
    const hasBody = Boolean(r.html && r.html.length > 0);
    if (hasBody) {
      if (!bestAttempt) {
        bestAttempt = r;
      } else {
        const b = bestAttempt;
        if (r.ok && !b.ok) {
          bestAttempt = r;
        } else if (r.ok && b.ok) {
          bestAttempt = r;
        } else if (!r.ok && !b.ok && r.status > b.status) {
          bestAttempt = r;
        }
      }
    }
  }
  const out = bestAttempt ?? last;
  console.error('[instagram] no shortcode web_info after /p and /reel', { shortcode, attempts });
  return { ok: false, status: out.status, html: out.html, item: null, pathUsed: null };
}
