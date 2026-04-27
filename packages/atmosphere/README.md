# `@fxembed/atmosphere`

Shared **envelope types**, **pure helpers**, **transport** definitions, **relay** helpers, and stubs for authenticated access.

**Providers in this package** (worker keeps Hono/OpenAPI wiring; `src/providers/<name>/` re-exports): Bluesky, Mastodon, TikTok, Instagram, Threads. Twitter and others may follow the same pattern.

Mastodon uses `setMastodonProviderEnv` from `./providers/mastodon-runtime` (user agent, mosaic / polyglot lists); the worker sets it at startup.

## Transports

See the FxEmbed docs: **Deployment → Atmosphere transports** (`/deployment/atmosphere-transports/`).

## Scripts

- `npm run openapi:atmosphere` — from the **FxEmbed repo root**; generates OpenAPI path stubs into `src/relay/generated/`.
