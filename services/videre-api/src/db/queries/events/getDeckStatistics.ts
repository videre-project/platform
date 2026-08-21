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

const cardStatisticsJsonFields = {
  card: raw('e.card'),
  count: raw('LEAST(e.count, p.count)'),
  percentage: raw(
    "TO_CHAR(LEAST(e.count, p.count) * (100.0 / p.count), 'FM990.00%')"
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
    INNER JOIN mainboard_entries m ON m.archetype_id = p.id
    INNER JOIN sideboard_entries s ON s.archetype_id = p.id
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
      json_agg(
        ${sql.unsafe(cardStatisticsJsonObject.text, [...cardStatisticsJsonObject.values])}
        ORDER BY
          e.count DESC,
          e.total DESC,
          e.average DESC,
          e.card ASC
      ) AS ${sql(board)}
    FROM (${boardEntries}) e
    INNER JOIN presence p ON p.id = e.archetype_id
    WHERE
      e.count * (100.0 / p.count) >= 1.0
    GROUP BY
      p.id
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
      c.name as card,
      COUNT(DISTINCT e.id)::int as count,
      SUM(c.quantity)::int as total,
      ROUND(
        SUM(c.quantity) / (1.0 * COUNT(DISTINCT e.id)), 2
      )::float AS average
    FROM deck_entries e, unnest(${sql(`e.${board}`)}) AS c (id, name, quantity)
    WHERE
      e.archetype_id is not null
      ${deckArchetypeFilter}
    GROUP BY
      e.archetype_id, c.name,
      e.archetype
  `;
}

export default getDeckStatistics;
