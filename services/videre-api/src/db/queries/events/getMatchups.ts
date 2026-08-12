/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { PendingSql, Sql } from '../../postgres.ts';
import { fromMatches } from '../../statistics.ts';

import { getMatches } from './getEvents.ts';
import type { IMatchup } from './types.ts';

export const getMatchups = (
  sql: Sql,
  params: { [key: string]: any }
): PendingSql<IMatchup[]> => {
  const matchEntries = getMatches(sql, params);
  const archetypeFilter = params.archetype
    ? sql`AND archetype1 = ${params.archetype}`
    : sql``;
  const { matches, games } = fromMatches(sql);

  return sql`
    WITH
      match_entries AS (${matchEntries})
    SELECT
      id1,
      id2,
      archetype1,
      archetype2,
      ${matches.count} AS match_count,
      TO_CHAR(${matches.mean}, 'FM990.00%') AS match_winrate,
      TO_CHAR(${matches.ci}, '±FM990.00%') AS match_ci,
      ${games.count} AS game_count,
      TO_CHAR(${games.mean}, 'FM990.00%') AS game_winrate,
      TO_CHAR(${games.ci}, '±FM990.00%') AS game_ci
    FROM match_entries
    WHERE
      archetype1 != archetype2
      ${archetypeFilter}
    GROUP BY
      id1,
      id2,
      archetype1,
      archetype2
  `;
}

export default getMatchups;
