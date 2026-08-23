/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ColumnDef } from '@tanstack/react-table'

import { Badge } from '../primitives/Badge'
import { Button } from '../primitives/Button'
import { DatePickerWithRange } from '../components/date/DatePickerWithRange'
import { GameTypeFormatFilter } from '../components/filters/GameTypeFormatFilter'
import { DataTable } from '../components/tables/DataTable'
import { TableBodySkeleton } from '../components/tables/TableBodySkeleton'
import { cn } from '../lib/cn'
import type { HistoryLayoutProps, MatchHistoryItem } from '../types/history'
import { getDisplayCardColors } from '../utils/card-colors'
import { getManaSymbolSvgPath } from '../utils/mana-symbols'

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

function DeckManaSymbols({ colors }: { colors?: string[] | null }) {
  if (!colors) return null

  const visibleColors = getDisplayCardColors(colors)

  return (
    <span className="inline-flex h-4 translate-y-px items-center gap-0.5 leading-none">
      {visibleColors.map((color, index) => (
        <img
          key={`${color}-${index}`}
          src={getManaSymbolSvgPath(color) ?? undefined}
          alt={color}
          className="block h-3.5 w-3.5 rounded-full bg-background shadow-sm ring-1 ring-background"
        />
      ))}
    </span>
  )
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

function OpponentSummary({ match }: { match: MatchHistoryItem }) {
  if (match.isEvent) {
    return <span className="text-muted-foreground">-</span>
  }

  const opponentName = match.opponentName?.trim()
  const opponentDeckLabel =
    match.opponentDeckArchetype?.trim() || match.opponentDeckName?.trim() || 'Deck unknown'

  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">
        {opponentName ? `vs ${opponentName}` : 'Opponent unknown'}
      </div>
      <div className="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground">
        <span className="truncate">{opponentDeckLabel}</span>
        <DeckManaSymbols colors={match.opponentDeckColors} />
      </div>
    </div>
  )
}

const columns: ColumnDef<MatchHistoryItem>[] = [
  {
    accessorKey: 'eventName',
    header: 'Event',
  },
  {
    accessorKey: 'format',
    header: 'Format',
    size: 120,
  },
  {
    accessorKey: 'deckName',
    header: 'Deck',
    cell: ({ row }) => {
      const deckName = row.original.deckName
      if (!deckName) {
        return <span className="italic text-muted-foreground">Unknown</span>
      }

      return (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="truncate">{deckName}</span>
          <DeckManaSymbols colors={row.original.deckColors} />
        </span>
      )
    },
  },
  {
    id: 'opponent',
    header: 'Opponent',
    size: 190,
    cell: ({ row }) => <OpponentSummary match={row.original} />,
  },
  {
    accessorKey: 'startTime',
    header: 'Date',
    size: 140,
    cell: ({ row }) => formatDate(row.original.startTime),
  },
  {
    accessorKey: 'result',
    header: 'Result',
    size: 80,
    cell: ({ row }) => (
      <MatchResultPill result={row.original.result} isActive={row.original.isActive} />
    ),
  },
  {
    accessorKey: 'record',
    header: 'Record',
    size: 80,
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    size: 70,
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
  onPreviousPage,
  onNextPage,
  className,
}: HistoryLayoutProps) {
  const errorMessage =
    error == null ? null : typeof error === 'string' ? error : error.message || String(error)

  return (
    <div
      className={cn(
        'videre-ui w-full space-y-4 px-4 pb-4 pt-1 font-sans',
        className,
      )}
      data-ui-layout="history"
    >
      <div className="flex flex-wrap items-center justify-start gap-2">
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

      {errorMessage ? (
        <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
          Error loading history: {errorMessage}
        </div>
      ) : loading && items.length === 0 ? (
        <div className="rounded-md border border-sidebar-border/60">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sidebar-border/60 bg-muted/50">
                {columns.map((col, i) => (
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
              <TableBodySkeleton rows={15} columns={columns.length} />
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={items}
            getSubRows={row => row.matches}
            onRowClick={onRowClick}
          />

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount}{' '}
                matches)
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPreviousPage}
                  disabled={pagination.page <= 1 || loading || !onPreviousPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNextPage}
                  disabled={pagination.page >= pagination.totalPages || loading || !onNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
