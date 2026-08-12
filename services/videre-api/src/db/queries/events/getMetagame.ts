/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { PendingSql, Sql } from '../../postgres.ts';
import { fromMatches } from '../../statistics.ts';

import { getMatches } from './getEvents.ts';
import type { IMetagame } from './types.ts';

export const getMetagame = (
  sql: Sql,
  params: { [key: string]: any }
): PendingSql<IMetagame[]> => {
  const matchEntries = getMatches(sql, params);
  const { matches, games } = fromMatches(sql);

  const archetypeCount = sql`COUNT(DISTINCT deck_id)::int`;
  const archetypePresence = sql`
    (${archetypeCount} * 100.0 /
     (SELECT ${archetypeCount} FROM match_entries))
  `;

  return sql`
    WITH
      match_entries AS (${matchEntries}),
      presence AS (
        SELECT
          id1 AS id,
          archetype1 AS archetype,
          ${archetypeCount} AS count,
          TO_CHAR(${archetypePresence}, 'FM990.00%') AS percentage
        FROM match_entries
        GROUP BY
          id,
          archetype
      ),
      winrates AS (
        SELECT
          archetype1 AS archetype,
          ${matches.count} AS match_count,
          TO_CHAR(${matches.mean}, 'FM990.00%') AS match_winrate,
          TO_CHAR(${matches.ci}, '±FM990.00%') AS match_ci,
          ${games.count} AS game_count,
          TO_CHAR(${games.mean}, 'FM990.00%') AS game_winrate,
          TO_CHAR(${games.ci}, '±FM990.00%') AS game_ci
        FROM match_entries
        WHERE
          archetype1 != archetype2
        GROUP BY
          archetype1
      )
    SELECT
      p.id,
      p.archetype,
      p.count,
      p.percentage,
      w.match_count,
      w.match_winrate,
      w.match_ci,
      w.game_count,
      w.game_winrate,
      w.game_ci
    FROM presence p
    INNER JOIN winrates w ON
      w.archetype = p.archetype
    ORDER BY
      p.count DESC,
      w.match_count DESC,
      w.match_winrate DESC,
      w.game_count DESC,
      w.game_winrate DESC
  `;
}

export default getMetagame;
