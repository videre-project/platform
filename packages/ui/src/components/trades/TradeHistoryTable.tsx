/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Loader2 } from 'lucide-react'

import { Badge } from '../../primitives/Badge'
import { Button } from '../../primitives/Button'
import { Skeleton } from '../../primitives/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../primitives/Table'
import type { TradeEscrowResult, TradeHistorySummary } from '../../types/trade'
import { cn } from '../../lib/cn'
import { VanguardAvatar } from '../cards/VanguardAvatar'

export function formatTradeTimestamp(value?: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function titleForTrade(trade: TradeHistorySummary) {
  if (trade.kind === 'Player') return trade.partnerName || 'Player trade'
  return trade.productName || 'Product escrow'
}

export function formatTradeResult(result: TradeEscrowResult) {
  return result.replace(/([a-z])([A-Z])/g, '$1 $2')
}

export function TradeResultBadge({ result }: { result: TradeEscrowResult }) {
  const variant = result === 'Failed' ? 'destructive' : 'secondary'
  return (
    <Badge
      variant={variant}
      className={cn(
        'rounded-md px-1.5 text-xs capitalize',
        result === 'Completed' && 'border-transparent bg-green-700 text-white hover:bg-green-700/90 dark:bg-green-800 dark:text-green-50 dark:hover:bg-green-800/90',
        result === 'InProgress' && 'border-yellow-500/30 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
      )}
    >
      {formatTradeResult(result)}
    </Badge>
  )
}

function EffectSummary({ quantity, catalogCount, direction }: {
  quantity: number
  catalogCount: number
  direction: 'out' | 'in'
}) {
  if (quantity <= 0 || catalogCount <= 0) return <span className="text-muted-foreground">—</span>
  const sign = direction === 'out' ? '-' : '+'
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      title={`${quantity.toLocaleString()} items across ${catalogCount.toLocaleString()} catalog ${catalogCount === 1 ? 'entry' : 'entries'}`}
    >
      <span className="font-medium tabular-nums">{sign}{quantity.toLocaleString()}</span>
    </span>
  )
}

function TradePartyAvatar({ trade }: { trade: TradeHistorySummary }) {
  if (trade.kind !== 'Player') return <span aria-hidden="true" className="block h-7 w-7 shrink-0" />
  const name = trade.partnerName || 'Player trade'
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?'

  const fallback = (
    <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-foreground/80">
      {initials}
    </span>
  )

  if (trade.partnerAvatar) {
    return (
      <VanguardAvatar
        catalogId={trade.partnerAvatar.productCatalogId}
        name={trade.partnerAvatar.productName}
        imageUrl={trade.partnerAvatar.productImageUrl}
        alt={`${name} avatar`}
        title={`${name} — ${trade.partnerAvatar.productName}`}
        className="h-7 w-7 shrink-0 rounded border border-sidebar-border/70"
        fallback={fallback}
      />
    )
  }

  return (
    <span
      aria-label={`${name} avatar`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-sidebar-border/70 bg-muted/45 text-[10px] font-semibold text-foreground/80"
      title={name}
    >
      {fallback}
    </span>
  )
}

function HistoryListSkeleton() {
  return <div className="space-y-1 p-2">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
}

export interface TradeHistoryTableProps {
  trades: TradeHistorySummary[]
  selectedId: number | null
  onSelectedIdChange: (id: number) => void
  loading?: boolean
  loadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}

export function TradeHistoryTable({
  trades,
  selectedId,
  onSelectedIdChange,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
}: TradeHistoryTableProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-muted/10">
      <div className="min-h-0 flex-1 overflow-hidden">
        {loading && trades.length === 0 ? <HistoryListSkeleton /> : trades.length === 0 ? (
          <div className="flex h-full min-h-40 items-center justify-center px-4 text-sm text-muted-foreground">
            No trade escrows have been recorded yet.
          </div>
        ) : (
          <Table wrapperClassName="overflow-x-hidden">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Trade</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Given</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map(trade => {
                const selected = trade.id === selectedId
                const title = titleForTrade(trade)
                return (
                  <TableRow
                    key={trade.id}
                    aria-selected={selected}
                    className={cn(
                      'cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
                      selected && 'bg-muted/45 hover:bg-muted/55',
                    )}
                    onClick={() => onSelectedIdChange(trade.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectedIdChange(trade.id)
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2">
                        <TradePartyAvatar trade={trade} />
                        <div className="min-w-0">
                          <div className="max-w-40 truncate font-medium" title={title}>{title}</div>
                          <div className="text-xs text-muted-foreground">
                            {trade.escrowId ? `Escrow ${trade.escrowId}` : ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatTradeTimestamp(trade.startedAt)}</TableCell>
                    <TableCell><EffectSummary quantity={trade.outgoingQuantity} catalogCount={trade.outgoingCatalogCount} direction="out" /></TableCell>
                    <TableCell><EffectSummary quantity={trade.incomingQuantity} catalogCount={trade.incomingCatalogCount} direction="in" /></TableCell>
                    <TableCell><TradeResultBadge result={trade.result} /></TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {hasMore ? (
        <div className="shrink-0 border-t border-sidebar-border/60 p-3 text-center">
          <Button variant="outline" onClick={onLoadMore} disabled={loadingMore || !onLoadMore} size="sm">
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Load older trades
          </Button>
        </div>
      ) : null}
    </div>
  )
}
