# @videreproject/ui

`@videreproject/ui` is the canonical presentation contract for Videre. It contains reusable primitives and components, composed Collection/Trade History/Match/Replay layouts, the shared theme, and deterministic fixtures. Fetching, persistence, routing, streaming, and mutations remain host responsibilities.

Shared card components use Videre's static CDN by default and never assume a host API. Applications
that can render local card media may inject those capabilities once at their root:

```tsx
<CardMediaProvider
  getCardImageFallbackUrl={catalogId => api(`/cards/${catalogId}/image`)}
  getCardTextureImageUrl={textureId => api(`/cards/texture/${textureId}/image`)}
  getNamedCardImageUrl={name => api(`/cards/${encodeURIComponent(name)}/image`)}
  getCardArtUrl={catalogId => api(`/cards/${catalogId}/art`)}
  resolveCardFace={resolveCardFace}
>
  <App />
</CardMediaProvider>
```

The provider caches and deduplicates face lookups. Without it, `CardImage`, `CatalogCardImage`, card
tooltips, and replay avatars do not make application-API requests.

`VanguardAvatar` crops the shared art frame from an MTGO `VAN` catalog product. It resolves
`/products/{catalogId}-300px.png` on the Videre CDN by default and accepts an explicit `imageUrl`
when a host needs to supply its own product-media endpoint.

## Exports

- `@videreproject/ui` — runtime components, layouts, state helpers, and public types
- `@videreproject/ui/fixtures` — deterministic demo/test data, separate from the runtime entry point
- `@videreproject/ui/theme.css` — canonical Videre UI color, radius, animation, and font variables
- `@videreproject/ui/tailwind-preset` — Tailwind bindings for the same theme contract

## Commands

Install the pinned Chromium build once per machine or CI image:

```sh
pnpm --filter @videreproject/ui exec playwright install chromium
```

Run these from the repository root:

```sh
pnpm ui:storybook
pnpm ui:storybook:build
pnpm ui:test
pnpm ui:visual
```

`ui:visual` compares approved Storybook surfaces with the checked-in baselines in Chromium.

Baseline replacement is always explicit:

```sh
# Approve an intentional specification change from Storybook.
pnpm ui:visual:update
```

The harness fixes the viewport, dark theme, locale, timezone, reduced-motion preference, fonts, card images, API data, and client state. External image and API requests are intercepted; stories use a checked-in visual asset.

## Local package publishing

Run the repository-local Verdaccio registry and create a local publishing identity once:

```sh
pnpm registry:start
npm adduser --registry http://127.0.0.1:4873
```

After changing the package, publish it and install the exact published version in the consuming application:

```sh
pnpm ui:publish:local
cd ../your-application/src/client
pnpm add @videreproject/ui@<version>
```

The consuming application's `.npmrc` should scope `@videreproject` to the local registry. `pnpm ui:pack` is available for inspecting the publishable tarball without publishing it.
Docker-based development services can reach the same registry through
`host.docker.internal`; set `VIDERE_NPM_REGISTRY` when a different host or port
is required. Keep the registry running when initializing a fresh container
dependency volume.

## Included surfaces

The package includes reusable layouts for Collection, Trade History, Trades (marketplace/partners), Match Details, Replay, History, Dashboard, Decks gallery, Deck editor, Game Log, Events, and Event Details. Shared filters, data tables, date pickers, and card-search UI also live here. Hosts retain fetching, structured search execution, caches, SSE streams, routing, keyboard handling, and mutations.

Storybook stories and checked-in visual baselines cover all product layouts (22 parity scenarios under `visual-tests/baselines/`). Run `pnpm ui:test` and `pnpm ui:visual` from the monorepo root.

## Accessibility

Story tests run the Storybook accessibility addon and block structural violations. Contrast is enforced for primitives, cards, Collection, Trade History, and Match. The `color-contrast` rule is temporarily excluded only for Replay stories because exact parity preserves the replay surface's deliberately dim board annotations; those labels should be corrected in the replay surface and `@videreproject/ui` together as an explicitly approved visual change.
