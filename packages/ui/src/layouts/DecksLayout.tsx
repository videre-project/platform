/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { DeckGalleryTile } from '../components/decks/DeckGalleryTile'
import { GameTypeFormatFilter, type GameType } from '../components/filters/GameTypeFormatFilter'
import { cn } from '../lib/cn'
import { Button } from '../primitives/Button'
import { Card, CardContent } from '../primitives/Card'
import { Input } from '../primitives/Input'
import { Skeleton } from '../primitives/Skeleton'
import type { DecksLayoutProps } from '../types/decks'

const ALL_FORMATS = 'All'
const DECK_TILE_GRID_CLASS = 'grid grid-cols-1 gap-4 pt-3 pr-1 lg:grid-cols-2 2xl:grid-cols-3'

function LoadingFormatControls() {
  return (
    <div className="flex h-9 min-w-0 items-center gap-2 overflow-hidden">
      <div className="flex h-8 items-center rounded-lg border border-sidebar-border/60 bg-card p-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-20 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-8 w-32 rounded-md" />
    </div>
  )
}

function LoadingDeckRows() {
  return (
    <div className="min-h-0 overflow-hidden">
      <div className="border-b border-sidebar-border/60 px-4 py-3">
        <Skeleton className="mb-2 h-4 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className={DECK_TILE_GRID_CLASS}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden border-sidebar-border/60">
            <Skeleton className="h-36 rounded-none" />
            <CardContent className="p-3 pb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="mb-2 h-5 w-36 max-w-full" />
                  <Skeleton className="h-3 w-28 max-w-full" />
                </div>
                <Skeleton className="h-7 w-14 shrink-0" />
              </div>
            </CardContent>
            <div className="px-3 pb-3">
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Decks gallery presentation surface.
 * Host owns data fetch, URL format params, featured-card hydration, and navigation.
 */
export function DecksLayout({
  decks,
  formats = [],
  selectedFormat = ALL_FORMATS,
  onFormatChange,
  gameType: controlledGameType,
  onGameTypeChange,
  query: controlledQuery,
  defaultQuery = '',
  onQueryChange,
  filterByQuery = true,
  loading = false,
  error,
  empty = false,
  emptyMessage = 'No decks found in the database.',
  noResultsMessage = 'No decks match the current filters.',
  onDeckClick,
  onCreateDeck,
  headerContext,
  className,
}: DecksLayoutProps) {
  const [internalQuery, setInternalQuery] = useState(defaultQuery)
  const [internalGameType, setInternalGameType] = useState<GameType>('All')
  const query = controlledQuery ?? internalQuery
  const gameType = controlledGameType ?? internalGameType

  const handleQueryChange = (value: string) => {
    if (controlledQuery === undefined) setInternalQuery(value)
    onQueryChange?.(value)
  }

  const handleGameTypeChange = (next: GameType) => {
    if (controlledGameType === undefined) setInternalGameType(next)
    onGameTypeChange?.(next)
  }

  const handleFormatChange = (format: string) => {
    onFormatChange?.(format)
  }

  const visibleDecks = useMemo(() => {
    if (!filterByQuery) return decks
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return decks

    return decks.filter(deck => {
      const searchable = [
        deck.name,
        deck.format,
        deck.archetype ?? '',
        ...(deck.colors ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return searchable.includes(normalizedQuery)
    })
  }, [decks, filterByQuery, query])

  const formatFilterValue =
    !selectedFormat || selectedFormat === ALL_FORMATS ? '' : selectedFormat

  return (
    <div
      className={cn(
        'videre-ui flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 pb-4 pt-1 font-sans',
        className,
      )}
      data-ui-layout="decks"
    >
      {headerContext}

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error loading decks: {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="border-b border-sidebar-border/60 pb-3">
            <LoadingFormatControls />
          </div>
          <LoadingDeckRows />
        </div>
      ) : empty ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-sidebar-border/60 bg-muted/25 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <GameTypeFormatFilter
                gameType={gameType}
                onGameTypeChange={handleGameTypeChange}
                selectedFormat={formatFilterValue}
                formats={formats}
                onFormatChange={handleFormatChange}
                className="lg:flex-1"
              />

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
                <div className="relative min-w-0 sm:w-72">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={event => handleQueryChange(event.target.value)}
                    placeholder="Search decks"
                    className="h-9 pl-8"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQueryChange('')}
                  disabled={!query}
                  className="h-9"
                >
                  Clear
                </Button>
                {onCreateDeck ? (
                  <Button type="button" size="sm" onClick={onCreateDeck} className="h-9">
                    Create deck
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <main className="min-h-0 overflow-y-auto">
            {visibleDecks.length === 0 ? (
              <div className="flex min-h-72 items-center justify-center p-6 text-sm text-muted-foreground">
                {noResultsMessage}
              </div>
            ) : (
              <div className={DECK_TILE_GRID_CLASS}>
                {visibleDecks.map(deck => (
                  <DeckGalleryTile
                    key={deck.revisionId}
                    deck={deck}
                    onDeckClick={onDeckClick}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
