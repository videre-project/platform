/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ColumnDef } from '@tanstack/react-table'
import { Pencil, X } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '../primitives/Badge'
import { DatePickerWithRange } from '../components/date/DatePickerWithRange'
import { GameTypeFormatFilter } from '../components/filters/GameTypeFormatFilter'
import { DataTable } from '../components/tables/DataTable'
import { DataTablePagination } from '../components/tables/DataTablePagination'
import { TableBodySkeleton } from '../components/tables/TableBodySkeleton'
import { cn } from '../lib/cn'
import type { HistoryLayoutProps, MatchHistoryItem } from '../types/history'
import { DeckManaSymbols } from '../components/cards/DeckManaSymbols'
import { ObservedOpponentCard } from '../components/match/OpponentArchetypePicker'
import { Button } from '../primitives/Button'

function formatDate(dateString?: string) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MatchResultPill({ result, isActive }: { result: string; isActive?: boolean }) {
  const inProgress = isActive || result === 'In Progress'
  const variant = inProgress
    ? 'secondary'
    : result === 'Win'
      ? 'default'
      : result === 'Loss'
        ? 'destructive'
        : 'secondary'

  return (
    <Badge
      variant={variant}
      className={cn(
        'rounded-md capitalize',
        inProgress &&
          'border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
      )}
    >
      {inProgress ? 'In Progress' : result}
    </Badge>
  )
}

function OpponentSummary({ match, renderEditor }: { match: MatchHistoryItem; renderEditor?: HistoryLayoutProps['renderOpponentArchetype'] }) {
  if (match.isEvent) {
    return <span className="text-muted-foreground">-</span>
  }

  const opponentName = match.opponentName?.trim()
  const opponentDeckLabel =
    match.opponentDeckArchetype?.trim() || match.opponentDeckName?.trim() || 'Deck unknown'

  const label = <><span className="truncate">{opponentDeckLabel}</span><DeckManaSymbols colors={match.opponentDeckColors} className="shrink-0 translate-y-px" /></>
  const trigger = <button type="button" aria-label={`Classify opponent in match ${match.id}`}
    onClick={event => event.stopPropagation()} className="group/classify mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded text-left text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring">
    {label}<Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover/classify:opacity-100 group-focus-visible/classify:opacity-100" />
  </button>
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">
        {opponentName ? `vs ${opponentName}` : 'Opponent unknown'}
      </div>
      {renderEditor ? renderEditor(match, trigger) : <div className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">{label}</div>}
      {match.opponentCards && <div aria-label="Observed opponent cards" className="mt-2 flex gap-1 overflow-hidden">
        {match.opponentCards.slice(0, 7).map(card => <ObservedOpponentCard key={card.name} card={card} compact />)}
        {!match.opponentCards.length && <span className="text-[11px] text-muted-foreground">No opponent cards recorded</span>}
      </div>}
    </div>
  )
}

const columns: ColumnDef<MatchHistoryItem>[] = [
  {
    accessorKey: 'eventName',
    header: 'Event',
    minSize: 160,
    cell: ({ row }) => <span className="inline-grid min-w-0 gap-0.5">
      <span className="truncate">{row.depth ? `Match ${row.index + 1}` : row.original.eventName}</span>
      {row.original.isEvent && <span className="text-xs text-muted-foreground">{row.original.matches?.length ?? 0} matches</span>}
    </span>,
  },
  {
    accessorKey: 'format',
    header: 'Format',
    size: 104,
    minSize: 104,
  },
  {
    accessorKey: 'deckName',
    header: 'Deck',
    minSize: 168,
    cell: ({ row }) => {
      const deckName = row.original.deckName?.trim()
      if (!deckName) {
        return <span className="italic text-muted-foreground">Unknown</span>
      }

      return (
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{deckName}</div>
          <div className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
            <span className="truncate">{row.original.deckArchetype?.trim() || 'Unclassified deck'}</span>
            <DeckManaSymbols colors={row.original.deckColors} className="shrink-0 translate-y-px" />
          </div>
        </div>
      )
    },
  },
  {
    id: 'opponent',
    header: 'Opponent',
    size: 180,
    minSize: 180,
    cell: ({ row }) => <OpponentSummary match={row.original} />,
  },
  {
    accessorKey: 'startTime',
    header: 'Date',
    size: 152,
    minSize: 152,
    cell: ({ row }) => formatDate(row.original.startTime),
  },
  {
    accessorKey: 'result',
    header: 'Result',
    size: 112,
    minSize: 112,
    cell: ({ row }) => (
      <MatchResultPill result={row.original.result} isActive={row.original.isActive} />
    ),
  },
  {
    accessorKey: 'record',
    header: 'Record',
    size: 72,
    minSize: 72,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.record}</span>,
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    size: 88,
    minSize: 88,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{row.original.duration}</span>,
  },
]

