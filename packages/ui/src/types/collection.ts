/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ReactNode } from 'react'

export type CollectionSortMode = 'name' | 'quantity' | 'price'
export type CollectionSortDirection = 'asc' | 'desc'

export interface CollectionPriceHistoryPoint {
  date: string
  price: number
  source?: string | null
}

export interface CollectionCardEntry {
  catalogId: number
  name: string
  /** Optional host-resolved image for deterministic or offline surfaces. */
  imageUrl?: string
  quantity: number
  price?: number | null
  priceDate?: string | null
  priceSource?: string | null
  prices?: CollectionPriceHistoryPoint[]
  setCode?: string | null
  setName?: string | null
  collectorNumber?: string | null
  rarity?: string | null
  manaCost?: string | null
  typeLine?: string | null
  oracleText?: string | null
  flavorText?: string | null
  power?: string | null
  toughness?: string | null
  loyalty?: string | null
  defense?: string | null
}

export interface CollectionProductEntry {
  catalogId: number
  name: string
  quantity: number
  description?: string | null
  setCode?: string | null
  setName?: string | null
  objectType?: string | null
  imageUrl?: string | null
  isTradable?: boolean | null
  price?: number | null
  priceDate?: string | null
  priceSource?: string | null
  prices?: CollectionPriceHistoryPoint[]
}

export type CollectionViewMode = 'cards' | 'products'
export type CollectionGridItem = CollectionCardEntry | CollectionProductEntry
export type CollectionSelection = { item: CollectionGridItem; viewMode: CollectionViewMode }

export interface CollectionLayoutProps {
  cards: CollectionCardEntry[]
  products?: CollectionProductEntry[]
  /** Disable wheel/drag scrolling while preserving the shared grid geometry and crop. */
  gridScrollable?: boolean
  /** Set false when the host has already applied its full-text or structured filters. */
  filterItems?: boolean
  viewMode?: CollectionViewMode
  defaultViewMode?: CollectionViewMode
  onViewModeChange?: (viewMode: CollectionViewMode) => void
  search?: string
  defaultSearch?: string
  sortMode?: CollectionSortMode
  sortDirection?: CollectionSortDirection
  initialSelectedCatalogId?: number
  initialSortMode?: CollectionSortMode
  initialSortDirection?: CollectionSortDirection
  selection?: CollectionSelection | null
  onSelectionChange?: (selection: CollectionSelection | null) => void
  onSearchChange?: (query: string) => void
  onSortModeChange?: (mode: CollectionSortMode) => void
  onSortDirectionChange?: (direction: CollectionSortDirection) => void
  onFilterClick?: () => void
  filterOpen?: boolean
  onFilterOpenChange?: (open: boolean) => void
  filterContent?: ReactNode
  activeFilterCount?: number
  loading?: boolean
  error?: string | null
  onCloseDetails?: () => void
  detailsCloseDisabled?: boolean
  className?: string
}
