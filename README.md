# Videre Platform

**Videre Platform** is the TypeScript monorepo for the Videre Project. It contains the public API, website, Cloudflare services, and shared packages used across Videre applications.

The [Tracker](https://github.com/videre-project/Tracker) desktop application is maintained separately and uses packages published from this repository.

## Projects and packages

| Path                   | Purpose                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `src/`                 | React/Vite website for [videreproject.com](https://videreproject.com)                                              |
| `packages/constants`   | `@videreproject/constants`, generated enums and shared constants from `mtgo-db`                                    |
| `packages/sql-builder` | `@videreproject/sql-builder`, typed SQL fragments, predicates, filters, and schema helpers                         |
| `packages/ui`          | `@videreproject/ui`, shared Tracker UI components, layouts, card-media providers, fixtures, and theme assets       |
| `services/videre-api`  | Public API at `api.videreproject.com` for MTGO cards, events, decks, matches, standings, prices, and metagame data |
| `services/videre-bot`  | Videre's Discord bot and interaction handler                                                                       |
| `services/videre-ml`   | Routing and API policy for format-specific Manafold inference Workers                                              |
| `docs/`                | API and reference documentation                                                                                    |

The API uses data produced by the Videre ingestion pipeline and `mtgo-db`. Generated constants and database types come from `mtgo-db` and should not be edited by hand.

## Requirements

* Node.js 22.16.0 (see `.node-version`)
* pnpm 10.28.2 through Corepack

Enable Corepack and install dependencies:

```sh
corepack enable
pnpm install
```

The website uses Playwright to generate its Open Graph image. If Chromium is not already installed, install it once:

```sh
pnpm exec playwright install chromium
```

## Website

Run the website locally:

```sh
pnpm dev
```

Build and preview it:

```sh
pnpm build
pnpm preview
```

Deploy it to the configured Cloudflare Pages project:

```sh
pnpm deploy:site
```

Deployment requires an authenticated Wrangler/Cloudflare environment. The Pages configuration is in [`wrangler.toml`](wrangler.toml).

## Shared packages

Run package checks from the repository root:

```sh
pnpm --filter @videreproject/constants typecheck
pnpm --filter @videreproject/constants test
pnpm --filter @videreproject/sql-builder test
pnpm --filter @videreproject/ui typecheck
pnpm --filter @videreproject/ui build
```

Use Storybook and the checked-in visual baselines to develop and test `@videreproject/ui`:

```sh
pnpm ui:storybook
pnpm ui:storybook:build
pnpm ui:test
pnpm ui:visual
```

For package development against Tracker, use the local Verdaccio registry:

```sh
pnpm registry:start
npm adduser --registry http://127.0.0.1:4873
pnpm constants:publish:local
pnpm sql-builder:publish:local
pnpm sql-schema:publish:local
pnpm ui:publish:local
```

See [`packages/constants/README.md`](packages/constants/README.md) and [`packages/ui/README.md`](packages/ui/README.md) for details on generation, media providers, visual testing, and local publishing.

### Package releases

Publishable packages are released together from a `v*` Git tag. The tag determines the release version.

Package manifests use `0.0.0-development` during normal development. When a version tag is pushed, CI replaces that placeholder with the tag version in its checkout, runs the repository checks, publishes all four packages, and creates the matching GitHub release.

```sh
git tag v0.3.0
git push origin v0.3.0
```

> [!NOTE]
> Regular commits that do not contain a version tag do not publish packages.

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

The root commands run the corresponding scripts in parallel:

```sh
pnpm dev:all
pnpm deploy:all
```

Sync Discord commands with:

```sh
pnpm --filter videre-bot sync
pnpm --filter videre-bot sync:dev
```

## Generated database types

[`mtgo-db`](https://github.com/videre-project/mtgo-db) is the source of truth for generated database enums, card attributes, rarities, and schema types.

Configure the API database credentials in `services/videre-api/.dev.vars`, then run:

```sh
pnpm db:generate-types
pnpm db:check-types
```

Do not edit `packages/constants/src/enums.g.ts` or `packages/sql-schema/src/schema.g.ts` by hand.

CI database checks use the read-only `public_api` role through the `public-db.videreproject.com` Cloudflare TCP bridge.

## API

The API publishes its [OpenAPI 3.0 specification](https://api.videreproject.com/openapi.json) at `api.videreproject.com/openapi.json`. Generate client SDKs and API model types from this document.

* [API overview](docs/api/index.md)
* [Cards](docs/api/cards.md)
* [Sets](docs/api/sets.md)
* [Products](docs/api/products.md)
* [Prices](docs/api/prices.md)
* [Events](docs/api/events.md)
* [Decks](docs/api/decks.md)
* [Matches](docs/api/matches.md)
* [Standings](docs/api/standings.md)
* [Metagame](docs/api/metagame.md)
* [Archetypes](docs/api/archetypes.md)
* [Matchups](docs/api/matchups.md)
* [MTGO manifest](docs/api/mtgo.md)
* [Card search syntax](docs/reference/card-search.md)
* [Data sources and freshness](docs/reference/data-sources.md)
* [Rate limits](docs/reference/rate-limits.md)
* [Responses and errors](docs/reference/responses-and-errors.md)

Run the API tests:

```sh
pnpm --filter videre-api test
VIDERE_API_BASE_URL=http://localhost:8787 pnpm --filter videre-api test
```

## Checks

Run linting and tests before publishing or deploying:

```sh
pnpm lint
pnpm test
```

Use the Verdaccio commands above to publish packages locally for testing.

## License

Licensed under the [Apache-2.0 License](LICENSE).
