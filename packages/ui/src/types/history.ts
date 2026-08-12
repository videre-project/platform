/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { DateRange } from 'react-day-picker'

import type { GameType } from '../components/filters/GameTypeFormatFilter'

export type MatchHistoryItem = {
  id: number
  eventId: number
  eventName: string
  format: string
  startTime: string
  result: string
  record: string
  duration: string
  deckName?: string
  deckColors?: string[] | null
  opponentName?: string | null
  opponentDeckName?: string | null
  opponentDeckArchetype?: string | null
  opponentDeckColors?: string[] | null
  isActive?: boolean
  isEvent?: boolean
  matches?: MatchHistoryItem[]
}

export type HistoryPagination = {
  page: number
  totalPages: number
  totalCount: number
}

export type HistoryLayoutProps = {
  items: MatchHistoryItem[]
  loading?: boolean
  error?: Error | string | null
  gameType: GameType
  onGameTypeChange: (value: GameType) => void
  selectedFormat: string
  formats: string[]
  onFormatChange: (value: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  onRowClick?: (item: MatchHistoryItem) => void
  pagination?: HistoryPagination | null
  onPreviousPage?: () => void
  onNextPage?: () => void
  className?: string
}
