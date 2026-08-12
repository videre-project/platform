/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ColumnDef } from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { EventDetailPanel } from '../components/events/EventDetailPanel'
import { EventsTimeline } from '../components/events/EventsTimeline'
import { DataTable } from '../components/tables/DataTable'
import { TableBodySkeleton } from '../components/tables/TableBodySkeleton'
import { cn } from '../lib/cn'
import type { EventsLayoutProps, TournamentEvent } from '../types/events'
import { getFormatDotColor } from '../utils/formats'

function formatTime(dateString?: string) {
  if (!dateString) return '–'
  return new Date(dateString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatSchedule(start?: string, end?: string) {
  if (!start) return '–'
  const startDate = new Date(start)
  const date = startDate.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
  const startTime = formatTime(start)
  const endTime = formatTime(end)
  return `${date}, ${startTime} – ${endTime}`
}

const DEFAULT_ROUND_DURATION_MS = 50 * 60 * 1000

function getEventRoundProgress(event: TournamentEvent, now: number) {
  const totalRounds = event.totalSwissRounds || event.totalRounds || 0
  const isCompleted = event.status === 'completed' || event.state === 'Finished'
  const hasStarted =
    isCompleted || event.status === 'active' || (event.roundNumber != null && event.roundNumber > 0)

  if (!hasStarted) {
    return { hasStarted: false, currentRound: 0, totalRounds, progress: 0 }
  }

  if (isCompleted) {
    return { hasStarted: true, currentRound: totalRounds, totalRounds, progress: 1 }
  }

  const currentRound = event.roundNumber ?? 1
  let inRoundProgress = 0

  if (event.state === 'RoundInProgress' && event.roundEndTime) {
    const end = new Date(event.roundEndTime).getTime()
    if (!isNaN(end)) {
      const durationMs = event.roundDurationMs ?? DEFAULT_ROUND_DURATION_MS
      const timeRemaining = Math.max(0, end - now)
      const elapsed = Math.max(0, durationMs - timeRemaining)
      inRoundProgress = Math.min(1, elapsed / durationMs)
    }
  }

  const effectiveTotalRounds = totalRounds > 0 ? totalRounds : Math.max(1, currentRound)
  const completedBeforeCurrent = Math.max(0, currentRound - 1)
  const progress = Math.min(1, (completedBeforeCurrent + inRoundProgress) / effectiveTotalRounds)

  return {
    hasStarted: true,
    currentRound,
    totalRounds,
    progress,
  }
}

function RoundsCell({
  event,
  roundsDigitsWidth,
}: {
  event: TournamentEvent
  roundsDigitsWidth: number
}) {
  const [now, setNow] = useState(Date.now)
  const isLiveActive =
    event.status === 'active' && event.state === 'RoundInProgress' && Boolean(event.roundEndTime)

  useEffect(() => {
    if (!isLiveActive) return
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 5000)
    return () => clearInterval(interval)
  }, [isLiveActive])

  const { hasStarted, currentRound, totalRounds, progress } = getEventRoundProgress(event, now)

  if (!hasStarted) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="text-right tabular-nums text-muted-foreground"
          style={{ width: `${roundsDigitsWidth}ch` }}
        >
          {totalRounds > 0 ? totalRounds : '–'}
        </span>
      </span>
    )
  }

  const r = 6
  const circ = 2 * Math.PI * r
  const filled = circ * progress

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-right tabular-nums" style={{ width: `${roundsDigitsWidth}ch` }}>
        {currentRound}
      </span>
      {totalRounds > 0 ? <span className="text-muted-foreground">/ {totalRounds}</span> : null}
      <svg width="16" height="16" className="-rotate-90 shrink-0">
        <circle
          cx="8"
          cy="8"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-border"
        />
        <circle
          cx="8"
          cy="8"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${filled} ${circ - filled}`}
          className={
            progress >= 1
              ? 'text-green-500'
              : progress >= 0.5
                ? 'text-blue-500'
                : 'text-muted-foreground'
          }
        />
      </svg>
    </span>
  )
}

function toIdSet(ids?: Set<string> | string[]): Set<string> {
  if (!ids) return new Set()
  return ids instanceof Set ? ids : new Set(ids)
}

export function EventsLayout({
  events,
  timelineEvents,
  loading = false,
  error = null,
  selectedEventId = null,
  onSelectedEventIdChange,
  hoveredEventId = null,
  onHoveredEventIdChange,
  activeEventIds,
  entryFees = {},
  onPageRowsChange,
  selectedEventDetails,
  onViewTournament,
  className,
}: EventsLayoutProps) {
  const [timelineScrollKey, setTimelineScrollKey] = useState(0)
  const hasAutoSelectedRef = useRef(false)

  const playersDigitsWidth = useMemo(
    () => Math.max(1, ...events.map(event => String(event.totalPlayers ?? 0).length)),
    [events],
  )

  const roundsDigitsWidth = useMemo(
    () =>
      Math.max(
        1,
        ...events.map(event => String(event.roundNumber ?? event.totalRounds ?? 0).length),
      ),
    [events],
  )

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null
    return events.find(e => e.id === selectedEventId) ?? null
  }, [selectedEventId, events])

  const activeEventIdSet = useMemo(() => toIdSet(activeEventIds), [activeEventIds])
  const timelineData = timelineEvents ?? events

  // Auto-select soonest upcoming event on initial load when uncontrolled selection is empty
  useEffect(() => {
    if (!onSelectedEventIdChange) return
    if (hasAutoSelectedRef.current || selectedEventId != null || events.length === 0) return
    const now = Date.now()
    const soonestUpcoming =
      events.find(
        e =>
          (e.status === 'scheduled' || e.status === 'active') &&
          e._rawStartTime &&
          new Date(e._rawStartTime).getTime() >= now,
      ) ??
      events.find(e => e.status === 'scheduled' || e.status === 'active') ??
      events[0]

    if (soonestUpcoming) {
      hasAutoSelectedRef.current = true
      onSelectedEventIdChange(soonestUpcoming.id)
    }
  }, [events, selectedEventId, onSelectedEventIdChange])

  const handleRowClick = useCallback(
    (event: TournamentEvent) => {
      if (!onSelectedEventIdChange) return
      onSelectedEventIdChange(selectedEventId === event.id ? null : event.id)
    },
    [selectedEventId, onSelectedEventIdChange],
  )

  const handleTimelineEventClick = useCallback(
    (event: TournamentEvent) => {
      onSelectedEventIdChange?.(event.id)
      setTimelineScrollKey(key => key + 1)
    },
    [onSelectedEventIdChange],
  )

  const columns: ColumnDef<TournamentEvent>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        id: 'schedule',
        header: 'Schedule',
        size: 176,
        cell: ({ row }) => formatSchedule(row.original._rawStartTime, row.original._rawEndTime),
      },
      {
        accessorKey: 'format',
        header: 'Format',
        size: 112,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn(
                'h-2 w-2 shrink-0 translate-y-px rounded-full',
                getFormatDotColor(row.original.format),
              )}
            />
            {row.original.format}
          </span>
        ),
      },
      {
        id: 'entryFee',
        header: 'Entry Fee',
        size: 86,
        cell: ({ row }) => {
          const fee = entryFees[row.original.id]
          return <span className="text-muted-foreground">{fee ?? '...'}</span>
        },
      },
      {
        accessorKey: 'totalPlayers',
        header: 'Players',
        size: 84,
        cell: ({ row }) => {
          const total = row.original.totalPlayers ?? 0
          const min = row.original.minimumPlayers ?? 0
          const pct = min > 0 ? Math.min(1, total / min) : 0
          const r = 6
          const circ = 2 * Math.PI * r
          const filled = circ * pct
          return (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="text-right tabular-nums"
                style={{ width: `${playersDigitsWidth}ch` }}
              >
                {total}
              </span>
              <span className="text-muted-foreground">/ {min}</span>
              <svg width="16" height="16" className="-rotate-90 shrink-0">
                <circle
                  cx="8"
                  cy="8"
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-border"
                />
                <circle
                  cx="8"
                  cy="8"
                  r={r}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${filled} ${circ - filled}`}
                  className={
                    pct >= 1
                      ? 'text-green-500'
                      : pct >= 0.5
                        ? 'text-blue-500'
                        : 'text-muted-foreground'
                  }
                />
              </svg>
            </span>
          )
        },
      },
      {
        accessorKey: 'totalRounds',
        header: 'Rounds',
        size: 84,
        cell: ({ row }) => (
          <RoundsCell event={row.original} roundsDigitsWidth={roundsDigitsWidth} />
        ),
      },
    ],
    [entryFees, playersDigitsWidth, roundsDigitsWidth],
  )

  const errorMessage =
    error == null ? null : typeof error === 'string' ? error : error.message || String(error)

  return (
    <div
      className={cn(
        'videre-ui -mt-10 flex h-[calc(100vh-1rem)] flex-col overflow-hidden font-sans',
        className,
      )}
      data-ui-layout="events"
    >
      <EventsTimeline
        events={timelineData}
        focusedEventId={hoveredEventId ?? selectedEvent?.id ?? null}
        activeEventIds={activeEventIdSet}
        onEventClick={handleTimelineEventClick}
      />

      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-1.5 pt-2">
          {errorMessage ? (
            <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
              Error loading events: {errorMessage}
            </div>
          ) : null}

          {loading && events.length === 0 ? (
            <div className="rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sidebar-border/60 bg-muted/50">
                    {columns.map((col, i) => (
                      <th
                        key={i}
                        className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                      >
                        {typeof col.header === 'string' ? col.header : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <TableBodySkeleton rows={10} columns={columns.length} />
                </tbody>
              </table>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={events}
              autoResetPageIndex={false}
              containerClassName="flex min-h-0 flex-1 flex-col"
              tableContainerClassName="flex min-h-0 flex-1 flex-col overflow-visible"
              bodyWrapperClassName="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
              onRowHover={event => onHoveredEventIdChange?.(event.id)}
              onRowLeave={() => onHoveredEventIdChange?.(null)}
              onRowClick={handleRowClick}
              onPageRowsChange={onPageRowsChange}
              getRowClassName={event =>
                cn(
                  event.id !== selectedEventId &&
                    event._rawStartTime &&
                    new Date(event._rawStartTime).getTime() < Date.now() &&
                    'opacity-60',
                  selectedEvent?.id === event.id &&
                    'outline outline-1 outline-white/80 -outline-offset-1 bg-muted/50',
                )
              }
              activeRowId={selectedEvent?.id ?? null}
              activeRowScrollKey={timelineScrollKey}
              getRowId={event => event.id}
            />
          )}
        </div>

        <EventDetailPanel
          event={selectedEvent}
          entryFee={selectedEventDetails?.entryFee}
          prizes={selectedEventDetails?.prizes}
          detailsLoading={selectedEventDetails?.loading}
          onClose={() => onSelectedEventIdChange?.(null)}
          onViewTournament={onViewTournament}
        />
      </div>
    </div>
  )
}
