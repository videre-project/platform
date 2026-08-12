/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ReactNode } from 'react'

/** Marketplace trade post (package-owned presentation shape). */
export type TradePost = {
  posterName?: string | null
  /** Display format string (e.g. Message, OfferedWantedList). */
  format?: string | null
  message?: string | null
}

/** Recent trade partner for the partners panel. */
export type TradePartner = {
  posterName?: string | null
  lastTradeTime?: string | null
}

export type TradeView = 'marketplace' | 'history' | 'partners'

export type TradePostFormatFilter = 'all' | 'message' | 'offeredWantedList'

export type TradePostsPagination = {
  page: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type TradesLayoutProps = {
  activeView: TradeView
  onActiveViewChange: (view: TradeView) => void

  /** Host mounts TradeHistoryView (or TradeHistoryLayout) here. */
  historyContent: ReactNode

  // Marketplace posts
  posts: TradePost[]
  postsLoading?: boolean
  postsError?: string | null
  /** Present once the host has received a posts page response. */
  postsPagination?: TradePostsPagination | null
  postsPage: number
  onPostsPageChange: (page: number) => void

  // Marketplace filters (host-owned state + debounce)
  postFormat: TradePostFormatFilter
  onPostFormatChange: (value: TradePostFormatFilter) => void
  userSearch: string
  onUserSearchChange: (value: string) => void
  messageSearch: string
  onMessageSearchChange: (value: string) => void
  /** Debounced values used only for HighlightedText / GameLogText. */
  debouncedUserSearch?: string
  debouncedMessageSearch?: string
  onClearPostFilters?: () => void

  // Partners / snapshot
  tradePartners?: TradePartner[]
  /** Truthy when a trade is currently active. */
  currentTrade?: unknown | null
  myPost?: TradePost | null
  tradesLoading?: boolean
  tradesError?: string | null
  /**
   * True once the host has received a trades snapshot (even if empty).
   * Used for initial skeleton: `!clientReady || (tradesLoading && !hasTradesSnapshot)`.
   */
  hasTradesSnapshot?: boolean

  clientReady?: boolean
  className?: string
}
