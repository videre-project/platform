/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { CellContext, ColumnDef } from '@tanstack/react-table'
import { ArrowLeft, Clock, Swords, Trophy, Users } from 'lucide-react'
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { TournamentPlayerPanel } from '../components/events/TournamentPlayerPanel'
import { DeckManaSymbols } from '../components/cards/DeckManaSymbols'
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
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(start)
  const startDate = new Date(dateOnly ? `${start}T00:00:00` : start)
  const date = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  if (dateOnly) return date
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

const PlayerSelectionContext = createContext<{
  activePlayer: string | null | undefined
  inline: boolean
  onSelect: ((player: string) => void) | undefined
} | null>(null)

function StandingPlayerCell({ row }: CellContext<StandingEntry, unknown>) {
  const selection = useContext(PlayerSelectionContext)
  if (!selection?.onSelect) return row.original.player

  const player = row.original.player
  const selected = player === selection.activePlayer
  return (
    <button
      type="button"
      title={player}
      className="block w-full truncate text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-pressed={selected}
      aria-expanded={selection.inline ? selected : undefined}
      onClick={event => {
        event.stopPropagation()
        selection.onSelect?.(player)
      }}
    >
      {player}
    </button>
  )
}

const standingsColumns: ColumnDef<StandingEntry>[] = [
  {
    id: 'rank',
    accessorFn: row => row.rank,
    header: '#',
    size: 40,
    minSize: 40,
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">{row.original.rank ?? '—'}</span>
    ),
  },
  {
    id: 'player',
    accessorKey: 'player',
    header: 'Player',
    size: 160,
    minSize: 160,
    cell: StandingPlayerCell,
  },
  {
    id: 'record',
    accessorKey: 'record',
    header: 'Record',
    size: 80,
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
      <span className="tabular-nums">{row.original.points ?? '—'}</span>
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
  playerDetails,
  onPlayerSelect,
  onMatchClick,
  onPreviewDeck,
  onBack,
  className,
}: EventDetailsLayoutProps) {
  const layoutRef = useRef<HTMLDivElement>(null)
  const [sideBySide, setSideBySide] = useState(false)
  const [collapsedDetail, setCollapsedDetail] = useState<{ eventId: TournamentEvent['id']; player: string } | null>(null)
  const [playerTab, setPlayerTab] = useState<'decklist' | 'matchups' | null>(null)
  const eventId = event?.id
  const activePlayer = !sideBySide && collapsedDetail?.eventId === event?.id && collapsedDetail?.player === playerDetails?.player
    ? null : playerDetails?.player
  const hasEvent = Boolean(event)
  const phase = event ? getPhase(event) : 'pre'
  const hasCountdown = hasRoundCountdown(event?.state)
  const showTimer = hasCountdown && Boolean(timerText)

  const selectPlayer = useCallback((player: string) => {
    if (!sideBySide && player === activePlayer && eventId) {
      setCollapsedDetail({ eventId, player })
      return
    }
    setCollapsedDetail(null)
    onPlayerSelect?.(player)
  }, [activePlayer, eventId, onPlayerSelect, sideBySide])

  const playerSelection = useMemo(() => ({
    activePlayer,
    inline: !sideBySide,
    onSelect: onPlayerSelect ? selectPlayer : undefined,
  }), [activePlayer, onPlayerSelect, selectPlayer, sideBySide])

  useLayoutEffect(() => {
    const layout = layoutRef.current
    if (!layout) return

    // Match the website's 30rem standings + 20rem player panel + 2rem gap,
    // using the content width remaining after Tracker's navigation sidebar.
    const observer = new ResizeObserver(([entry]) => {
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      setSideBySide(entry.contentRect.width >= 52 * rem)
    })
    observer.observe(layout)
    return () => observer.disconnect()
  }, [eventsLoading, hasEvent])

  const inProgressNames = useMemo(() => {
    if (!playerNamesWithMatchesInProgress) return new Set<string>()
    return playerNamesWithMatchesInProgress instanceof Set
      ? playerNamesWithMatchesInProgress
      : new Set(playerNamesWithMatchesInProgress)
  }, [playerNamesWithMatchesInProgress])

  const getStandingRowClassName = useCallback(
    (standing: StandingEntry) => {
      const inProgress = hasCurrentRoundMatchInProgress(
        standing,
        event?.state,
        event?.roundNumber,
        inProgressNames,
      )
      if (inProgress) {
        return standing.player === activePlayer
          ? 'bg-yellow-500/25 hover:bg-yellow-500/30'
          : 'bg-yellow-500/15 hover:bg-yellow-500/20'
      }
      return standing.player === activePlayer ? 'bg-accent hover:bg-accent' : ''
    },
    [inProgressNames, event?.state, event?.roundNumber, activePlayer],
  )

  const showArchetypes = phase === 'finished' && standings.some(row => row.archetype)
  const columns = useMemo(() => {
    const result = [...standingsColumns]
    if (showArchetypes) {
      result.splice(2, 0, {
        id: 'archetype', header: 'Archetype', size: 200,
        cell: ({ row }) => <div className="flex flex-col gap-0.5 text-sm">
          <span className="truncate" title={row.original.archetype ?? undefined}>{row.original.archetype ?? 'Unknown'}</span>
          <DeckManaSymbols colors={row.original.colors} className="h-3" symbolClassName="h-3 w-3" />
        </div>,
      })
    }
    return result
  }, [showArchetypes])

  const standingsErrorMessage =
    standingsError == null
      ? null
      : typeof standingsError === 'string'
        ? standingsError
        : standingsError.message || String(standingsError)

  const playerPanel = playerDetails && phase !== 'pre' ? <TournamentPlayerPanel key={playerDetails.player}
    details={playerDetails} showPlayerName={standings.length === 0} completed={phase === 'finished'} totalSwissRounds={event?.totalSwissRounds ?? (event?.hasPlayoffs ? event.totalRounds : undefined)}
    tab={playerTab} onTabChange={setPlayerTab}
    onMatchClick={onMatchClick} onPreviewDeck={onPreviewDeck} /> : null

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
      ref={layoutRef}
      className={cn(
        'videre-ui container mx-auto flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 pt-1 font-sans',
        className,
      )}
      data-ui-layout="event-details"
    >
      <div className="flex shrink-0 items-start gap-3">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="mt-0.5 h-8 w-8 shrink-0"
            aria-label="Back to events"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="flex items-center gap-2 text-xl font-semibold leading-7 tracking-tight">
            <span className="truncate">{event.name}</span>
            <Badge variant={getStatusVariant(event)} className="shrink-0 rounded-md">
              {getStatusLabel(event)}
            </Badge>
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
            {event.totalPlayers != null && <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {event.totalPlayers}{event.minimumPlayers ? ` / ${event.minimumPlayers}` : ''} players
            </span>}
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

      <div className="grid min-h-0 flex-1 gap-8" style={sideBySide && playerPanel ? { gridTemplateColumns: 'minmax(30rem, 1fr) clamp(20rem, 28%, 30rem)' } : undefined}>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className={cn(
            'flex shrink-0 flex-wrap items-center justify-between gap-2',
            playerDetails && phase !== 'pre'
              ? 'min-h-8 border-b border-sidebar-border/60'
              : 'mb-3',
          )}>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Trophy className="h-4 w-4" />
              {phase === 'pre' ? 'Players' : 'Standings'}
              {standings.length > 0 ? (
                <span className="text-sm font-normal text-muted-foreground">
                  ({standings.length})
                </span>
              ) : null}
            </h2>
            {phase !== 'pre' && lastStandingsUpdatedAt ? (
              <div className="text-xs text-muted-foreground" title={`Last standings update: ${formatLastStandingsUpdate(lastStandingsUpdatedAt)}`}>
                Updated {formatLastStandingsUpdate(lastStandingsUpdatedAt)}
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
              <p>{phase === 'finished' ? 'No standings available.' : 'No standings available yet.'}</p>
            </div>
          ) : (
            <PlayerSelectionContext.Provider value={playerSelection}>
              <DataTable
                columns={columns}
                data={standings}
                pageSize={16}
                autoResetPageIndex={false}
                className="[&_td]:py-1.5 [&_th]:py-1.5"
                containerClassName="flex min-h-0 flex-1 flex-col [&>[data-slot=data-table-pagination]]:shrink-0"
                tableContainerClassName="flex min-h-0 flex-1 flex-col"
                bodyWrapperClassName="min-h-0 flex-1 overflow-auto"
                renderRowDetail={!sideBySide && playerPanel ? row => row.player === activePlayer
                  ? <div className="border-l-2 border-muted-foreground/40 px-3 py-2">{playerPanel}</div>
                  : null : undefined}
                onRowClick={onPlayerSelect ? row => selectPlayer(row.player) : undefined}
                getRowId={row => row.player}
                activeRowId={activePlayer}
                getRowClassName={getStandingRowClassName}
              />
            </PlayerSelectionContext.Provider>
          )}
        </div>
        {sideBySide && playerPanel && <div className="min-h-0 min-w-0 [&>.event-tournament-player-panel]:h-full">{playerPanel}</div>}
      </div>
    </div>
  )
}
