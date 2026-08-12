/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { TradeHistoryDetail } from '../components/trades/TradeHistoryDetail'
import { TradeHistoryTable } from '../components/trades/TradeHistoryTable'
import { TradeHistoryToolbar } from '../components/trades/TradeHistoryToolbar'
import { cn } from '../lib/cn'
import type { TradeHistoryLayoutProps } from '../types/trade'

export function TradeHistoryLayout({
  trades,
  selectedId,
  detail,
  onSelectedIdChange,
  search,
  kind,
  result,
  onSearchChange,
  onKindChange,
  onResultChange,
  onClearFilters,
  filtersDisabled = false,
  loading = false,
  loadingMore = false,
  detailLoading = false,
  error,
  detailError,
  hasMore = false,
  onLoadMore,
  className,
}: TradeHistoryLayoutProps) {
  return (
    <section className={cn('videre-ui flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-background font-sans text-foreground', className)} data-ui-layout="trade-history">
      {error ? <div className="rounded-md border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300">Error loading trade history: {error}</div> : null}
      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-[minmax(0,3fr)_minmax(22rem,2fr)] lg:overflow-visible">
        <div className="flex min-h-[22rem] min-w-0 flex-col gap-3 lg:min-h-0">
          <TradeHistoryToolbar
            search={search}
            kind={kind}
            result={result}
            onSearchChange={onSearchChange}
            onKindChange={onKindChange}
            onResultChange={onResultChange}
            onClear={onClearFilters}
            disabled={filtersDisabled || loading}
          />
          <TradeHistoryTable
            trades={trades}
            selectedId={selectedId}
            onSelectedIdChange={onSelectedIdChange}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
          />
        </div>
        <TradeHistoryDetail selectedId={selectedId} detail={detail} loading={detailLoading} error={detailError} />
      </div>
    </section>
  )
}
