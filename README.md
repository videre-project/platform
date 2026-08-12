# Videre Platform

This repository is the shared TypeScript workspace for the Videre Project platform. It contains the public data API, supporting Cloudflare Workers, reusable packages, and the Videre Project website.

The [Tracker](https://github.com/videre-project/Tracker) desktop application is maintained separately and consumes the published Videre packages from this workspace.

## Repository layout

| Path | Purpose |
|---|---|
| `src/` | React/Vite landing site for [videreproject.com](https://videreproject.com). |
| `packages/constants` | `@videreproject/constants`, generated domain enums and shared constants whose source of truth is `mtgo-db`. |
| `packages/sql-builder` | `@videreproject/sql-builder`, typed SQL fragments, predicates, filters, and schema helpers. |
| `packages/ui` | `@videreproject/ui`, host-neutral Tracker UI primitives, layouts, card-media providers, fixtures, and shared theme assets. |
| `services/videre-api` | `api.videreproject.com`, the public Cloudflare Worker API for MTGO catalog, event, deck, match, standings, price, and metagame data. |
| `services/videre-bot` | Videre's Discord bot and interaction handler. |
| `services/videre-ml` | Public routing and API policy for format-specific Manafold inference Workers. |
| `docs/` | API and reference documentation. |

The API reads data prepared by the Videre ingestion pipeline and `mtgo-db`. Generated constants and database contracts should be regenerated from that source rather than edited by hand.

## Requirements

- Node.js 22.16.0 (see `.node-version`)
- pnpm 10.28.2, provided through Corepack

Enable Corepack and install the workspace dependencies:

```sh
corepack enable
pnpm install
```

The website's build-time Open Graph image uses Playwright. Install Chromium once if it is not already available in your environment:

```sh
pnpm exec playwright install chromium
```

## Website

Run the landing site locally:

```sh
pnpm dev
```

Build the site and generate its Open Graph image:

```sh
pnpm build
pnpm preview
```

Deploy the site to the configured Cloudflare Pages project:

```sh
pnpm deploy:site
```

The deployment requires an authenticated Wrangler/Cloudflare environment. The Pages configuration is in [`wrangler.toml`](wrangler.toml).

## Shared packages

Run package checks from the repository root:

```sh
pnpm --filter @videreproject/constants typecheck
pnpm --filter @videreproject/constants test
pnpm --filter @videreproject/sql-builder test
pnpm --filter @videreproject/ui typecheck
pnpm --filter @videreproject/ui build
```

Develop and validate `@videreproject/ui` with Storybook and the checked-in visual baselines:

```sh
pnpm ui:storybook
pnpm ui:storybook:build
pnpm ui:test
pnpm ui:visual
```

For package development against Tracker, use the repository-local Verdaccio registry:

```sh
pnpm registry:start
npm adduser --registry http://127.0.0.1:4873
pnpm constants:publish:local
pnpm sql-builder:publish:local
pnpm sql-schema:publish:local
pnpm ui:publish:local
```

See [`packages/constants/README.md`](packages/constants/README.md) and [`packages/ui/README.md`](packages/ui/README.md) for generation, media-provider, visual-test, and local publishing details.

### Package releases

The publishable packages are released together from an explicit `v*` Git tag. The tag is the single source of truth for the release version. The package manifests use the shared `0.0.0-development` placeholder during ordinary development; CI replaces it with the tag version in its temporary checkout, runs the workspace validation checks, publishes all four packages, and creates the corresponding GitHub release.

```sh
git tag v0.3.0
git push origin v0.3.0
```

Ordinary commits do not publish packages. The package workflow runs on relevant pull requests and the release workflow runs only for version tags. The workflows expect an `NPM_TOKEN` repository secret and read-only database secrets named `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, and optionally `PGSSL`. Local development continues to use the Verdaccio commands above, and the temporary local registry configuration is overridden by CI when publishing to npm.

## Services

Run a service locally:

```sh
pnpm --filter videre-api dev
pnpm --filter videre-bot dev
pnpm --filter videre-ml dev
```

Deploy a service through Wrangler:

```sh
pnpm --filter videre-api deploy
pnpm --filter videre-bot deploy
pnpm --filter videre-ml deploy
```

The root convenience commands run matching workspace scripts in parallel:

```sh
pnpm dev:all
pnpm deploy:all
```

The Discord bot also provides command synchronization commands:

```sh
pnpm --filter videre-bot sync
pnpm --filter videre-bot sync:dev
```

## Database-generated contracts

`mtgo-db` is the source of truth for generated database enums, card attributes, rarities, and schema contracts. With the API's database credentials configured in `services/videre-api/.dev.vars`:

```sh
pnpm db:generate-types
pnpm db:check-types
```

Do not edit `packages/constants/src/enums.g.ts` or `packages/sql-schema/src/schema.g.ts` by hand.

## API documentation

The canonical machine-readable OpenAPI 3.0 document is served at [`api.videreproject.com/openapi.json`](https://api.videreproject.com/openapi.json). Client SDKs and API model types should be generated from that document.

- [API overview](docs/api/index.md)
- [Cards](docs/api/cards.md)
- [Sets](docs/api/sets.md)
- [Products](docs/api/products.md)
- [Prices](docs/api/prices.md)
- [Events](docs/api/events.md)
- [Decks](docs/api/decks.md)
- [Matches](docs/api/matches.md)
- [Standings](docs/api/standings.md)
- [Metagame](docs/api/metagame.md)
- [Archetypes](docs/api/archetypes.md)
- [Matchups](docs/api/matchups.md)
- [MTGO manifest](docs/api/mtgo.md)
- [Card search syntax](docs/reference/card-search.md)
- [Data sources and freshness](docs/reference/data-sources.md)
- [Rate limits](docs/reference/rate-limits.md)
- [Responses and errors](docs/reference/responses-and-errors.md)

Run the API tests:

```sh
pnpm --filter videre-api test
VIDERE_API_BASE_URL=http://localhost:8787 pnpm --filter videre-api test
```

## Repository checks

Run the root lint and workspace tests before publishing or deploying:

```sh
pnpm lint
pnpm test
```

## License

[Apache-2.0 License](LICENSE).
