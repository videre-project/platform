/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { PendingSql, Sql } from "./postgres.ts";


export type Percentage = `${number}%`;
export type CI = `±${number}%`;

/**
 * A row-wise query of wins, losses, ties used within an aggregate query.
 */
export type RecordQuery = {
  wins: PendingSql<number[]>,
  losses: PendingSql<number[]>,
  draws: PendingSql<number[]>
};

/**
 * Contains statistics for a collection of match or game entries.
 */
export type RecordStatistics = {
  /**
   * The total number of matches or games played.
   */
  count: PendingSql<number>,
  /**
   * The average winrate.
   */
  mean: PendingSql<Percentage>,
  /**
   * The standard deviation of the average winrate.
   */
  stddev: PendingSql<Percentage>,
  /**
   * The 95% confidence interval for the average winrate.
   */
  ci: PendingSql<CI>
};

/**
 * Calculates the winrate and associated statistics for each match entry,
 * given the parameters for each match entry in an aggregate query.
 * @param sql The Sql object to use for the query.
 * @param params The parameters (wins, losses, draws) to use for the query.
 * @returns An object containing the statistics for the given parameters.
 */
export function fromResults(
  sql: Sql,
  { wins, losses, draws }: RecordQuery
): RecordStatistics {
  // 'n' represents the total number of games played in a single match.
  const n = sql`((${wins}) + (${losses}) + (${draws}))`;

  // The total number of games played across all match entries.
  const count = sql`SUM(${n})::int`;

  // The mean winrate, including draws.
  //
  // The mean winrate is given by:
  //   x_mean = ∑(n_wins / n_games) * 100% +
  //            ∑(n_losses / n_games) * 0% +
  //            ∑(n_draws  / n_games) * 50%
  const mean = sql`
    AVG(
      (CASE
        WHEN ${losses} = ${n} THEN 0
        ELSE ((${wins}) * 1 + (${draws}) * 0.5) / ${n}
      END) * 100.0
    )
  ::float`;

  // The standard deviation of the average winrate.
  //
  // The standard deviation of a bernoulli distribution (of binary outcomes)
  // is given by:
  //   σ = √(p_failure * (0% - p_mean)^2 + p_success * (100% - p_mean)^2)
  // where:
  //   p_success = ∑(n_wins / n_games),
  //   p_failure = ∑(n_losses / n_games),
  //   p_mean = (p_success * 100%) + (p_failure * 0%)
  //
  // Therefore, the standard deviation of the mean winrate (including draws)
  // is given by:
  //   σ = √(∑(n_wins / n_games) * (100% - x_mean))^2 +
  //         ∑(n_losses / n_games) * (0% - x_mean))^2 +
  //         ∑(n_draws / n_games) * (50% - x_mean))^2)
  const stddev = sql`
    SQRT(
      (SUM(${wins})::float / ${count})
        * POWER((100.0 - ${mean}), 2) +
      (SUM(${losses})::float / ${count})
        * POWER((  0.0 - ${mean}), 2) +
      (SUM(${draws})::float / ${count})
        * POWER(( 50.0 - ${mean}), 2)
    )
  ::float`;

  // The 95% confidence interval for the average winrate.
  //
  // CI = x_mean ± Z * (σ / √n)
  // where:
  //   x_mean = mean
  //   Z = 1.96 for 95% confidence
  //   σ = standard deviation
  //   n = count
  const ci = sql`1.96 * (${stddev} / SQRT(${count}))`;

  return { count, mean, stddev, ci };
}

/**
 * Contains statistics for all matches and their associated games.
 */
export type MatchStatistics = {
  /**
   * The statistics for all match entries.
   */
  matches: RecordStatistics,
  /**
   * The statistics for all game entries.
   */
  games: RecordStatistics
};

/**
 * Calculates the winrate and associated statistics for each match and game.
 * @param sql The Sql object to use for the query.
 * @returns An object containing statistics queries for all matches and games.
 */
export function fromMatches(sql: Sql) : MatchStatistics {
  //
  // Store a subselect query to calculate the match and game winrates.
  //
  // PostgreSQL will avoid calculating the same subquery multiple times, so
  // the use of this subquery in multiple places will not duplicate work.
  //
  const matches = fromResults(sql, {
    wins:   sql`CASE WHEN result = 'win' THEN 1 ELSE 0 END`,
    losses: sql`CASE WHEN result = 'loss' THEN 1 ELSE 0 END`,
    draws:  sql`CASE WHEN result = 'draw' THEN 1 ELSE 0 END`
  });
  const games = fromResults(sql, {
    wins:   sql`LENGTH(games) - LENGTH(REPLACE(games, 'W', ''))`,
    losses: sql`LENGTH(games) - LENGTH(REPLACE(games, 'L', ''))`,
    draws:  sql`LENGTH(games) - LENGTH(REPLACE(games, 'T', ''))`
  });

  return { matches, games };
}
