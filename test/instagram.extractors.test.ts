import { describe, expect, it } from 'vitest';
import {
  extractCommentsConnection,
  extractShortcodeWebInfo,
  hasUsefulRelayData
} from '../src/providers/instagram/extractors';

const MINIMAL_POST_HTML = `<!DOCTYPE html><html><body>
<script type="application/json" data-sjs>{"xdt_api__v1__media__shortcode__web_info":{"items":[{"code":"DXeh-kYiIge","pk":"3881689364048676894","taken_at":1776953871,"caption":{"text":"Hello #world"},"user":{"pk":"173560420","username":"cristiano","full_name":"CR7","profile_pic_url":"https://cdn.example/p.jpg"},"image_versions2":{"candidates":[{"url":"https://cdn.example/i.jpg","width":640,"height":1136}]}}]},"xdt_api__v1__media__media_id__comments__connection":{"edges":[{"node":{"pk":"17915753442361302","text":"Nice","created_at":1776954000,"user":{"pk":"1","username":"fan","profile_pic_url":null}}}],"page_info":{"has_next_page":false,"end_cursor":null}}}</script>
</body></html>`;

describe('instagram extractors', () => {
  it('detects relay data in HTML', () => {
    expect(hasUsefulRelayData(MINIMAL_POST_HTML)).toBe(true);
  });

  it('extracts shortcode web info item', () => {
    const item = extractShortcodeWebInfo(MINIMAL_POST_HTML);
    expect(item).toBeTruthy();
    expect(item?.code).toBe('DXeh-kYiIge');
    expect(String(item?.pk)).toBe('3881689364048676894');
  });

  it('extracts comments connection', () => {
    const conn = extractCommentsConnection(MINIMAL_POST_HTML);
    expect(conn?.edges?.length).toBe(1);
    const node = (conn!.edges![0] as { node: Record<string, unknown> }).node;
    expect(node.text).toBe('Nice');
  });
});
