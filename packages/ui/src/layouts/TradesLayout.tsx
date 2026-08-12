/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useRef, type ElementType } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Handshake,
  History,
  Loader2,
  Package,
  Search,
  Users,
  X,
} from 'lucide-react'

import { Badge } from '../primitives/Badge'
import { Button } from '../primitives/Button'
import { Card, CardContent } from '../primitives/Card'
import { Input } from '../primitives/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../primitives/Select'
import { Skeleton } from '../primitives/Skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../primitives/Table'
import { cn } from '../lib/cn'
import { HighlightedText } from '../utils/highlighted-text'
import { GameLogText } from '../utils/parse-game-log'
import type {
  TradePartner,
  TradePost,
  TradePostFormatFilter,
  TradeView,
  TradesLayoutProps,
} from '../types/trades-page'

const MARKETPLACE_PAGE_SIZE = 20

function EmptyState({ children }: { children: string }) {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-md bg-muted/10 px-4 py-8 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function TradeMessage({
  message,
  className,
  highlightText,
}: {
  message: string
  className?: string
  highlightText?: string
}) {
  return (
    <GameLogText
      text={message}
      className={className}
      manaSymbolClassName="inline h-3.5 w-3.5 align-text-bottom mx-px"
      highlightText={highlightText}
    />
  )
}

function formatTradePostStatus(post: TradePost | null | undefined) {
  if (!post) return 'None'
  return post.format || 'Active'
}

function formatTradePartner(partner: TradePartner | null | undefined) {
  if (!partner) return 'None'
  if (partner.posterName) return partner.posterName
  return 'Unknown partner'
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | string
  icon: ElementType
}) {
  return (
    <Card className="border-sidebar-border/60 bg-card/80">
      <CardContent className="flex min-h-12 items-center gap-3 px-3 py-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/35 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs leading-4 text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-semibold leading-5" title={String(value)}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton({ icon: Icon }: { icon: ElementType }) {
  return (
    <Card className="border-sidebar-border/60 bg-card/80">
      <CardContent className="flex min-h-12 items-center gap-3 px-3 py-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/35">
          <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-24 max-w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function TradePartnersSkeleton() {
  return (
    <section className="space-y-3">
      <div className="grid gap-2 md:grid-cols-3">
        <StatCardSkeleton icon={Users} />
        <StatCardSkeleton icon={Handshake} />
        <StatCardSkeleton icon={Package} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
    </section>
  )
}

function MarketplaceTableHeader() {
  return (
    <Table className="table-fixed" wrapperClassName="overflow-hidden">
      <TableHeader>
        <TableRow>
          <TableHead className="w-44">Poster</TableHead>
          <TableHead className="w-36">Format</TableHead>
          <TableHead>Message</TableHead>
        </TableRow>
      </TableHeader>
    </Table>
  )
}

function MarketplaceTableSkeleton({
  rows = MARKETPLACE_PAGE_SIZE,
  className,
}: {
  rows?: number
  className?: string
}) {
  const rowWidths = [
    ['w-24', 'w-28', 'w-11/12'],
    ['w-32', 'w-20', 'w-4/5'],
    ['w-20', 'w-28', 'w-10/12'],
    ['w-28', 'w-20', 'w-3/4'],
    ['w-24', 'w-28', 'w-5/6'],
  ]

  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden rounded-md bg-muted/10', className)}>
      <MarketplaceTableHeader />
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <Table className="table-fixed" wrapperClassName="overflow-visible">
          <TableBody>
            {Array.from({ length: rows }).map((_, index) => {
              const widths = rowWidths[index % rowWidths.length]
              return (
                <TableRow key={index}>
                  <TableCell className="w-44">
                    <Skeleton className={`h-5 ${widths[0]}`} />
                  </TableCell>
                  <TableCell className="w-36">
                    <Skeleton className={`h-5 ${widths[1]}`} />
                  </TableCell>
                  <TableCell>
                    <Skeleton className={`h-5 ${widths[2]}`} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MarketplaceSkeleton() {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-[180px_160px_minmax(190px,1fr)_96px]">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <MarketplaceTableSkeleton className="min-h-0 flex-1" />
      <div className="flex shrink-0 items-center justify-end gap-6 px-2">
        <Skeleton className="h-4 w-[110px]" />
        <div className="flex items-center space-x-2">
          <Skeleton className="hidden h-8 w-8 lg:block" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="hidden h-8 w-8 lg:block" />
        </div>
      </div>
    </section>
  )
}

function TradeViewTabs({
  value,
  onValueChange,
}: {
  value: TradeView
  onValueChange: (value: TradeView) => void
}) {
  const tabs = [
    { value: 'marketplace' as const, label: 'Marketplace', icon: Package },
    { value: 'partners' as const, label: 'Trade Partners', icon: Users },
    { value: 'history' as const, label: 'Trade History', icon: History },
  ]

  return (
    <div
      aria-label="Trade view"
      className="inline-flex h-10 shrink-0 items-stretch gap-1"
      role="tablist"
    >
      {tabs.map(({ value: tabValue, label, icon: Icon }) => (
        <button
          aria-selected={value === tabValue}
          className={cn(
            '-mb-px inline-flex h-10 items-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors',
            value === tabValue
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground',
          )}
          key={tabValue}
          onClick={() => onValueChange(tabValue)}
          role="tab"
          type="button"
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Trades page presentation: marketplace, partners, and a history slot.
 * Host owns data hooks, debounce, and pagination page state.
 */
export function TradesLayout({
  activeView,
  onActiveViewChange,
  historyContent,
  posts,
  postsLoading = false,
  postsError,
  postsPagination = null,
  postsPage,
  onPostsPageChange,
  postFormat,
  onPostFormatChange,
  userSearch,
  onUserSearchChange,
  messageSearch,
  onMessageSearchChange,
  debouncedUserSearch = '',
  debouncedMessageSearch = '',
  onClearPostFilters,
  tradePartners = [],
  currentTrade = null,
  myPost = null,
  tradesLoading = false,
  tradesError,
  hasTradesSnapshot = false,
  clientReady = true,
  className,
}: TradesLayoutProps) {
  const marketplaceRowsRef = useRef<HTMLDivElement>(null)

  const lastTradePartner = formatTradePartner(tradePartners[0])
  const filtersActive =
    postFormat !== 'all' || userSearch.trim().length > 0 || messageSearch.trim().length > 0
  const showPageSkeleton =
    activeView === 'marketplace' && (!clientReady || (tradesLoading && !hasTradesSnapshot))
  const showPartnersSkeleton = tradesLoading && !hasTradesSnapshot
  const showPostsTableSkeleton = postsLoading && !postsPagination

  useEffect(() => {
    if (marketplaceRowsRef.current) {
      marketplaceRowsRef.current.scrollTop = 0
    }
  }, [posts, postsPagination?.page])

  const clearFilters = () => {
    if (onClearPostFilters) {
      onClearPostFilters()
      return
    }
    onPostFormatChange('all')
    onUserSearchChange('')
    onMessageSearchChange('')
  }

  return (
    <div
      className={cn(
        'videre-ui flex h-[calc(100vh-2.5rem)] min-h-0 min-w-0 flex-col gap-3 overflow-hidden px-4 pb-4 pt-1 font-sans',
        className,
      )}
      data-ui-layout="trades"
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-sidebar-border/70">
        <TradeViewTabs value={activeView} onValueChange={onActiveViewChange} />
        {activeView === 'marketplace' && postsLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {activeView !== 'history' && !showPageSkeleton && tradesError && (
        <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
          Error loading trades: {tradesError}
        </div>
      )}

      {activeView === 'marketplace' && !showPageSkeleton && postsError && (
        <div className="rounded-md bg-destructive/15 px-4 py-3 text-sm font-medium text-destructive">
          Error loading trade posts: {postsError}
        </div>
      )}

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          activeView !== 'history' && 'hidden',
        )}
      >
        {historyContent}
      </div>

      {activeView !== 'history' &&
        (activeView === 'partners' ? (
          showPartnersSkeleton ? (
            <TradePartnersSkeleton />
          ) : (
            <section className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              <div className="grid gap-2 md:grid-cols-3">
                <StatCard label="Last Trade" value={lastTradePartner} icon={Users} />
                <StatCard
                  label="Current Trade"
                  value={currentTrade ? 'Active' : 'None'}
                  icon={Handshake}
                />
                <StatCard label="Trade Post" value={formatTradePostStatus(myPost)} icon={Package} />
              </div>
              {tradePartners.length === 0 ? (
                <EmptyState>No previous trade partners are currently available.</EmptyState>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tradePartners.map((partner, index) => (
                    <Badge
                      className="rounded-md"
                      key={`${formatTradePartner(partner)}-${partner.lastTradeTime ?? index}`}
                      variant="outline"
                    >
                      {formatTradePartner(partner)}
                    </Badge>
                  ))}
                </div>
              )}
            </section>
          )
        ) : showPageSkeleton ? (
          <MarketplaceSkeleton />
        ) : (
          <section className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="grid gap-2 lg:grid-cols-[180px_160px_minmax(190px,1fr)_96px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={event => onUserSearchChange(event.target.value)}
                  disabled={!clientReady}
                  placeholder="Search users"
                  className="h-9 pl-9"
                />
              </div>
              <Select
                value={postFormat}
                onValueChange={value => onPostFormatChange(value as TradePostFormatFilter)}
                disabled={!clientReady}
              >
                <SelectTrigger className="h-9" aria-label="Post type">
                  <SelectValue placeholder="Post type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All post types</SelectItem>
                  <SelectItem value="message">Message posts</SelectItem>
                  <SelectItem value="offeredWantedList">Wanted/offered lists</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={messageSearch}
                  onChange={event => onMessageSearchChange(event.target.value)}
                  disabled={!clientReady}
                  placeholder="Search messages"
                  className="h-9 pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={!filtersActive || postsLoading}
                className="h-9 gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>

            {showPostsTableSkeleton ? (
              <MarketplaceTableSkeleton className="min-h-0 flex-1" />
            ) : posts.length === 0 ? (
              <div className="flex min-h-0 flex-1 items-center justify-center rounded-md bg-muted/10 px-4 py-8 text-sm text-muted-foreground">
                <span>
                  {filtersActive
                    ? 'No marketplace posts match the current filters.'
                    : 'No marketplace posts are currently available.'}
                </span>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-muted/10">
                <MarketplaceTableHeader />
                <div
                  ref={marketplaceRowsRef}
                  className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
                >
                  <Table className="table-fixed" wrapperClassName="overflow-visible">
                    <TableBody>
                      {posts.map((post, index) => (
                        <TableRow key={`${post.posterName}-${index}`}>
                          <TableCell className="w-44 font-medium">
                            <HighlightedText
                              text={post.posterName || 'Unknown'}
                              highlight={debouncedUserSearch}
                            />
                          </TableCell>
                          <TableCell className="w-36 font-medium text-foreground/85">
                            {post.format || '-'}
                          </TableCell>
                          <TableCell
                            className="max-w-0 truncate whitespace-nowrap align-middle text-muted-foreground"
                            title={post.message ?? undefined}
                          >
                            {post.message ? (
                              <TradeMessage
                                message={post.message}
                                className="block truncate whitespace-nowrap leading-5"
                                highlightText={debouncedMessageSearch}
                              />
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex shrink-0 items-center justify-end gap-6 px-2">
              <div className="flex min-w-[110px] items-center justify-center text-sm font-medium">
                Page {postsPagination?.page ?? postsPage} of {postsPagination?.totalPages ?? 1}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => onPostsPageChange(1)}
                  disabled={!postsPagination?.hasPreviousPage || postsLoading}
                >
                  <span className="sr-only">Go to first page</span>
                  <ChevronsLeft />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => onPostsPageChange(Math.max(1, postsPage - 1))}
                  disabled={!postsPagination?.hasPreviousPage || postsLoading}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => onPostsPageChange(postsPage + 1)}
                  disabled={!postsPagination?.hasNextPage || postsLoading}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight />
                </Button>
                <Button
                  variant="outline"
                  className="hidden h-8 w-8 p-0 lg:flex"
                  onClick={() => onPostsPageChange(postsPagination?.totalPages ?? 1)}
                  disabled={!postsPagination?.hasNextPage || postsLoading}
                >
                  <span className="sr-only">Go to last page</span>
                  <ChevronsRight />
                </Button>
              </div>
            </div>
          </section>
        ))}
    </div>
  )
}
