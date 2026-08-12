/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useMemo, useState } from 'react'

import { CollectionPriceHistoryPanel } from '../components/collection/CollectionPriceHistoryPanel'
import { CollectionToolbar } from '../components/collection/CollectionToolbar'
import type {
  CollectionCardEntry,
  CollectionProductEntry,
  CollectionGridItem,
  CollectionSelection,
  CollectionSortDirection,
  CollectionSortMode,
  CollectionLayoutProps,
  CollectionViewMode,
} from '../types/collection'
import { compareCollectionNumbers } from '../utils/collection'
import { VirtualCollectionGrid } from '../components/collection/VirtualCollectionGrid'
import { cn } from '../lib/cn'

const DEFAULT_SORT_DIRECTION: Record<CollectionSortMode, CollectionSortDirection> = {
  name: 'asc',
  quantity: 'desc',
  price: 'desc',
}

/**
 * Host-independent collection presentation surface.
 * Hosts provide collection/detail/history data; this component owns only view state.
 */
export function CollectionLayout({
  cards,
  products = [],
  gridScrollable = true,
  filterItems = true,
  viewMode: controlledViewMode,
  defaultViewMode = 'cards',
  onViewModeChange,
  search: controlledSearch,
  defaultSearch = '',
  sortMode: controlledSortMode,
  sortDirection: controlledSortDirection,
  initialSelectedCatalogId,
  initialSortMode = 'price',
  initialSortDirection = DEFAULT_SORT_DIRECTION[initialSortMode],
  selection: controlledSelection,
  onSelectionChange,
  onSearchChange,
  onSortModeChange,
  onSortDirectionChange,
  onFilterClick,
  filterOpen,
  onFilterOpenChange,
  filterContent,
  activeFilterCount = 0,
  loading = false,
  error,
  onCloseDetails,
  detailsCloseDisabled = false,
  className,
}: CollectionLayoutProps) {
  const [internalViewMode, setInternalViewMode] = useState<CollectionViewMode>(defaultViewMode)
  const [internalSearch, setInternalSearch] = useState(defaultSearch)
  const [internalSortMode, setInternalSortMode] = useState<CollectionSortMode>(initialSortMode)
  const [internalSortDirection, setInternalSortDirection] = useState<CollectionSortDirection>(initialSortDirection)
  const initialIndex = initialSelectedCatalogId === undefined
    ? -1
    : cards.findIndex(card => card.catalogId === initialSelectedCatalogId)
  const [internalSelection, setInternalSelection] = useState<CollectionSelection | null>(defaultViewMode === 'cards' && initialIndex >= 0 && cards[initialIndex] ? { item: cards[initialIndex], viewMode: 'cards' } : null)
  const viewMode = controlledViewMode ?? internalViewMode
  const search = controlledSearch ?? internalSearch
  const sortMode = controlledSortMode ?? internalSortMode
  const sortDirection = controlledSortDirection ?? internalSortDirection
  const selected = controlledSelection === undefined ? internalSelection : controlledSelection

  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const source: CollectionGridItem[] = viewMode === 'cards' ? cards : products
    return source
      .map(item => ({ ...item, price: item.price ?? item.prices?.at(-1)?.price ?? null }))
      .filter(item => !filterItems || !query || item.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => {
        if (sortMode === 'name') {
          return a.name.localeCompare(b.name) * (sortDirection === 'asc' ? 1 : -1)
        }
        if (sortMode === 'quantity') {
          return compareCollectionNumbers(a.quantity, b.quantity, sortDirection) || a.name.localeCompare(b.name)
        }
        return compareCollectionNumbers(a.price, b.price, sortDirection) || a.name.localeCompare(b.name)
      })
  }, [cards, filterItems, products, search, sortDirection, sortMode, viewMode])

  const handleSearchChange = (value: string) => {
    if (controlledSearch === undefined) setInternalSearch(value)
    onSearchChange?.(value)
  }

  const handleSortModeChange = (mode: CollectionSortMode) => {
    if (controlledSortMode === undefined) setInternalSortMode(mode)
    if (controlledSortDirection === undefined) setInternalSortDirection(DEFAULT_SORT_DIRECTION[mode])
    onSortModeChange?.(mode)
    onSortDirectionChange?.(DEFAULT_SORT_DIRECTION[mode])
  }

  const handleSortDirectionChange = (direction: CollectionSortDirection) => {
    if (controlledSortDirection === undefined) setInternalSortDirection(direction)
    onSortDirectionChange?.(direction)
  }

  const handleViewModeChange = (nextViewMode: CollectionViewMode) => {
    if (controlledViewMode === undefined) setInternalViewMode(nextViewMode)
    if (controlledSelection === undefined) setInternalSelection(null)
    onViewModeChange?.(nextViewMode)
    onSelectionChange?.(null)
  }

  const handleSelection = (nextSelection: CollectionSelection) => {
    const toggledSelection = selected?.viewMode === nextSelection.viewMode
      && selected.item.catalogId === nextSelection.item.catalogId
      ? null
      : nextSelection
    if (controlledSelection === undefined) setInternalSelection(toggledSelection)
    onSelectionChange?.(toggledSelection)
  }

  return (
    <div className={cn('videre-ui flex h-full min-h-0 flex-col gap-2 overflow-hidden px-4 pb-4 pt-1 font-sans', className)} data-ui-layout="collection">
      <CollectionToolbar
        search={search}
        sortMode={sortMode}
        sortDirection={sortDirection}
        onSearchChange={handleSearchChange}
        onSortModeChange={handleSortModeChange}
        onSortDirectionChange={handleSortDirectionChange}
        onFilterClick={onFilterClick}
        filterOpen={filterOpen}
        onFilterOpenChange={onFilterOpenChange}
        filterContent={filterContent}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        activeFilterCount={activeFilterCount}
      />
      {error ? <div className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-red-400">{error}</div> : null}
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-sidebar-border/60 bg-card">
          <VirtualCollectionGrid
            items={visibleItems}
            viewMode={viewMode}
            selectedCatalogId={selected?.item.catalogId ?? null}
            onSelectItem={handleSelection}
            scrollable={gridScrollable}
            loading={loading}
            showPrice={sortMode === 'price'}
          />
        </div>
        {selected ? (
          <CollectionPriceHistoryPanel
            {...(selected.viewMode === 'cards'
              ? { card: selected.item as CollectionCardEntry }
              : { product: selected.item as CollectionProductEntry })}
            onClose={onCloseDetails}
            closeDisabled={detailsCloseDisabled}
          />
        ) : null}
      </div>
    </div>
  )
}
