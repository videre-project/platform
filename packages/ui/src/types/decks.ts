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
  /** null indicates a known single-faced card; omitted permits host lookup. */
  otherFaceCatalogId?: number | null
}

export type DeckZone = 'Mainboard' | 'Sideboard'

export interface DeckContextMenuPosition {
  x: number
  y: number
}

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
  /** null indicates a known single-faced card; omitted permits host lookup. */
  otherFaceCatalogId?: number | null
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

export type DeckDiffMap = ReadonlyMap<DeckZone, ReadonlyMap<number, DeckDiffEntry>>

export interface DeckDiffEntry {
  delta: number
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
  types?: string[]
  text?: string
  colors?: string[]
  imageUrl?: string
  power?: string | null
  toughness?: string | null
  loyalty?: string | null
  defense?: string | null
  /** null indicates a known single-faced card; omitted permits host lookup. */
  otherFaceCatalogId?: number | null
}

export type DeckSidePanelView = 'cards' | 'stats' | 'history' | 'rental'

// -- Board --

/** A single card's move within a drag operation (the primary card or a group member). */
export interface DeckCardDragMove {
  cardIndex: number
  catalogId: number
  from: { col: number; row: number }
  to: { col: number; row: number }
}

export interface DeckCardDragEndPayload {
  zone: DeckZone
  /** Zone under the pointer when the drag ended. Defaults to `zone`. */
  toZone?: DeckZone
  /** The card the pointer grabbed; for multi-card drags this is the group's primary. */
  cardIndex: number
  catalogId: number
  from: { col: number; row: number }
  to: { col: number; row: number }
  /** Every card moved by this drag; a single-card drag has exactly one entry. */
  movedCards: DeckCardDragMove[]
}

/** The board's marquee selection for a single zone. */
export interface DeckBoardSelection {
  zone: DeckZone
  /** Unrolled card indices (one per copy) currently selected in the zone. */
  cardIndices: number[]
  /** Unique catalog ids contained in the selection. */
  catalogIds: number[]
  /** Selected copies grouped by catalog ID, for moving a selection between zones. */
  cards?: { catalogId: number; quantity: number }[]
}

/** Identifies a card on the board by catalog ID; all copies in both zones are highlighted. */
export interface DeckBoardHighlight {
  catalogId: number
}

export interface DeckBoardProps {
  cards: DeckEditorCard[]
  loading?: boolean
  sortMode?: DeckSortMode
  onSortModeChange?: (mode: DeckSortMode) => void
  sideboardCollapsed?: boolean
  onSideboardCollapsedChange?: (collapsed: boolean) => void
  /** Sideboard previews use the roomier edge unless an adjacent Stats pane needs protecting. */
  sideboardTooltipPlacement?: 'left' | 'auto'
  diffMap?: DeckDiffMap
  onDragEnd?: (payload: DeckCardDragEndPayload) => void | Promise<void>
  /**
   * Fired when the board's marquee / card selection in a zone changes.
   * Receives `null` when the selection is cleared (empty click, Escape, or a
   * data change that invalidates the selected indices).
   */
  onSelectionChange?: (selection: DeckBoardSelection | null) => void
  /** Unique card names in visual column order (left to right, then top to bottom). */
  onCardOrderChange?: (zone: DeckZone, cardNames: readonly string[]) => void
  /** The card name under the board pointer; clears on leave, scrolling, or drag. */
  onCardHoverChange?: (name: string | null) => void
  onCardContextMenu?: (
    card: DeckEditorCard,
    position: DeckContextMenuPosition,
  ) => void
  /**
   * When set, the matching card pile (catalogId + zone) is outlined so the host
   * can show which card a transient action (e.g. a context menu) targets.
   */
  highlightedCard?: DeckBoardHighlight | null
  /** Emphasize copies of this name across both zones with selection styling and dim unrelated cards. */
  emphasizedCardName?: string | null
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
  /** Host-provided deck statistics; enables the Stats tab when supplied. */
  statsContent?: ReactNode
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
  onCardContextMenu?: (
    card: DeckCardSearchResult,
    position: DeckContextMenuPosition,
  ) => void
  /**
   * When set, the search result row with this MTGO id is outlined so the host
   * can show which card a transient action (e.g. a context menu) targets.
   */
  highlightedSearchCardId?: number | null
  /** Optional controlled filter state; when omitted the pane owns filters. */
  cardFilters?: CardFilterState
  onCardFiltersChange?: (filters: CardFilterState) => void
  /** Optional overlay that blocks the tools pane while preserving its preview chrome. */
  lockedContent?: ReactNode
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
  diffMap?: DeckDiffMap
  onDragEnd?: (payload: DeckCardDragEndPayload) => void | Promise<void>
  /**
   * Fired when the board's marquee / card selection in a zone changes.
   * Receives `null` when the selection is cleared (empty click, Escape, or a
   * data change that invalidates the selected indices).
   */
  onSelectionChange?: (selection: DeckBoardSelection | null) => void
  /** Unique card names in visual column order (left to right, then top to bottom). */
  onCardOrderChange?: (zone: DeckZone, cardNames: readonly string[]) => void
  /** Board pointer hover for host tools; emitted while the Stats pane is open. */
  onDeckCardHoverChange?: (name: string | null) => void
  onDeckCardContextMenu?: (
    card: DeckEditorCard,
    position: DeckContextMenuPosition,
  ) => void
  /** Outlines the matching board card pile while a host context menu targets it. */
  highlightedDeckCard?: DeckBoardHighlight | null
  /** Card name emphasized by a host tool such as the statistics sidebar. */
  emphasizedCardName?: string | null

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
  /** Host-provided statistics, including navigation to deeper analysis. */
  statsContent?: ReactNode
  historyData?: DeckHistoryData | null
  historyLoading?: boolean
  historyError?: string | null
  selectedRevisionId?: number | null
  onSelectRevision?: (revisionId: number | null) => void
  searchResults?: DeckCardSearchResult[]
  searchLoading?: boolean
  searchError?: string | null
  onSearchQueryChange?: (query: string) => void
  onSearchCardContextMenu?: (
    card: DeckCardSearchResult,
    position: DeckContextMenuPosition,
  ) => void
  /** Outlines the matching search result row while a host context menu targets it. */
  highlightedSearchCardId?: number | null
  cardFilters?: CardFilterState
  onCardFiltersChange?: (filters: CardFilterState) => void

  // Header actions (host owns clipboard / download / mutations)
  onBack?: () => void
  /** Replaces the tools toggle with a close action for modal editor previews. */
  onClose?: () => void
  onCopyList?: () => void
  onExportList?: () => void
  canExport?: boolean
  copiedList?: boolean
  onImportList?: () => void
  showImport?: boolean
  importDisabled?: boolean
  onArchetypeChange?: (archetype: string) => void | Promise<void>
  archetypeSaving?: boolean
  archetypeError?: string | null
  /** Optional overlay that blocks the editor tools pane until the host unlocks it. */
  sidePanelLockedContent?: ReactNode

  /** Optional slot for breadcrumb / header context (host owns portals). */
  headerContext?: ReactNode
  className?: string
}