const DATE_PRESETS = [
  { label: 'All Time', getValue: () => undefined },
  {
    label: 'Today',
    getValue: () => {
      const today = new Date()
      return { from: today, to: today }
    },
  },
  {
    label: 'Last 7 Days',
    getValue: () => {
      const today = new Date()
      const prev = new Date()
      prev.setDate(today.getDate() - 7)
      return { from: prev, to: today }
    },
  },
  {
    label: 'Last 30 Days',
    getValue: () => {
      const today = new Date()
      const prev = new Date()
      prev.setDate(today.getDate() - 30)
      return { from: prev, to: today }
    },
  },
]

export function HistoryLayout({
  items,
  loading = false,
  error = null,
  gameType,
  onGameTypeChange,
  selectedFormat,
  formats,
  onFormatChange,
  dateRange,
  onDateRangeChange,
  onRowClick,
  pagination,
  renderOpponentArchetype,
  reviewLabel,
  onClearReview,
  className,
}: HistoryLayoutProps) {
  // TanStack renders cell functions as components; replacing one closes its editor.
  const displayedColumns = useMemo(() => columns.map(column => column.id === 'opponent'
    ? { ...column, size: reviewLabel ? 280 : 180, minSize: reviewLabel ? 280 : 180,
      cell: ({ row }: { row: { original: MatchHistoryItem } }) => <OpponentSummary match={row.original} renderEditor={renderOpponentArchetype} /> }
    : column), [renderOpponentArchetype, reviewLabel])
  const errorMessage =
    error == null ? null : typeof error === 'string' ? error : error.message || String(error)

  return (
    <div
      className={cn(
        'videre-ui flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-hidden px-4 pb-4 pt-1 font-sans',
        className,
      )}
      data-ui-layout="history"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <GameTypeFormatFilter
            gameType={gameType}
            onGameTypeChange={onGameTypeChange}
            selectedFormat={selectedFormat}
            formats={formats}
            onFormatChange={onFormatChange}
          />
        </div>

        <DatePickerWithRange
          date={dateRange}
          setDate={onDateRangeChange}
          size="sm"
          className="ml-auto justify-start border-dashed border-sidebar-border/60 text-left font-normal"
          presets={DATE_PRESETS}
        />
      </div>
      {reviewLabel && <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <span>{reviewLabel}</span><Button variant="ghost" size="icon" onClick={onClearReview} aria-label="Clear review filters" className="h-6 w-6"><X className="h-3.5 w-3.5" /></Button>
      </div>}

      {errorMessage ? (
        <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
          Error loading history: {errorMessage}
        </div>
      ) : loading && items.length === 0 ? (
        <div className="min-h-0 overflow-hidden rounded-md border border-sidebar-border/60">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sidebar-border/60 bg-muted/50">
                {displayedColumns.map((col, i) => (
                  <th
                    key={i}
                    className="h-10 px-4 text-left align-middle text-sm font-medium text-muted-foreground"
                  >
                    {typeof col.header === 'string' ? col.header : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableBodySkeleton rows={15} columns={displayedColumns.length} />
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <DataTable
            columns={displayedColumns}
            data={items}
            getSubRows={row => row.matches}
            defaultExpanded={false}
            manualPagination={!!pagination}
            getRowId={row => `${row.isEvent ? 'event' : 'match'}-${row.isEvent ? row.eventId : row.id}`}
            onRowClick={onRowClick}
            containerClassName="flex min-h-0 flex-1 flex-col"
            tableContainerClassName="flex min-h-0 flex-1 flex-col"
            bodyWrapperClassName="min-h-0 flex-1 overflow-auto"
          />

          {pagination && <DataTablePagination pagination={pagination}
            summary={`${pagination.totalCount} results`} disabled={loading} />}
        </div>
      )}
    </div>
  )
}
