/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  compile,
  jsonBuildObject,
  raw,
  type SqlFragment,
} from '@videreproject/sql-builder';

import type { PendingSql, Sql } from '../../postgres.ts';

import { getDeckEntries, getMatchDeckEntries } from './getEvents.ts';
import type { ICardStatistics, IDeckStatistics } from './types.ts';

type DeckBoard = 'mainboard' | 'sideboard';

// Card statistics are aggregated over the matched-deck population (see
// buildBoardEntries), the same population that archetype.count counts. A card
// therefore never appears in more lists than its archetype has, so the share
// is a true fraction bounded by 100% with no explicit cap required.
const cardStatisticsJsonFields = {
  card: raw('e.card'),
  count: raw('e.count'),
  percentage: raw(
    "TO_CHAR(e.count * (100.0 / p.count), 'FM990.00%')"
  ),
  total: raw('e.total'),
  average: raw('e.average'),
} satisfies Record<keyof ICardStatistics, SqlFragment>;

const cardStatisticsJsonObject = compile(
  jsonBuildObject(cardStatisticsJsonFields)
);

export const getDeckStatistics = (
  sql: Sql,
  params: { [key: string]: any }
): PendingSql<IDeckStatistics[]> => {
  const deckEntries = getDeckEntries(sql, params);
  const matchEntries = getMatchDeckEntries(sql, params);
  const deckArchetypeFilter = params.archetype
    ? sql`AND e.archetype = ${params.archetype}`
    : sql``;
  const presenceArchetypeFilter = params.archetype
    ? sql`WHERE archetype = ${params.archetype}`
    : sql``;
  const archetypeCount = sql`COUNT(DISTINCT id)::int`;
  const archetypePresence = sql`
    (${archetypeCount} * 100.0 /
     (SELECT ${archetypeCount} FROM matched_deck_entries))
  `;
  const boardStats = buildDeckBoardStats(sql, deckArchetypeFilter);

  return sql`
    WITH
      deck_entries AS (${deckEntries}),
      -- Presence and its denominator use the same matched-player relation.
      match_entries AS MATERIALIZED (${matchEntries}),
      matched_deck_entries AS (
        SELECT
          d.id,
          d.event_id,
          d.player,
          d.name,
          d.archetype,
          d.archetype_id,
          d.mainboard,
          d.sideboard
        FROM deck_entries d
        WHERE EXISTS (
          SELECT 1
          FROM match_entries m
          WHERE m.event_id = d.event_id
            AND m.player = d.player
        )
      ),
      presence AS (
        SELECT
          archetype_id AS id,
          archetype,
          ${archetypeCount} AS count,
          TO_CHAR(${archetypePresence}, 'FM990.00%') AS percentage
        FROM matched_deck_entries
        ${presenceArchetypeFilter}
        GROUP BY
          archetype_id,
          archetype
      ),
      mainboard_entries AS MATERIALIZED (${boardStats.mainboard}),
      sideboard_entries AS MATERIALIZED (${boardStats.sideboard})
    SELECT
      p.id,
      p.archetype,
      p.count,
      m.mainboard,
      s.sideboard
    FROM presence p
    -- Join on the full (archetype_id, archetype) group key: an archetype_id can
    -- map to several archetype names, so joining on id alone would compare a
    -- card's count against a different name's deck count.
    INNER JOIN mainboard_entries m ON m.archetype_id = p.id AND m.archetype = p.archetype
    INNER JOIN sideboard_entries s ON s.archetype_id = p.id AND s.archetype = p.archetype
    ORDER BY
      p.count DESC
  `;
}

function buildDeckBoardStats(
  sql: Sql,
  deckArchetypeFilter: PendingSql<unknown[]>
): Record<DeckBoard, PendingSql<unknown[]>> {
  return {
    mainboard: buildBoardStats(sql, 'mainboard', deckArchetypeFilter),
    sideboard: buildBoardStats(sql, 'sideboard', deckArchetypeFilter),
  };
}

function buildBoardStats(
  sql: Sql,
  board: DeckBoard,
  deckArchetypeFilter: PendingSql<unknown[]>
): PendingSql<unknown[]> {
  const boardEntries = buildBoardEntries(sql, board, deckArchetypeFilter);

  return sql`
    SELECT
      p.id as archetype_id,
      p.archetype,
      json_agg(
        ${sql.unsafe(cardStatisticsJsonObject.text, [...cardStatisticsJsonObject.values])}
        ORDER BY
          e.count DESC,
          e.total DESC,
          e.average DESC,
          e.card ASC
      ) AS ${sql(board)}
    FROM (${boardEntries}) e
    INNER JOIN presence p ON p.id = e.archetype_id AND p.archetype = e.archetype
    WHERE
      e.count * (100.0 / p.count) >= 1.0
    GROUP BY
      p.id,
      p.archetype
  `;
}

function buildBoardEntries(
  sql: Sql,
  board: DeckBoard,
  deckArchetypeFilter: PendingSql<unknown[]>
): PendingSql<unknown[]> {
  return sql`
    SELECT
      e.archetype_id,
      e.archetype,
      c.name as card,
      COUNT(DISTINCT e.id)::int as count,
      SUM(c.quantity)::int as total,
      ROUND(
        SUM(c.quantity) / (1.0 * COUNT(DISTINCT e.id)), 2
      )::float AS average
    -- Aggregate over the matched-deck population so card counts stay
    -- consistent with archetype.count, which is also a matched-deck count.
    FROM matched_deck_entries e, unnest(${sql(`e.${board}`)}) AS c (id, name, quantity)
    WHERE
      e.archetype_id is not null
      ${deckArchetypeFilter}
    GROUP BY
      e.archetype_id,
      e.archetype,
      c.name
  `;
}

export default getDeckStatistics;
