# `@videreproject/constants`

Shared domain enums and constants for Videre. **Postgres (mtgo-db) is the source of truth.**

Domain lists such as `FORMATS`, `EVENTS`, `RESULTS`, card colors, card types, and rarities are written by
`scripts/generate-db-types.mjs` into `src/enums.g.ts`. Do not hand-edit that file.

```sh
# From the monorepo root (requires DB credentials in services/videre-api/.dev.vars)
pnpm db:generate-types
pnpm db:check-types
```

Stable helpers that derive from generated data (for example lowercase format wire codes) live in
non-generated modules such as `src/derived.ts`.

`RETIRED_FORMATS` is maintained manually in `src/derived.ts`. Retired formats remain in the
generated database enum for historical records, while `ACTIVE_FORMATS` is the appropriate list
for live API queries and current-format interfaces.
