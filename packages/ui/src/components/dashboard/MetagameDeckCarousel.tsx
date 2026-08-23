/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useEffect, useRef, useState, type ReactNode, type WheelEvent } from 'react'
import { ChevronLeft, ChevronRight, Search, Trophy } from 'lucide-react'

import type { DeckGalleryItem } from '../../types/decks'
import { cn } from '../../lib/cn'
import { Button } from '../../primitives/Button'
import { Skeleton } from '../../primitives/Skeleton'
import { DeckGalleryTile } from '../decks/DeckGalleryTile'
import { NoDataState } from './dashboard-visuals'

export interface MetagameDeckCarouselProps {
  decks: DeckGalleryItem[]
  loading?: boolean
  error?: string | null
  renderSearchMore?: (props: { children: ReactNode }) => ReactNode
}

function MetagameDeckSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-sidebar-border/60 bg-card">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-2 w-full" />
      </div>
    </div>
  )
}

export function MetagameDeckCarousel({
  decks,
  loading = false,
  error = null,
  renderSearchMore,
}: MetagameDeckCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    setCanScrollLeft(scroller.scrollLeft > 1)
    setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1)
  }, [])

  useEffect(() => {
    updateScrollState()
    const scroller = scrollerRef.current
    if (!scroller || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(scroller)
    return () => observer.disconnect()
  }, [decks, loading, updateScrollState])

  const scroll = (direction: -1 | 1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollBy({ left: direction * Math.max(260, scroller.clientWidth * 0.75), behavior: 'smooth' })
  }

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) && event.deltaX !== 0
      ? event.deltaX
      : event.deltaY
    if (delta === 0) return

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth
    const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, scroller.scrollLeft + delta))
    if (nextScrollLeft === scroller.scrollLeft) return

    event.preventDefault()
    scroller.scrollLeft = nextScrollLeft
  }, [])

  return (
    <section aria-labelledby="dashboard-metagame-title" className="min-w-0">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id="dashboard-metagame-title" className="text-base font-medium">
            Top Metagame Decks
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Leading archetypes from recent Magic Online events
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Scroll metagame decks left"
            disabled={!canScrollLeft}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Scroll metagame decks right"
            disabled={!canScrollRight}
            onClick={() => scroll(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex min-h-52 items-center justify-center rounded-lg border border-sidebar-border/60 bg-card/30">
          <NoDataState
            icon={Trophy}
            title="Metagame data unavailable"
            description={error}
          />
        </div>
      ) : !loading && decks.length === 0 ? (
        <div className="flex min-h-52 items-center justify-center rounded-lg border border-sidebar-border/60 bg-card/30">
          <NoDataState
            icon={Trophy}
            title="No metagame decks"
            description="No tournament results matched the selected filters."
          />
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollerRef}
            className="grid snap-x snap-mandatory auto-cols-[max(15rem,calc(20%_-_0.8rem))] grid-flow-col gap-4 overflow-x-auto overscroll-x-contain pb-3"
            role="list"
            aria-label="Top metagame decks"
            tabIndex={0}
            onScroll={updateScrollState}
            onWheel={handleWheel}
          >
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="snap-start" role="listitem">
                    <MetagameDeckSkeleton />
                  </div>
                ))
              : (
                  <>
                    {decks.map(deck => (
                      <div
                        key={`${deck.format}-${deck.name}-${deck.revisionId}`}
                        className="min-w-0 snap-start"
                        role="listitem"
                      >
                        <DeckGalleryTile deck={deck} />
                      </div>
                    ))}
                    {renderSearchMore && decks.length > 0 ? (
                      <div className="min-w-0 snap-start" role="listitem">
                        {renderSearchMore({
                          children: (
                            <div className="flex h-full min-h-[15rem] flex-col items-center justify-center rounded-lg border border-dashed border-sidebar-border/80 bg-card/45 px-6 text-center transition-colors hover:border-primary/50 hover:bg-card">
                              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-sidebar-border/80 bg-background/70 text-muted-foreground">
                                <Search className="h-5 w-5" />
                              </span>
                              <span className="mt-4 text-sm font-medium text-foreground">Search more decks</span>
                              <span className="mt-1 max-w-44 text-xs leading-5 text-muted-foreground">
                                Browse the full metagame in a larger grid.
                              </span>
                            </div>
                          ),
                        })}
                      </div>
                    ) : null}
                  </>
                )}
          </div>
          <div
            aria-hidden="true"
            data-metagame-edge="left"
            data-visible={canScrollLeft}
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent transition-opacity duration-200',
              canScrollLeft ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            aria-hidden="true"
            data-metagame-edge="right"
            data-visible={canScrollRight}
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent transition-opacity duration-200',
              canScrollRight ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>
      )}
    </section>
  )
}
