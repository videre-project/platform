/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  ArrowDown01,
  ArrowDown10,
  ArrowDownAZ,
  ArrowDownZA,
  Filter,
  Search,
} from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import type { ReactNode } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../primitives/Select'
import type { CollectionSortDirection, CollectionSortMode } from '../../types/collection'
import type { CollectionViewMode } from '../../types/collection'

export interface CollectionToolbarProps {
  search: string
  sortMode: CollectionSortMode
  sortDirection: CollectionSortDirection
  onSearchChange: (value: string) => void
  onSortModeChange: (mode: CollectionSortMode) => void
  onSortDirectionChange: (direction: CollectionSortDirection) => void
  onFilterClick?: () => void
  filterOpen?: boolean
  onFilterOpenChange?: (open: boolean) => void
  filterContent?: ReactNode
  viewMode?: CollectionViewMode
  onViewModeChange?: (viewMode: CollectionViewMode) => void
  activeFilterCount?: number
}

export function CollectionToolbar({
  search,
  sortMode,
  sortDirection,
  onSearchChange,
  onSortModeChange,
  onSortDirectionChange,
  onFilterClick,
  filterOpen,
  onFilterOpenChange,
  filterContent,
  viewMode = 'cards',
  onViewModeChange,
  activeFilterCount = 0,
}: CollectionToolbarProps) {
  const SortDirectionIcon = sortMode === 'name'
    ? sortDirection === 'asc' ? ArrowDownAZ : ArrowDownZA
    : sortDirection === 'asc' ? ArrowDown01 : ArrowDown10
  return (
    <div className="flex h-8 shrink-0 items-center gap-2">
      <div
        role="tablist"
        aria-label="Collection view"
        className="inline-flex h-8 shrink-0 items-center rounded-md border border-sidebar-border/70 bg-background/70 p-0.5"
      >
        {(['cards', 'products'] as const).map(value => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={viewMode === value}
            onClick={() => onViewModeChange?.(value)}
            className={`h-7 rounded-sm px-3 text-xs font-medium leading-none transition-colors ${viewMode === value ? 'bg-secondary/80 text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {value === 'cards' ? 'Cards' : 'Products'}
          </button>
        ))}
      </div>

      <div className="relative min-w-[16rem] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder={viewMode === 'cards' ? 'Search cards' : 'Search products'}
          className="flex h-8 w-full rounded-md border border-sidebar-border/70 bg-background/70 py-1 pl-8 pr-10 text-sm shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        />
        {filterContent ? (
          <Popover.Root open={filterOpen} onOpenChange={onFilterOpenChange}>
            <Popover.Trigger asChild>
              <button
                type="button"
                onClick={onFilterClick}
                className={`absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-r-md border-l border-sidebar-border/60 text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground ${(activeFilterCount > 0 || filterOpen) ? 'bg-secondary text-secondary-foreground hover:bg-secondary' : 'bg-background/70'}`}
                aria-label={filterOpen ? 'Close collection query builder' : 'Open collection query builder'}
                aria-expanded={filterOpen}
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" sideOffset={6} className="z-50 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-sidebar-border/70 bg-card p-0 text-card-foreground shadow-md outline-none">
                {filterContent}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : (
          <button
            type="button"
            onClick={onFilterClick}
            className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-r-md border-l border-sidebar-border/60 bg-background/70 text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground"
            aria-label="Open collection query builder"
          >
            <Filter className="h-4 w-4" />
            {activeFilterCount > 0 ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sort</span>
        <Select
          value={sortMode}
          onValueChange={value => onSortModeChange(value as CollectionSortMode)}
        >
          <SelectTrigger
            className="h-8 w-[116px] border-sidebar-border/70 bg-background/70 text-xs"
            aria-label="Sort collection by"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="quantity">Quantity</SelectItem>
            <SelectItem value="price">Price</SelectItem>
          </SelectContent>
        </Select>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border/70 bg-background/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
          aria-label="Toggle sort direction"
        >
          <SortDirectionIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
