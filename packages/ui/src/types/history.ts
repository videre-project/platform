/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { DateRange } from 'react-day-picker'
import type { ReactNode } from 'react'
import type { MatchDetailsCard } from './match'

import type { GameType } from '../components/filters/GameTypeFormatFilter'
import type { ControlledDataTablePagination } from '../components/tables/DataTablePagination'

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
  deckArchetype?: string | null
  deckColors?: string[] | null
  opponentName?: string | null
  opponentDeckName?: string | null
  opponentDeckArchetype?: string | null
  opponentDeckColors?: string[] | null
  opponentCards?: MatchDetailsCard[] | null
  isActive?: boolean
  isEvent?: boolean
  matches?: MatchHistoryItem[]
}

export type HistoryPagination = ControlledDataTablePagination & {
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
  renderOpponentArchetype?: (item: MatchHistoryItem, trigger: ReactNode) => ReactNode
  reviewLabel?: string
  onClearReview?: () => void
  pagination?: HistoryPagination | null
  className?: string
}
