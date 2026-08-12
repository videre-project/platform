/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { compile, jsonBuildObjectFromColumns } from '@videreproject/sql-builder';

import type { PendingSql, Sql } from '../../postgres.ts';

import getMatchups from './getMatchups.ts';
import { MATCHUP_SUMMARY_FIELDS, type IMatchupMatrix } from './types.ts';

const matchupSummaryJsonObject = compile(
  jsonBuildObjectFromColumns('m', MATCHUP_SUMMARY_FIELDS)
);

export const getMatchupMatrix = (
  sql: Sql,
  params: { [key: string]: any }
): PendingSql<IMatchupMatrix[]> => {
  const matchups = getMatchups(sql, params);

  return sql`
    WITH
      matchups AS (${matchups})
    SELECT
      source.id1 as id,
      source.archetype1 AS archetype,
      json_agg(
        ${sql.unsafe(matchupSummaryJsonObject.text, [...matchupSummaryJsonObject.values])}
        ORDER BY
          source.match_count DESC,
          source.match_winrate DESC,
          source.game_count DESC,
          source.game_winrate DESC
      ) AS matchups
    FROM matchups source
    CROSS JOIN LATERAL (
      SELECT
        source.id2 AS id,
        source.archetype2 AS archetype,
        source.match_count,
        source.match_winrate,
        source.match_ci,
        source.game_count,
        source.game_winrate,
        source.game_ci
    ) m
    GROUP BY
      source.id1,
      source.archetype1
    ORDER BY
      SUM(source.match_count) DESC,
      SUM(source.game_count) DESC
  `;
}

export default getMatchupMatrix;
