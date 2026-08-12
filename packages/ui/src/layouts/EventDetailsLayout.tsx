/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Clock, Swords, Trophy, Users } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { DataTable } from '../components/tables/DataTable'
import { Badge } from '../primitives/Badge'
import { Button } from '../primitives/Button'
import { Skeleton } from '../primitives/Skeleton'
import { cn } from '../lib/cn'
import type {
  EventDetailsLayoutProps,
  StandingEntry,
  TournamentEvent,
  TournamentPhase,
} from '../types/events'
import { getFormatDotColor } from '../utils/formats'

function getPhase(event: TournamentEvent): TournamentPhase {
  if (event.status === 'completed') return 'finished'
  if (event.status === 'active') return 'active'
  return 'pre'
}

function getStatusLabel(event: TournamentEvent): string {
  const state = event.state
  if (!state || state === 'NotSet') return 'Scheduled'
  const labels: Record<string, string> = {
    WaitingToStart: 'Waiting to Start',
    Fired: 'Fired',
    Drafting: 'Drafting',
    Deckbuilding: 'Deckbuilding',
    DeckbuildingDeckSubmitted: 'Deckbuilding',
    WaitingForFirstRoundToStart: 'Starting Soon',
    RoundInProgress: `Round ${event.roundNumber ?? '?'} In Progress`,
    BetweenRounds: `Between Rounds (${event.roundNumber ?? '?'})`,
    Finished: 'Finished',
  }
  return labels[state] ?? state
}

function getStatusVariant(
  event: TournamentEvent,
): 'default' | 'secondary' | 'success' | 'warning' {
  const phase = getPhase(event)
  if (phase === 'finished') return 'success'
  if (phase === 'active') return 'warning'
  return 'secondary'
}

function hasRoundCountdown(state?: TournamentEvent['state']) {
  return (
    state === 'RoundInProgress' ||
    state === 'BetweenRounds' ||
    state === 'WaitingForFirstRoundToStart' ||
    state === 'Deckbuilding' ||
    state === 'DeckbuildingDeckSubmitted'
  )
}

function getRecordRoundCount(record: string | null | undefined): number | null {
  const parts = record?.match(/\d+/g)
  if (!parts?.length) return null
  return parts.reduce((sum, part) => sum + Number(part), 0)
}

function hasCurrentRoundMatchInProgress(
  standing: StandingEntry,
  state: TournamentEvent['state'] | undefined,
  roundNumber: number | undefined,
  playerNamesWithMatchesInProgress: Set<string>,
) {
  const recordRoundCount = getRecordRoundCount(standing.record)
  if (
    roundNumber != null &&
    roundNumber > 0 &&
    recordRoundCount != null &&
    recordRoundCount >= roundNumber
  ) {
    return false
  }

  return state === 'RoundInProgress' && playerNamesWithMatchesInProgress.has(standing.player)
}

function formatSchedule(event: TournamentEvent): string {
  const start = event._rawStartTime
  const end = event._rawEndTime
  if (!start) return '—'
  const startDate = new Date(start)
  const date = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const startTime = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const endTime = end
    ? new Date(end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '?'
  return `${date}, ${startTime} – ${endTime}`
}

function formatLastStandingsUpdate(lastUpdatedAt?: Date | string | null): string {
  if (!lastUpdatedAt) return 'never'
  const date = lastUpdatedAt instanceof Date ? lastUpdatedAt : new Date(lastUpdatedAt)
  if (Number.isNaN(date.getTime())) return 'never'
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

const standingsColumns: ColumnDef<StandingEntry>[] = [
  {
    id: 'rank',
    accessorFn: row => row.rank,
    header: '#',
    size: 50,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{row.original.rank}</span>
    ),
  },
  {
    id: 'player',
    accessorKey: 'player',
    header: 'Player',
  },
  {
    id: 'record',
    accessorKey: 'record',
    header: 'Record',
    size: 90,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.record ?? '—'}</span>
    ),
  },
  {
    id: 'points',
    accessorKey: 'points',
    header: 'Points',
    size: 70,
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.points ?? 0}</span>
    ),
  },
  {
    id: 'omw',
    accessorKey: 'opponentMatchWinPercentage',
    header: 'OMW%',
    size: 80,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.opponentMatchWinPercentage ?? '—'}
      </span>
    ),
  },
  {
    id: 'gw',
    accessorKey: 'gameWinPercentage',
    header: 'GW%',
    size: 80,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.gameWinPercentage ?? '—'}
      </span>
    ),
  },
  {
    id: 'ogw',
    accessorKey: 'opponentGameWinPercentage',
    header: 'OGW%',
    size: 80,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {row.original.opponentGameWinPercentage ?? '—'}
      </span>
    ),
  },
]

