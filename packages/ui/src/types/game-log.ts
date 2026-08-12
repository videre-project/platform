/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type GameLogType =
  | 'GameState'
  | 'GameAction'
  | 'ZoneChange'
  | 'CardChange'
  | 'PlayerChange'
  | 'LogMessage'
  | 'DamageAssignment'
  | 'Reveal'

export type GameStateData = {
  turn?: number
  phase: string | null
  previousTurn?: number
  previousPhase?: string | null
}

export type ZoneTransferData = {
  cardId?: number
  cardName: string | null
  fromZone?: string | null
  toZone?: string | null
  sourceId?: number | null
  type: string | null
}

export type CardChangeData = {
  cardId?: number
  cardName: string | null
  property: string | null
  oldValue?: string | null
  newValue?: string | null
}

export type PlayerChangeData = {
  playerIndex?: number
  playerName: string | null
  property: string | null
  oldValue?: string | null
  newValue?: string | null
}

export type DamageAssignmentTarget = {
  targetName?: string
  targetId: number
  amount: number
}

export type DamageAssignment = {
  sourceName?: string
  sourceId: number
  totalDamage: number
  targets: DamageAssignmentTarget[]
}

/** Raw log DTO shape accepted by layout helpers / optional viewers. */
export type GameLogDTO = {
  id?: number
  gameId?: number
  timestamp?: string
  gameLogType?: GameLogType | string
  data?: string | null
  nonce?: number
}

/**
 * Prepared presentational entry for {@link GameLogLayout}.
 * Host is responsible for streaming, history merge, sequencing, and delta.
 */
export type GameLogEntry = {
  id: number
  gameId?: number
  timestamp: string
  gameLogType: GameLogType
  data: string
  nonce: number
  /** Stable row key (seq or composite). */
  seq: number
  ts: Date
  deltaMs: number | null
}

export type GameLogTimePrecision = 'seconds' | 'milliseconds'

export type GameLogLayoutProps = {
  /** Prepared, ordered log entries (host merges history + live stream). */
  entries: GameLogEntry[]
  /** Page title, e.g. "Game Log" or "Game 2 Log". */
  title?: string
  /** Shown next to the title, e.g. match id. */
  matchId?: number | string | null
  /** LIVE connection indicator. Host owns stream lifecycle. */
  connected?: boolean
  /** Count of live events received (shown when > 0). */
  liveEventCount?: number
  loading?: boolean
  emptyMessage?: string
  loadingMessage?: string
  noMatchMessage?: string
  timePrecision?: GameLogTimePrecision
  onBack?: () => void
  className?: string
}
