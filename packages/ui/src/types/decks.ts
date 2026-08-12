/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ReactNode } from 'react'

import type { GameType } from '../components/filters/GameTypeFormatFilter'
import type { CardFilterState } from '../utils/card-search-model'

// -- Shared deck cards --

/** Featured / preview card for gallery tiles and hero fan. */
export interface DeckFeaturedCard {
  catalogId: number
  name: string
  quantity?: number
  /** Optional host-resolved image (background art fallback). */
  imageUrl?: string | null
}

/** Deck list entry used by gallery and simple mainboard/sideboard summaries. */
export interface DeckCardEntry {
  catalogId: number
  name: string
  quantity: number
  cmc?: number
  colors?: string[]
  types?: string[]
  rarity?: string
  imageUrl?: string | null
}

export type DeckZone = 'Mainboard' | 'Sideboard'

/** Fully-hydrated card used by the editor board grid. */
export interface DeckEditorCard {
  index: number
  originalIndex: number
  catalogId: number
  name: string
  quantity: number
  cmc: number
  colors: string[]
  types: string[]
  rarity: string
  zone: DeckZone
  imageUrl?: string | null
}

export type DeckSortMode = 'cmc' | 'colors' | 'types' | 'rarity'

export interface DeckMatchStats {
  winrate: number | null
  matches: number
  wins: number
  losses: number
  ties: number
}

// -- Gallery --

export interface DeckGalleryItem {
  revisionId: number
  name: string
  format: string
  archetype?: string | null
  colors: string[]
  wins: number
  losses: number
  ties: number
  mainboardCount?: number
  sideboardCount?: number
  timestamp?: string
  netDeckId?: number
  /** Host-resolved featured cards for the hero fan (up to 5). */
  featuredCards?: DeckFeaturedCard[]
  /** Optional host-resolved background art for the tile hero. */
  imageUrl?: string | null
}

export interface DecksLayoutProps {
  /** Decks to render. Host should apply format / URL filtering before pass-through. */
  decks: DeckGalleryItem[]
  /** Formats available in the filter dropdown (already game-type filtered by host if needed). */
  formats?: string[]
  selectedFormat?: string
  onFormatChange?: (format: string) => void
  gameType?: GameType
  onGameTypeChange?: (gameType: GameType) => void
  /** Local search query (controlled). */
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
  /**
   * When true (default), layout filters `decks` by `query` locally.
   * Set false when the host already filtered.
   */
  filterByQuery?: boolean
  loading?: boolean
  error?: string | null
  /** True when the host has no decks at all (distinct from empty filter results). */
  empty?: boolean
  emptyMessage?: string
  noResultsMessage?: string
  onDeckClick?: (deckRevisionId: number, deck: DeckGalleryItem) => void
  onCreateDeck?: () => void
  /** Optional slot for breadcrumb / header context (host owns portals). */
  headerContext?: ReactNode
  className?: string
}

// -- Diff / history --

export interface DeckDiffEntry {
  delta: number
  zone: string
  name: string
  cmc?: number
  colors?: string[]
  types?: string[]
  rarity?: string
}

export interface DeckHistoryChange {
  catalogId: number
  name: string
  quantityDelta: number
  zone: DeckZone | string
  cmc?: number
  colors?: string[]
  types?: string[]
  rarity?: string
}

export interface DeckHistoryRevision {
  revisionId: number
  cardGroupingId?: number
  observedAt?: string
  timestamp?: string
  name?: string
  format?: string
  mainboardCount?: number
  sideboardCount?: number
  colors?: string[]
  archetype?: string | null
  changesFromPrevious: DeckHistoryChange[]
}

export interface DeckHistoryData {
  currentRevisionId?: number
  cardGroupingId?: number
  name?: string
  format?: string
  revisions: DeckHistoryRevision[]
}

// -- Card search (side pane) --

export interface DeckCardSearchResult {
  id?: string
  mtgoId: number
  setCode?: string
  name: string
  type: string
  text?: string
  colors?: string[]
  imageUrl?: string
  power?: string | null
  toughness?: string | null
  loyalty?: string | null
  defense?: string | null
}

