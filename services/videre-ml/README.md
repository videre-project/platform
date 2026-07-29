# Videre ML

`videre-ml` owns `ml.videreproject.com` and applies public API policy before dispatching Manafold inference requests to private, format-specific Cloudflare Workers.

The public API accepts either form:

```text
POST /manafold/modern
POST /manafold?format=modern
```

`GET /manafold` lists every non-retired format from `videre-api`'s generated database schema. `Extended` and `Classic` remain catalog values for historical data but are not inference formats. The router uses shared response and CORS policy before forwarding inference through a Cloudflare Service Binding. Model weights and ONNX Runtime are deployed separately from the Manafold repository.

## Development

```sh
pnpm --filter videre-ml test
pnpm --filter videre-ml typecheck
pnpm --filter videre-ml dev
```

The development command starts only the public router. Its Service Bindings remain disconnected locally unless the corresponding `manafold-<format>` Workers are running in separate Wrangler processes. Router tests use in-memory bindings and do not require Manafold or its model bundles.

Once the router and a format Worker are running, an inference request exercises both services:

```sh
curl -s 'http://127.0.0.1:8787/manafold/modern?top=3' \
  -H 'content-type: application/json' \
  --data '[{"name":"Amped Raptor","quantity":4},{"name":"Guide of Souls","quantity":4}]'
```

## Deployment

Run Manafold's `formats:deploy` pipeline before deploying this service. Wrangler must be able to resolve every active `manafold-<format>` Service Binding when `videre-ml` is published. `videre-ml` is the sole Worker attached to the `ml.videreproject.com` custom domain.

## Adding A Format

Add the format to the generated database schema and Manafold release registry. The public list and TypeScript binding names are derived from the schema; Cloudflare Service Bindings remain explicit in `wrangler.toml`.