export function EventDetailsLayout({
  event,
  standings = [],
  eventsLoading = false,
  standingsLoading = false,
  standingsError = null,
  lastStandingsUpdatedAt = null,
  timerText = null,
  playerNamesWithMatchesInProgress,
  onBack,
  className,
}: EventDetailsLayoutProps) {
  const phase = event ? getPhase(event) : 'pre'
  const hasCountdown = hasRoundCountdown(event?.state)
  const showTimer = hasCountdown && Boolean(timerText)

  const inProgressNames = useMemo(() => {
    if (!playerNamesWithMatchesInProgress) return new Set<string>()
    return playerNamesWithMatchesInProgress instanceof Set
      ? playerNamesWithMatchesInProgress
      : new Set(playerNamesWithMatchesInProgress)
  }, [playerNamesWithMatchesInProgress])

  const getStandingRowClassName = useCallback(
    (standing: StandingEntry) => {
      return hasCurrentRoundMatchInProgress(
        standing,
        event?.state,
        event?.roundNumber,
        inProgressNames,
      )
        ? 'bg-yellow-500/15 hover:bg-yellow-500/20'
        : ''
    },
    [inProgressNames, event?.state, event?.roundNumber],
  )

  const standingsErrorMessage =
    standingsError == null
      ? null
      : typeof standingsError === 'string'
        ? standingsError
        : standingsError.message || String(standingsError)

  if (eventsLoading) {
    return (
      <div
        className={cn(
          'videre-ui container mx-auto space-y-6 px-4 py-4 font-sans',
          className,
        )}
        data-ui-layout="event-details"
      >
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="-ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Events
          </Button>
        ) : null}
        <Skeleton className="h-10 w-2/3" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    )
  }

  if (!event) {
    return (
      <div
        className={cn(
          'videre-ui container mx-auto space-y-4 px-4 py-4 font-sans',
          className,
        )}
        data-ui-layout="event-details"
      >
        {onBack ? (
          <Button variant="ghost" onClick={onBack} className="-ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Events
          </Button>
        ) : null}
        <div className="text-sm text-muted-foreground">
          Event not found. It may have ended or not yet loaded.
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'videre-ui container mx-auto space-y-5 px-4 py-4 font-sans',
        className,
      )}
      data-ui-layout="event-details"
    >
      <div className="flex items-start gap-4">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
            aria-label="Back to events"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
            <span className="truncate">{event.name}</span>
            <Badge variant={getStatusVariant(event)} className="shrink-0 rounded-md">
              {getStatusLabel(event)}
            </Badge>
          </h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className={cn('h-2 w-2 shrink-0 rounded-full', getFormatDotColor(event.format))}
              />
              {event.format}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {formatSchedule(event)}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {event.totalPlayers ?? 0} / {event.minimumPlayers ?? 0} players
            </span>
            {event.totalRounds != null ? (
              <span className="flex items-center gap-1.5">
                <Swords className="h-3.5 w-3.5" />
                {event.totalRounds} rounds
              </span>
            ) : null}
          </div>
        </div>
        {showTimer ? (
          <div className="ml-auto shrink-0 rounded-lg border border-sidebar-border/60 bg-muted/30 px-3 py-2 text-right">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Round timer
            </div>
            <div className="mt-0.5 flex items-center justify-end gap-1.5 text-sm font-semibold tabular-nums">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {timerText} left
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Trophy className="h-4 w-4" />
            {phase === 'pre' ? 'Players' : 'Standings'}
            {standings.length > 0 ? (
              <span className="text-sm font-normal text-muted-foreground">
                ({standings.length})
              </span>
            ) : null}
          </h2>
          {phase !== 'pre' ? (
            <div className="rounded-md border border-sidebar-border/60 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
              Last standings update: {formatLastStandingsUpdate(lastStandingsUpdatedAt)}
            </div>
          ) : null}
        </div>

        {phase === 'pre' ? (
          <div className="rounded-lg border border-sidebar-border/60 p-6 text-center text-sm text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p>
              {event.totalPlayers ?? 0} of {event.minimumPlayers ?? 0} players registered.
            </p>
            <p className="mt-1">Standings will be available once the tournament begins.</p>
          </div>
        ) : standingsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : standingsErrorMessage ? (
          <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
            Error loading standings: {standingsErrorMessage}
          </div>
        ) : standings.length === 0 ? (
          <div className="rounded-lg border border-sidebar-border/60 p-6 text-center text-sm text-muted-foreground">
            <Trophy className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p>No standings available yet.</p>
          </div>
        ) : (
          <DataTable
            columns={standingsColumns}
            data={standings}
            pageSize={16}
            autoResetPageIndex={false}
            className="[&_td]:py-1.5 [&_th]:py-1.5"
            wrapperClassName="overflow-visible"
            getRowClassName={getStandingRowClassName}
          />
        )}
      </div>
    </div>
  )
}