export type DeckSidePanelView = 'cards' | 'stats' | 'history' | 'rental'

// -- Board --

export interface DeckCardDragEndPayload {
  zone: DeckZone
  cardIndex: number
  catalogId: number
  from: { col: number; row: number }
  to: { col: number; row: number }
}

export interface DeckBoardProps {
  cards: DeckEditorCard[]
  loading?: boolean
  sortMode?: DeckSortMode
  onSortModeChange?: (mode: DeckSortMode) => void
  sideboardCollapsed?: boolean
  onSideboardCollapsedChange?: (collapsed: boolean) => void
  diffMap?: Map<number, DeckDiffEntry>
  onDragEnd?: (payload: DeckCardDragEndPayload) => void
  /** Show the small stats strip above the board. Default false for editor chrome. */
  showDeckStats?: boolean
  /** Show internal header with sort / sideboard controls. Default false when host chrome owns controls. */
  showHeader?: boolean
  editorTitle?: string
  emptyMessage?: string
  className?: string
}

// -- Side pane --

export interface DeckBuildSidePaneProps {
  view: DeckSidePanelView
  onViewChange: (view: DeckSidePanelView) => void
  isCollapsed?: boolean
  historyData?: DeckHistoryData | null
  historyLoading?: boolean
  historyError?: string | null
  selectedRevisionId?: number | null
  onSelectRevision?: (revisionId: number | null) => void
  /** Host-fetched card search results for the current effective query. */
  searchResults?: DeckCardSearchResult[]
  searchLoading?: boolean
  searchError?: string | null
  /**
   * Fired when the side pane's built query changes (search text + filters).
   * Host should fetch and pass `searchResults`.
   */
  onSearchQueryChange?: (query: string) => void
  /** Optional controlled filter state; when omitted the pane owns filters. */
  cardFilters?: CardFilterState
  onCardFiltersChange?: (filters: CardFilterState) => void
  className?: string
}

// -- Editor layout --

export interface DeckEditorLayoutProps {
  // Header meta
  deckName?: string
  archetype?: string
  colors?: readonly string[] | null
  timestamp?: string
  mainCount?: number
  sideCount?: number
  loadingHeader?: boolean

  // Board data
  cards: DeckEditorCard[]
  cardsLoading?: boolean
  diffMap?: Map<number, DeckDiffEntry>
  onDragEnd?: (payload: DeckCardDragEndPayload) => void

  // View controls
  sortMode?: DeckSortMode
  defaultSortMode?: DeckSortMode
  onSortModeChange?: (mode: DeckSortMode) => void
  sideboardCollapsed?: boolean
  defaultSideboardCollapsed?: boolean
  onSideboardCollapsedChange?: (collapsed: boolean) => void
  toolsCollapsed?: boolean
  defaultToolsCollapsed?: boolean
  onToolsCollapsedChange?: (collapsed: boolean) => void

  // Side panel
  sidePanelView?: DeckSidePanelView
  defaultSidePanelView?: DeckSidePanelView
  onSidePanelViewChange?: (view: DeckSidePanelView) => void
  historyData?: DeckHistoryData | null
  historyLoading?: boolean
  historyError?: string | null
  selectedRevisionId?: number | null
  onSelectRevision?: (revisionId: number | null) => void
  searchResults?: DeckCardSearchResult[]
  searchLoading?: boolean
  searchError?: string | null
  onSearchQueryChange?: (query: string) => void
  cardFilters?: CardFilterState
  onCardFiltersChange?: (filters: CardFilterState) => void

  // Header actions (host owns clipboard / download / mutations)
  onBack?: () => void
  onCopyList?: () => void
  onExportList?: () => void
  canExport?: boolean
  copiedList?: boolean
  onImportList?: () => void
  importDisabled?: boolean
  onArchetypeChange?: (archetype: string) => void | Promise<void>
  archetypeSaving?: boolean
  archetypeError?: string | null

  /** Optional slot for breadcrumb / header context (host owns portals). */
  headerContext?: ReactNode
  className?: string
}
