/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, MessageSquare, ReceiptText } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/Card'
import { Skeleton } from '../../primitives/Skeleton'
import type { TradeHistoryDetail as TradeHistoryDetailData, TradeHistoryItem } from '../../types/trade'
import { formatTradeResult, formatTradeTimestamp, titleForTrade } from './TradeHistoryTable'

function ItemList({ title, items, direction }: {
  title: string
  items: TradeHistoryItem[]
  direction: 'out' | 'in'
}) {
  const Icon = direction === 'out' ? ArrowUpFromLine : ArrowDownToLine
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-muted-foreground" />{title}</div>
      {items.length === 0 ? (
        <p className="rounded-md bg-muted/15 px-3 py-2 text-sm text-muted-foreground">No items recorded.</p>
      ) : (
        <div className="rounded-md border border-sidebar-border/60">
          {items.map(item => (
            <div key={`${item.role}-${item.catalogId}`} className="flex items-center justify-between border-b border-sidebar-border/60 px-3 py-2 text-sm last:border-b-0">
              <span className="min-w-0 pr-3">
                <span className="block truncate">{item.name || `Catalog ${item.catalogId}`}</span>
                {item.name ? (
                  <span className="block truncate text-xs capitalize text-muted-foreground">
                    Catalog {item.catalogId}
                    {item.setCode ? ` · ${item.setCode}` : ''}
                    {item.rarity ? ` · ${item.rarity}` : ''}
                    {item.objectType ? ` · ${item.objectType}` : ''}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-medium">{item.quantity.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export interface TradeHistoryDetailProps {
  selectedId: number | null
  detail: TradeHistoryDetailData | null
  loading?: boolean
  error?: string | null
}

export function TradeHistoryDetail({ selectedId, detail, loading = false, error }: TradeHistoryDetailProps) {
  const selected = detail?.summary.id === selectedId ? detail : null
  const outgoing = selected?.items.filter(item => item.role === 'LocalOffer') ?? []
  const incoming = selected?.items.filter(item => item.role === (selected.summary.kind === 'Player' ? 'RemoteOffer' : 'InferredOutput')) ?? []

  return (
    <Card className="flex min-h-[22rem] min-w-0 flex-col overflow-hidden border-sidebar-border/60 bg-card/80 lg:min-h-0">
      {loading && !selected ? (
        <div className="space-y-4 p-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : error ? (
        <div className="p-4 text-sm text-red-700 dark:text-red-300">{error}</div>
      ) : selected ? (
        <>
          <CardHeader className="shrink-0 border-b border-sidebar-border/60 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate text-base">{titleForTrade(selected.summary)}</CardTitle>
                <CardDescription>{formatTradeTimestamp(selected.summary.startedAt)} · {formatTradeResult(selected.summary.result)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent
            aria-label="Trade details"
            className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            role="region"
            tabIndex={0}
          >
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md bg-muted/15 p-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">State</dt><dd className="font-medium">{selected.summary.stateName || selected.summary.state}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Escrow</dt><dd className="font-medium">{selected.summary.escrowId || 'Not assigned'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Started</dt><dd>{formatTradeTimestamp(selected.summary.startedAt)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Closed</dt><dd>{formatTradeTimestamp(selected.summary.closedAt)}</dd></div>
            </dl>
            <ItemList title="Given" items={outgoing} direction="out" />
            <ItemList title="Received" items={incoming} direction="in" />
            {selected.errors.length > 0 ? (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-destructive" />Errors</h3>
                {selected.errors.map(item => <div key={item.id} className="rounded-md bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-200">{item.errorName || `Trade error ${item.errorCode}`}</div>)}
              </section>
            ) : null}
            {selected.messages.length > 0 ? (
              <section className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4 text-muted-foreground" />Chat</h3>
                <div className="space-y-2 rounded-md border border-sidebar-border/60 p-3">
                  {selected.messages.map(message => <div key={message.id} className="text-sm"><span className="font-medium">{message.senderName || 'MTGO'}: </span><span className="text-muted-foreground">{message.text}</span></div>)}
                </div>
              </section>
            ) : null}
          </CardContent>
        </>
      ) : (
        <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
          <ReceiptText className="h-8 w-8 opacity-50" />
          <p>Select a recorded escrow to inspect its items, chat, and errors.</p>
        </div>
      )}
    </Card>
  )
}
