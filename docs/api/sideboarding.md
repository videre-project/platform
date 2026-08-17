# Sideboarding API

For shared response, pagination, caching, and rate-limit behavior, see [API Overview](index.md).

The sideboarding API is the aggregate surface for analyzing how archetypes perform and change around sideboarding. Its current responses compare Game 1 (pre-board) performance with Games 2 and 3 (post-board) performance for archetypes and non-mirror pairings. The route family is also intended to expose aggregate mainboard and sideboard card changes derived from the decklists used by each archetype. It uses the ordered game results stored on each imported match; it currently does not infer play/draw information.

```text
GET /sideboarding/:format?
GET /sideboarding/:format?/matchups
```

## Filters

```text
/sideboarding/modern
/sideboarding/modern/matchups
/sideboarding/modern/matchups?archetype=Boros%20Energy
/sideboarding/pioneer?min_date=2026-06-01&max_date=2026-06-26
```

Supported query parameters are `format`, `archetype` (matchups only), `event_id`, `min_date`, `max_date`, and `limit`. `format` is required and can be supplied as the path segment or query parameter. `event_id` takes precedence over date filters. Supplying `archetype` on the matchup route filters the response to that row and sets `limit` to `1`.

## Response Shape

The summary route returns rows with:

```text
id
archetype
game_one_count
game_one_winrate
game_one_ci
postboard_game_count
postboard_game_winrate
postboard_game_ci
```

The matchup route returns rows with `id`, `archetype`, and `matchups`. Each nested matchup has the same six statistic fields plus its opposing `id` and `archetype`.

The count fields are game counts. The winrate and CI fields are formatted percentages from the row archetype's perspective. Post-board fields are nullable when no Games 2–3 data exists for that archetype or pairing. Mirror matches are excluded.

## Example

```jsonc
{
  "data": [
    {
      "id": 28088,
      "archetype": "Izzet Prowess",
      "game_one_count": 620,
      "game_one_winrate": "49.52%",
      "game_one_ci": "±3.94%",
      "postboard_game_count": 934,
      "postboard_game_winrate": "52.11%",
      "postboard_game_ci": "±3.20%"
    }
  ]
}
```
