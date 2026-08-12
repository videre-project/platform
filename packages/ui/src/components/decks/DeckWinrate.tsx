/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { DeckMatchStats } from '../../types/decks'

export function DeckWinrateMetric({ stats }: { stats: DeckMatchStats }) {
  const hasMatches = stats.matches > 0
  const record = stats.ties > 0
    ? `${stats.wins}-${stats.losses}-${stats.ties}`
    : `${stats.wins}-${stats.losses}`
  const label = hasMatches
    ? `${stats.winrate}% win rate, ${record} record over ${stats.matches} matches`
    : 'No recorded matches'

  return (
    <div
      className="shrink-0 text-right tabular-nums"
      aria-label={label}
      title={label}
    >
      {hasMatches ? (
        <>
          <div className="text-2xl font-bold leading-6 text-foreground">
            {stats.winrate}%
          </div>
          <div className="mt-0.5 text-xs font-medium leading-4 text-muted-foreground">
            {record}
          </div>
        </>
      ) : (
        <>
          <div className="h-6" aria-hidden="true" />
          <div className="mt-0.5 text-xs font-medium leading-4 text-muted-foreground">
            No matches
          </div>
        </>
      )}
    </div>
  )
}

export function DeckWinrateBar({ stats }: { stats: DeckMatchStats }) {
  if (stats.matches === 0) {
    return (
      <div
        className="h-2 w-full rounded-full bg-muted"
        aria-label="No recorded matches"
        title="No recorded matches"
      />
    )
  }

  const winPercent = (stats.wins / stats.matches) * 100
  const lossPercent = (stats.losses / stats.matches) * 100
  const tiePercent = (stats.ties / stats.matches) * 100

  return (
    <div
      className="relative flex h-2 w-full overflow-hidden rounded-full bg-muted"
      aria-label={`${stats.winrate}% win rate over ${stats.matches} matches`}
      title={`${stats.wins} wins, ${stats.losses} losses${stats.ties > 0 ? `, ${stats.ties} ties` : ''}`}
    >
      {winPercent > 0 ? (
        <div className="h-full bg-emerald-500" style={{ width: `${winPercent}%` }} />
      ) : null}
      {tiePercent > 0 ? (
        <div className="h-full bg-amber-400/85" style={{ width: `${tiePercent}%` }} />
      ) : null}
      {lossPercent > 0 ? (
        <div className="h-full bg-rose-500/85" style={{ width: `${lossPercent}%` }} />
      ) : null}
      <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-background" />
    </div>
  )
}
