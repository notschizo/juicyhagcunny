import { defineConfig } from 'vitest/config';
import { cloudflareTest } from '@cloudflare/vitest-pool-workers';

const testEnv = {
  'process.env.RELEASE_NAME': JSON.stringify('fixtweet-test'),
  'process.env.TEXT_ONLY_DOMAINS': JSON.stringify('t.fxtwitter.com,t.twittpr.com,t.fixupx.com'),
  'process.env.INSTANT_VIEW_DOMAINS': JSON.stringify('i.fxtwitter.com,i.twittpr.com,i.fixupx.com'),
  'process.env.GALLERY_DOMAINS': JSON.stringify('g.fxtwitter.com,g.twittpr.com,g.fixupx.com'),
  'process.env.FORCE_MOSAIC_DOMAINS': JSON.stringify('m.fxtwitter.com,m.twittpr.com,m.fixupx.com'),
  'process.env.OLD_EMBED_DOMAINS': JSON.stringify('o.fxtwitter.com,o.twittpr.com,o.fixupx.com'),
  'process.env.STANDARD_DOMAIN_LIST': JSON.stringify('fxtwitter.com,fixupx.com,twittpr.com'),
  'process.env.STANDARD_TIKTOK_DOMAIN_LIST': JSON.stringify('dxtiktok.com,cocktiktok.com'),
  'process.env.STANDARD_BSKY_DOMAIN_LIST': JSON.stringify('fxbsky.app'),
  'process.env.DIRECT_MEDIA_DOMAINS': JSON.stringify(
    'd.fxtwitter.com,dl.fxtwitter.com,d.fixupx.com,dl.fixupx.com'
  ),
  'process.env.MOSAIC_DOMAIN_LIST': JSON.stringify('mosaic.fxtwitter.com'),
  'process.env.POLYGLOT_DOMAIN_LIST': JSON.stringify('polyglot.fxembed.com'),
  'process.env.POLYGLOT_ACCESS_TOKEN': JSON.stringify('example-token'),
  'process.env.MOSAIC_BSKY_DOMAIN_LIST': JSON.stringify('mosaic.fxbsky.app'),
  'process.env.API_HOST_LIST': JSON.stringify('api.fxtwitter.com'),
  'process.env.BLUESKY_API_HOST_LIST': JSON.stringify('api.fxbsky.app'),
  'process.env.GENERIC_API_HOST_LIST': JSON.stringify('api.fxembed.com'),
  'process.env.GIF_TRANSCODE_DOMAIN_LIST': JSON.stringify('gif.fxtwitter.com'),
  'process.env.VIDEO_TRANSCODE_DOMAIN_LIST': JSON.stringify('video.fxtwitter.com'),
  'process.env.VIDEO_TRANSCODE_BSKY_DOMAIN_LIST': JSON.stringify('video.fxbsky.app'),
  'process.env.SENTRY_DSN': JSON.stringify(''),
  'process.env.TWITTER_ROOT': JSON.stringify('https://x.com'),
  'process.env.ENCRYPTED_CREDENTIALS': JSON.stringify(''),
  'process.env.CREDENTIALS_IV': JSON.stringify('')
} as const;

export default defineConfig({
  plugins: [
    cloudflareTest({
      // Auto-discovers wrangler.toml. Disable remote bindings so CI does not need
      // Cloudflare login (e.g. AI binding remote proxy).
      remoteBindings: false,
      miniflare: {}
    })
  ],
  define: testEnv,
  test: {
    include: ['test/*.ts'],
    globals: true,
    coverage: {
      include: ['src/**/*.{ts,js}']
    }
  }
});
