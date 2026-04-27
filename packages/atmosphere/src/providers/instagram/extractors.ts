/**
 * Extract JSON payloads from Instagram Comet `data-sjs` script tags and locate Relay blobs by key.
 */

const TARGET_KEYS = new Set([
  'xdt_api__v1__media__shortcode__web_info',
  'xdt_api__v1__media__media_id__comments__connection',
  'xdt_api__v1__profile_timeline'
]);

export function extractDataSjsScriptBodies(html: string): string[] {
  const out: string[] = [];
  /**
   * Instagram/Meta JSON in these tags escape `</script>` as `<\/script>`, so a real closing tag
   * will not appear inside the payload. Do not relax this to allow raw `</script>` without a proper
   * HTML/JSON parser or the match can end too early.
   */
  /** `type` / `data-sjs` attribute order varies; both must be present on the same tag. */
  const re =
    /<script(?=[^>]*\btype=["']application\/json["'])(?=[^>]*\bdata-sjs)[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]!.trim());
  }
  return out;
}

const COLLECT_MAX_DEPTH = 64;

export function collectDeepByKey(
  obj: unknown,
  key: string,
  out: unknown[],
  currentDepth = 0,
  seen: WeakSet<object> = new WeakSet()
): void {
  if (currentDepth >= COLLECT_MAX_DEPTH) return;
  if (obj === null || obj === undefined) return;
  if (typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      collectDeepByKey(item, key, out, currentDepth + 1, seen);
    }
    return;
  }
  if (seen.has(obj)) return;
  seen.add(obj);
  const rec = obj as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(rec, key)) {
    out.push(rec[key]);
  }
  for (const v of Object.values(rec)) {
    collectDeepByKey(v, key, out, currentDepth + 1, seen);
  }
}

/**
 * LSD (loaded state / doc token) for GraphQL `lsd` / `X-FB-LSD` from embedded Relay JSON, if present.
 */
export function extractLsdFromHtml(html: string): string | null {
  for (const raw of extractDataSjsScriptBodies(html)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    for (const k of ['LSD', 'lsd'] as const) {
      const acc: unknown[] = [];
      collectDeepByKey(parsed, k, acc);
      for (const v of acc) {
        if (typeof v === 'string' && v.length > 0) return v;
        if (v && typeof v === 'object' && 'token' in (v as object)) {
          const t = (v as { token?: unknown }).token;
          if (typeof t === 'string' && t.length > 0) return t;
        }
      }
    }
  }
  return null;
}

export function findRelayBlobs(html: string): unknown[] {
  const blobs: unknown[] = [];
  for (const raw of extractDataSjsScriptBodies(html)) {
    try {
      blobs.push(JSON.parse(raw) as unknown);
    } catch {
      /* skip malformed */
    }
  }
  return blobs;
}

export function extractFromHtmlByKeys(html: string, keys: string[]): Map<string, unknown[]> {
  const map = new Map<string, unknown[]>();
  for (const k of keys) map.set(k, []);
  const blobs = findRelayBlobs(html);
  for (const root of blobs) {
    for (const k of keys) {
      const acc = map.get(k)!;
      collectDeepByKey(root, k, acc);
    }
  }
  return map;
}

export function extractShortcodeWebInfo(html: string): Record<string, unknown> | null {
  const map = extractFromHtmlByKeys(html, ['xdt_api__v1__media__shortcode__web_info']);
  const vals = map.get('xdt_api__v1__media__shortcode__web_info') ?? [];
  for (const v of vals) {
    if (v && typeof v === 'object') {
      const items = (v as Record<string, unknown>).items;
      if (Array.isArray(items) && items.length > 0) {
        return (items[0] as Record<string, unknown>) ?? null;
      }
    }
  }
  return null;
}

export function extractCommentsConnection(html: string): {
  edges?: unknown[];
  page_info?: Record<string, unknown>;
} | null {
  const map = extractFromHtmlByKeys(html, ['xdt_api__v1__media__media_id__comments__connection']);
  const vals = map.get('xdt_api__v1__media__media_id__comments__connection') ?? [];
  for (const v of vals) {
    if (v && typeof v === 'object') {
      return v as { edges?: unknown[]; page_info?: Record<string, unknown> };
    }
  }
  return null;
}

/** Optional related grid on post pages (mixed items). */
export function extractProfileTimelineSnippet(html: string): unknown[] | null {
  const map = extractFromHtmlByKeys(html, ['xdt_api__v1__profile_timeline']);
  const vals = map.get('xdt_api__v1__profile_timeline') ?? [];
  for (const v of vals) {
    if (v && typeof v === 'object') {
      const items = (v as Record<string, unknown>).items;
      if (Array.isArray(items)) return items;
    }
  }
  return null;
}

export function hasUsefulRelayData(html: string): boolean {
  const map = extractFromHtmlByKeys(html, [...TARGET_KEYS]);
  for (const [, arr] of map) {
    if (arr.length > 0) return true;
  }
  return false;
}
