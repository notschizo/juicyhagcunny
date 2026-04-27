# `@fxembed/atmosphere`

Shared **envelope types**, **pure helpers**, **transport** definitions, **relay** helpers, and stubs for authenticated access.

**Providers in this package** (worker keeps Hono/OpenAPI wiring; `src/providers/<name>/` re-exports): Bluesky, Mastodon, Twitter, TikTok, Instagram, Threads.

Mastodon uses `setMastodonProviderEnv` from `./providers/mastodon-runtime` (user agent, mosaic / polyglot lists); the worker sets it at startup.

Twitter uses `setTwitterProviderEnv` from `./providers/twitter-runtime` (API roots, headers, guest token, domain lists). Account proxy credentials stay in the worker: `setTwitterProxyRuntime` registers `initCredentials`, `getRandomTwitterAccount`, etc. (see `src/providers/twitter/proxy/credentials.ts` in FxEmbed).

## Transports

See the FxEmbed docs: **Deployment → Atmosphere transports** (`/deployment/atmosphere-transports/`).

## Scripts

- `npm run openapi:atmosphere` — from the **FxEmbed repo root**; generates OpenAPI path stubs into `src/relay/generated/`.
