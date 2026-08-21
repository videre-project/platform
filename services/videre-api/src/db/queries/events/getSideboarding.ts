/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { PendingSql, Sql } from '../../postgres.ts';
import { fromResults } from '../../statistics.ts';

import { getMatches } from './getEvents.ts';
import type { ISideboarding, ISideboardingMatrix } from './types.ts';

const segmentStatistics = (
  sql: Sql,
  games: PendingSql<unknown[]>,
  prefix: string,
  filter: PendingSql<unknown[]>,
): PendingSql<unknown[]> => {
  const statistics = fromResults(sql, {
    wins: sql`LENGTH(${games}) - LENGTH(REPLACE(${games}, 'W', ''))`,
    losses: sql`LENGTH(${games}) - LENGTH(REPLACE(${games}, 'L', ''))`,
    draws: sql`LENGTH(${games}) - LENGTH(REPLACE(${games}, 'T', ''))`,
  }, filter);

  return sql`
    ${statistics.count} AS ${sql.unsafe(`${prefix}_count`)},
    TO_CHAR(${statistics.mean}, 'FM990.00%') AS ${sql.unsafe(`${prefix}_winrate`)},
    TO_CHAR(${statistics.ci}, '±FM990.00%') AS ${sql.unsafe(`${prefix}_ci`)}
  `;
};

const gameEntries = (sql: Sql, params: { [key: string]: any }): PendingSql<unknown[]> => {
  const matchEntries = getMatches(sql, params);
  const archetypeFilter = params.archetype
    ? sql`AND archetype1 = ${params.archetype}`
    : sql``;

  return sql`
    WITH match_entries AS (${matchEntries})
    SELECT
      id1,
      id2,
      archetype1,
      archetype2,
      SPLIT_PART(games, '-', 1) AS game_one,
      CASE
        WHEN POSITION('-' IN games) > 0
        THEN SUBSTRING(games FROM POSITION('-' IN games) + 1)
        ELSE ''
      END AS postboard_games
    FROM match_entries
    WHERE archetype1 != archetype2
      ${archetypeFilter}
  `;
};

export const getSideboarding = (
  sql: Sql,
  params: { [key: string]: any },
): PendingSql<ISideboarding[]> => {
  const entries = gameEntries(sql, params);

  return sql`
    WITH
      entries AS (${entries}),
      -- Both segments use this grouped relation, so compute it once.
      statistics AS MATERIALIZED (
        SELECT
          id1 AS id,
          archetype1 AS archetype,
          ${segmentStatistics(
            sql,
            sql`game_one`,
            'game_one',
            sql`game_one IN ('W', 'L', 'T')`,
          )},
          ${segmentStatistics(
            sql,
            sql`postboard_games`,
            'postboard_game',
            sql`postboard_games <> ''`,
          )}
        FROM entries
        GROUP BY id1, archetype1
      )
    SELECT
      id,
      archetype,
      game_one_count,
      game_one_winrate,
      game_one_ci,
      postboard_game_count,
      postboard_game_winrate,
      postboard_game_ci
    FROM statistics
    WHERE game_one_count IS NOT NULL
    ORDER BY game_one_count DESC, game_one_winrate DESC
  `;
};

export const getSideboardingMatchups = (
  sql: Sql,
  params: { [key: string]: any },
): PendingSql<ISideboardingMatrix[]> => {
  const entries = gameEntries(sql, params);

  return sql`
    WITH
      entries AS (${entries}),
      top_archetypes AS (
        SELECT
          id1,
          archetype1
        FROM entries
        WHERE game_one IN ('W', 'L', 'T')
        GROUP BY id1, archetype1
        ORDER BY COUNT(*) DESC
        LIMIT ${params.limit ?? 100}
      ),
      scoped_entries AS (
        SELECT e.*
        FROM entries e
        INNER JOIN top_archetypes top
          ON top.id1 = e.id1
         AND top.archetype1 = e.archetype1
      ),
      statistics AS MATERIALIZED (
        SELECT
          id1,
          id2,
          archetype1,
          archetype2,
          ${segmentStatistics(
            sql,
            sql`game_one`,
            'game_one',
            sql`game_one IN ('W', 'L', 'T')`,
          )},
          ${segmentStatistics(
            sql,
            sql`postboard_games`,
            'postboard_game',
            sql`postboard_games <> ''`,
          )}
        FROM scoped_entries
        GROUP BY id1, id2, archetype1, archetype2
      ),
      sideboarding AS (
        SELECT
          id1,
          id2,
          archetype1,
          archetype2,
          game_one_count,
          game_one_winrate,
          game_one_ci,
          postboard_game_count,
          postboard_game_winrate,
          postboard_game_ci
        FROM statistics
        WHERE game_one_count IS NOT NULL
      )
    SELECT
      source.id1 AS id,
      source.archetype1 AS archetype,
      json_agg(
        json_build_object(
          'id', source.id2,
          'archetype', source.archetype2,
          'game_one_count', source.game_one_count,
          'game_one_winrate', source.game_one_winrate,
          'game_one_ci', source.game_one_ci,
          'postboard_game_count', source.postboard_game_count,
          'postboard_game_winrate', source.postboard_game_winrate,
          'postboard_game_ci', source.postboard_game_ci
        )
        ORDER BY source.game_one_count DESC, source.game_one_winrate DESC
      ) AS matchups
    FROM sideboarding source
    GROUP BY source.id1, source.archetype1
    ORDER BY SUM(source.game_one_count) DESC
  `;
};

export default getSideboarding;
