# Prices API

For shared response, pagination, caching, and rate-limit behavior, see [API overview](index.md).

The prices API returns GoatBots daily average sell prices in event tickets for MTGO catalog IDs. Catalog IDs can refer to cards, card catalog variants, or products. Missing price data means GoatBots did not publish a price for that catalog ID/date; it is not a tradability signal.

```text
GET /prices/:id
GET /prices/:id/history?from=&to=&limit=&offset=
QUERY /prices
POST /prices
```

`/prices/:id` returns the latest known price for one MTGO catalog ID, while `/prices/:id/history` returns dated rows for that ID. QUERY and POST `/prices` accept the same JSON body; clients that support QUERY should use it so equivalent requests can share the Worker cache.

```http
QUERY /prices
Content-Type: application/json
```

```json
{
  "ids": [605, 1195],
  "date": "latest"
}
```

`date` may be `latest` or a `YYYY-MM-DD` price date, and batch requests may use the same collection ID wrapper accepted by QUERY and POST `/cards/search`:

```json
{
  "collection": {
    "ids": [605, 1195]
  }
}
```

Batch responses include `meta.missing_ids` for requested catalog IDs with no matching price row. Batch requests are capped at 10,000 IDs. The cap is applied before duplicate IDs are removed.

The Worker uses one cache key for equivalent QUERY and POST requests, deriving it from the route, query parameters, content type, API cache version, and normalized request body. Numeric ID arrays are deduplicated and sorted before hashing, so equivalent batches reuse the same entry.

Responses for `date=latest` expire at the next scheduled daily refresh at 05:40 in Europe/Berlin, while historical dates use a one-year immutable cache policy:

```text
public, max-age=31536000, s-maxage=31536000, immutable
```

Successful responses advertise QUERY support with `Accept-Query: application/json`.

## Response shape

Each price row includes:

```text
id
price_date
sell_price
source
url
kind
name
cardset
rarity
version
foil
```

`id` is the MTGO catalog ID. `source` is currently `goatbots`, and `url` points at the source website. `name`, `cardset`, `rarity`, `version`, and `foil` are GoatBots definition metadata when available.
