# Rate limits

This page documents public request limits and runtime guardrails for `https://api.videreproject.com`.

For route shapes and response fields, see the endpoint docs under [`docs/api`](../api/index.md). For card search operators, see [Card Search Syntax](card-search.md).

The API has two kinds of protection. Edge rate limits reject requests before they reach the Worker. Runtime guardrails allow a request to run, but bound how much work it can ask the Worker and database to do. Edge rejections indicate request volume. Timeouts indicate that the individual query was too broad or too expensive.

## Public edge limit

The only dedicated public edge rate limit currently applies to collection-aware card search:

```text
QUERY /cards/search and POST /cards/search
20 requests per 10 seconds
```

The counter is keyed by client IP and Cloudflare colo. The published limit is roughly 2 requests per second for one client IP, with a short burst allowance. Cloudflare may count the same IP separately if traffic reaches different colos.

When the limit is exceeded, Cloudflare rejects matching requests before they reach the Worker, so database work is avoided. The mitigation window is short, and retries made during that window receive the same `429` response.

This limit applies to the personalized route rather than every API route because each request can carry a large body and a different collection context.

## Body request guardrails

The body-based catalog routes cap inline ID arrays before doing database work:

| Route | Body field | Maximum IDs |
|---|---|---:|
| `QUERY` or `POST /cards/search` | `collection.ids` | 10,000 |
| `QUERY` or `POST /prices` | `ids` or `collection.ids` | 10,000 |

The cap is applied to the submitted array before duplicate IDs are removed.

## Collection-aware card search

QUERY and POST `/cards/search` can include a caller-provided collection of up to 10,000 MTGO catalog IDs. Equivalent requests share a public Worker cache entry derived from the normalized body and URL query parameters, with responses using:

```text
Cache-Control: max-age=3600, s-maxage=1800
```

The endpoint personalizes search to a user's collection, and its cache key contains a body hash so catalog IDs do not appear in the cache URL.

The route supports interactive use with collections of a few thousand cards; the expensive case is repeated broad searches over large collections, especially when the full collection is sent for every input change.

Typical interactive request profile:

- The user stops typing for a short debounce interval.
- The client sends one QUERY or POST `/cards/search` request after the user pauses.
- The request includes the current collection and a narrow query.
- The UI renders the returned page and waits for the next deliberate input.

Request profile most likely to hit the edge limit:

- The client sends a POST request for every keypress.
- Each request includes thousands of IDs.
- The query is broad enough to scan a large portion of the catalog.
- Several requests are in flight for the same user at the same time.

## GET route guardrails

Other public routes are bounded by runtime and pagination guardrails:

| Guardrail | Value |
|---|---:|
| `Cache-Control` | `max-age=3600, s-maxage=1800` |
| Worker timeout | 15 seconds |
| Database query timeout | 10 seconds |
| Default list limit | 100 |
| Maximum list limit | 500 |
| Autocomplete maximum limit | 100 |

These routes are cacheable by URL. Sequential paging with `offset=meta.next_offset` keeps each request aligned with the response metadata.

The cache makes repeated GET requests cheap only when the URL is identical. Changing `limit`, `offset`, date filters, sort order, or search text creates a different cache key. For list views, stable filters preserve page boundaries. Exact totals add a count query; `meta.has_more` and `meta.next_offset` are available without exact totals on probe-paginated routes.

`GET /cards/random` is also a cacheable GET route. The same URL can return the same random result until the cache expires. Query parameters are part of the cache key, so meaningful filters such as `set=SOS` or `q=t:dragon` constrain the random-card pool, while throwaway cache-busting parameters create otherwise duplicate cache entries.

## Error responses

The API uses normal HTTP status codes. A rate-limited request is different from a validation error or an empty result:

- `400 Bad Request`: the request was invalid, or the route returned no rows for the supplied filters.
- `429 Too Many Requests`: the client is sending too many matching requests. Back off before retrying.
- `5xx` response: the request reached infrastructure or runtime failure. Retry with backoff.

Retrying a `400` response requires changing the request. `429` and transient `5xx` responses are retryable with backoff.

## Request patterns

For collection-backed search, keep requests within this profile:

- Debounce interactive search input.
- Send the smallest collection pool that matches the current feature.
- `mode=rank` for broad discovery views.
- `mode=only` for owned-card inventory views.
- Narrow search filters when sending large collections.

`mode=rank` keeps the full search result available while moving owned cards first. `mode=only` returns only owned cards. `mode=exclude` returns matching cards outside the submitted collection.

For cacheable GET routes, use stable URLs and sequential paging:

- Reuse URLs when polling.
- Page with `meta.next_offset`.
- Request exact totals only when the UI needs them.

For sustained higher-volume access, direct SQL through the public database role or a scheduled export reduces HTTP request volume.
