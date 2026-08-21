/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

const FIRST_RESET_HOUR_UTC = 1
const FIRST_RESET_MINUTE_UTC = 30
const RESET_INTERVAL_MS = 2 * 60 * 60 * 1000

/**
 * Returns the number of seconds until the next MTGOBot reset boundary.
 * MTGOBot resets at 01:30 UTC and every two hours thereafter.
 */
export function getSecondsUntilNextMetagameRefresh(now = new Date()): number {
  const firstReset = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    FIRST_RESET_HOUR_UTC,
    FIRST_RESET_MINUTE_UTC,
  ))

  let nextReset = firstReset
  while (nextReset <= now) {
    nextReset = new Date(nextReset.getTime() + RESET_INTERVAL_MS)
  }

  return Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / 1000))
}
