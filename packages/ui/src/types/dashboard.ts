/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ReactNode } from 'react'
import type { DateRange } from 'react-day-picker'

import type { GameType } from '../components/filters/GameTypeFormatFilter'

export type DashboardGameType = GameType

export type DashboardStats = {
  overallWinrate: number
  totalMatches: number
  wins: number
  losses: number
  ties: number
  playWinrate: number
  playMatches: number
  drawWinrate: number
  drawMatches: number
  averageDuration: string
  durationTwoGames: string
  durationThreeGames: string
}

export type PerformanceTrendPoint = {
  date: string
  rawDate: string
  winrate: number | null
  matches: number
  rollingAvg: number | null
  ci95: number[] | null
  ci80: number[] | null
  ci50: number[] | null
}

export type DashboardArchetype = {
  archetype: string
  colors: string[]
  matches: number
  wins?: number
  losses?: number
  winrate: number
  topCard: string
}

export type DashboardLayoutProps = {
  // Filters (host-owned; formats should already be filtered/sorted for game type)
  gameType: DashboardGameType
  onGameTypeChange: (value: DashboardGameType) => void
  selectedFormat: string
  formats: string[]
  onFormatChange: (value: string) => void
  dateRange?: DateRange
  onDateRangeChange: (range: DateRange | undefined) => void

  // KPI + trend
  stats?: DashboardStats | null
  loading?: boolean
  trend?: PerformanceTrendPoint[]

  // Deck performance
  archetypes?: DashboardArchetype[]
  archetypesLoading?: boolean

  /**
   * Resolve a card art URL for scatter points and list thumbnails.
   * Prefer this over artUrls when URLs are loaded asynchronously.
   */
  getArtUrl?: (cardName: string) => string | null | undefined
  /** Static map of card name -> art URL. Used when getArtUrl is not provided. */
  artUrls?: Record<string, string>

  /**
   * Optional host link wrapper for deck names (defaults to a span).
   * Hosts can use this for deck navigation when their application supports it.
   */
  renderDeckLink?: (props: { deckName: string; children: ReactNode }) => ReactNode
  onDeckClick?: (deckName: string) => void

  /**
   * Host navigation for "View More Decks" (e.g. `<Link to="/decks">{children}</Link>`).
   * Falls back to onViewMoreDecks as a button click, or a non-navigating Button.
   */
  renderViewMoreDecks?: (props: { children: ReactNode }) => ReactNode
  onViewMoreDecks?: () => void

  className?: string
}
