/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type TournamentState =
  | 'NotSet'
  | 'Fired'
  | 'WaitingToStart'
  | 'Drafting'
  | 'Deckbuilding'
  | 'DeckbuildingDeckSubmitted'
  | 'WaitingForFirstRoundToStart'
  | 'RoundInProgress'
  | 'BetweenRounds'
  | 'Finished'

export type EventType = 'league' | 'swiss' | 'elimination' | 'draft' | 'unknown'
export type EventStatus = 'active' | 'paused' | 'scheduled' | 'completed'
export type TournamentPhase = 'pre' | 'active' | 'finished'

/** Presentational tournament/event row used by Events layouts and timeline. */
export type TournamentEvent = {
  id: string
  name: string
  format: string
  status: EventStatus
  type?: EventType
  url?: string
  deck?: string
  wins?: number
  losses?: number
  totalRounds?: number
  roundNumber?: number
  totalSwissRounds?: number
  pod?: string
  /** Short display times (e.g. "11:00 AM"). */
  startTime?: string
  endTime?: string
  timeRemaining?: string
  totalPlayers?: number
  minimumPlayers?: number
  roundEndTime?: string
  roundDurationMs?: number
  inPlayoffs?: boolean
  hasPlayoffs?: boolean
  eventStructure?: { hasPlayoffs?: boolean; name?: string } | null
  activePlayerNames?: string[]
  playerNamesWithMatchesInProgress?: string[]
  state?: TournamentState
  /** ISO start for timeline positioning. */
  _rawStartTime?: string
  /** ISO end for timeline positioning. */
  _rawEndTime?: string
}

export type StandingEntry = {
  rank: number
  player: string
  points: number
  record: string
  opponentMatchWinPercentage: string
  gameWinPercentage: string
  opponentGameWinPercentage: string
}

export type EventDetailExtras = {
  entryFee?: string | null
  prizes?: Record<string, string> | null
  loading?: boolean
}

export type EventsTimelineProps = {
  events: TournamentEvent[]
  focusedEventId?: string | null
  activeEventIds?: Set<string> | string[]
  onEventClick?: (event: TournamentEvent) => void
  className?: string
}

export type EventDetailPanelProps = {
  event: TournamentEvent | null
  entryFee?: string | null
  prizes?: Record<string, string> | null
  detailsLoading?: boolean
  detailsPending?: boolean
  onClose: () => void
  onViewTournament?: (event: TournamentEvent) => void
  className?: string
}

export type EventsLayoutProps = {
  /** Filtered/sorted events for the table (host owns filtering). */
  events: TournamentEvent[]
  /** Events shown on the timeline (defaults to `events`). */
  timelineEvents?: TournamentEvent[]
  loading?: boolean
  error?: Error | string | null
  selectedEventId?: string | null
  onSelectedEventIdChange?: (id: string | null) => void
  hoveredEventId?: string | null
  onHoveredEventIdChange?: (id: string | null) => void
  /** IDs of currently active tournaments (timeline dimming). */
  activeEventIds?: Set<string> | string[]
  /**
   * Host-resolved entry fees keyed by event id.
   * Layout reports visible page rows via `onPageRowsChange` so the host can fetch.
   */
  entryFees?: Record<string, string | undefined>
  onPageRowsChange?: (events: TournamentEvent[]) => void
  /** Detail panel data for the selected event (host fetches). */
  selectedEventDetails?: EventDetailExtras
  onViewTournament?: (event: TournamentEvent) => void
  className?: string
}

export type EventDetailsLayoutProps = {
  event: TournamentEvent | null
  standings?: StandingEntry[]
  eventsLoading?: boolean
  standingsLoading?: boolean
  standingsError?: Error | string | null
  lastStandingsUpdatedAt?: Date | string | null
  /** Pre-formatted countdown string (host computes from streams). */
  timerText?: string | null
  /** Highlight standing rows for players with matches in progress. */
  playerNamesWithMatchesInProgress?: string[] | Set<string>
  onBack?: () => void
  className?: string
}
