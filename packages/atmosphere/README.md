# `@fxembed/atmosphere`

Shared **envelope types**, **pure helpers**, **transport** definitions, **Bluesky** implementation (`src/providers/bluesky/`), **relay** helpers, and stubs for authenticated access.

Other providers (Twitter, Mastodon, TikTok, …) still live under the FxEmbed worker (`src/providers/`) and can be migrated using the same pattern as Bluesky: move logic here, inject config/`fetch`/`t`/credentials via options, thin-re-export from `src/providers/<name>/`.

## Transports

See the FxEmbed docs: **Deployment → Atmosphere transports** (`/deployment/atmosphere-transports/`).

## Scripts

- `npm run openapi:atmosphere` — from the **FxEmbed repo root**; generates OpenAPI path stubs into `src/relay/generated/`.
