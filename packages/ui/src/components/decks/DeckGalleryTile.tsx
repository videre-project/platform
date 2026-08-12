/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { type CSSProperties, useEffect, useState } from 'react'
import { SquarePen } from 'lucide-react'

import { cn } from '../../lib/cn'
import { Badge } from '../../primitives/Badge'
import { Card, CardContent } from '../../primitives/Card'
import type { DeckFeaturedCard, DeckGalleryItem } from '../../types/decks'
import { getDisplayCardColors } from '../../utils/card-colors'
import { getFormatLabel } from '../../utils/formats'
import { getManaSymbolSvgPath } from '../../utils/mana-symbols'
import { getDeckMatchStats } from '../../utils/deck-sortable'
import { CardImage } from '../cards/CardImage'
import { CatalogCardImage } from '../cards/CatalogCardImage'
import { DeckWinrateBar, DeckWinrateMetric } from './DeckWinrate'

function formatFormatName(format?: string) {
  const trimmed = format?.trim()
  if (!trimmed) return 'Unspecified'
  if (trimmed === 'All') return 'All'
  return getFormatLabel(trimmed)
}

function FormatLabel({ format, className }: { format: string; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center', className)}>
      <span className="truncate">{formatFormatName(format)}</span>
    </span>
  )
}

function ManaSymbols({ colors, className }: { colors: string[]; className?: string }) {
  const visibleColors = getDisplayCardColors(colors)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {visibleColors.map((color, index) => (
        <img
          key={`${color}-${index}`}
          src={getManaSymbolSvgPath(color) ?? undefined}
          alt={color}
          className="h-5 w-5 rounded-full bg-background shadow-sm ring-1 ring-background"
        />
      ))}
    </div>
  )
}

function DeckHeroPreview({
  deck,
  cards,
}: {
  deck: DeckGalleryItem
  cards: DeckFeaturedCard[]
}) {
  const colors = getDisplayCardColors(deck.colors).filter(
    (color, index, list) => list.indexOf(color) === index,
  )
  const visibleCards = cards.slice(0, 5)
  const backgroundCard = visibleCards[Math.floor(visibleCards.length / 2)]
  const backgroundArtUrl = deck.imageUrl ?? backgroundCard?.imageUrl ?? null
  const [backgroundArtFailed, setBackgroundArtFailed] = useState(false)

  useEffect(() => setBackgroundArtFailed(false), [backgroundArtUrl])

  return (
    <div className="relative z-0 h-36 overflow-visible rounded-t-lg border-b border-sidebar-border/60">
      <div className="absolute inset-0 overflow-hidden rounded-t-lg bg-muted/25 transition-colors duration-300 group-hover/editor:bg-muted/40">
        {backgroundArtUrl && !backgroundArtFailed ? (
          <img
            src={backgroundArtUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover object-top opacity-55 blur-sm saturate-125 transition-opacity duration-300 group-hover/editor:opacity-65"
            onError={() => setBackgroundArtFailed(true)}
          />
        ) : backgroundCard ? (
          <CatalogCardImage
            catalogId={backgroundCard.catalogId}
            name={backgroundCard.name}
            alt=""
            className="absolute inset-0 h-full w-full scale-[1.2] object-cover object-[center_22%] opacity-55 blur-sm saturate-125 transition-opacity duration-300 group-hover/editor:opacity-65"
            loading="eager"
          />
        ) : null}
        <div className="absolute inset-0 bg-background/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/25 via-background/5 to-background/45" />
      </div>

      <div className="absolute inset-x-0 bottom-0 top-0 z-10 [clip-path:inset(-4rem_0_1px_0)]">
        {visibleCards.length > 0 ? (
          visibleCards.map((card, index) => {
            const offset = index - (visibleCards.length - 1) / 2
            const distance = Math.abs(offset)
            const restingTransform = `translateX(calc(-50% + ${offset * 20}px)) translateY(${-distance * 3}px) rotate(${offset * 8}deg)`
            const activeTransform = `translateX(calc(-50% + ${offset * 34}px)) translateY(${-16 - distance * 4}px) rotate(${offset * 12}deg)`

            return (
              <CardImage
                key={`${card.catalogId}-${card.name}`}
                catalogId={card.catalogId}
                alt={card.name}
                title={card.name}
                className="absolute bottom-[-10px] left-1/2 h-32 w-[5.7rem] origin-[50%_92%] rounded-sm object-cover shadow-lg ring-1 ring-border/70 transition-[filter,transform] duration-300 ease-out [transform:var(--deck-card-transform)] group-hover/editor:brightness-110 group-hover/editor:[transform:var(--deck-card-active-transform)] group-focus-visible/editor:brightness-110 group-focus-visible/editor:[transform:var(--deck-card-active-transform)]"
                style={{
                  '--deck-card-transform': restingTransform,
                  '--deck-card-active-transform': activeTransform,
                  zIndex: 10 - distance,
                } as CSSProperties}
              />
            )
          })
        ) : (
          <div className="absolute inset-x-6 bottom-3 grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[5/7] rounded-sm border border-sidebar-border/60 bg-muted/45"
              />
            ))}
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 h-11 bg-gradient-to-t from-card/90 from-[0%] via-card/45 via-[38%] to-transparent" />
      <div className="absolute inset-x-3 bottom-2 z-30 flex items-center justify-between gap-3">
        <div className="px-2 py-1">
          <ManaSymbols colors={[...colors]} />
        </div>
        <Badge
          variant="secondary"
          className="h-7 max-w-[11rem] justify-start rounded-md border border-sidebar-border/70 bg-background/90 px-2.5 text-[11px] font-medium text-foreground shadow-sm hover:bg-background/90"
        >
          <FormatLabel format={deck.format} />
        </Badge>
      </div>
    </div>
  )
}

export function DeckGalleryTile({
  deck,
  onDeckClick,
}: {
  deck: DeckGalleryItem
  onDeckClick?: (deckRevisionId: number, deck: DeckGalleryItem) => void
}) {
  const stats = getDeckMatchStats(deck)
  const previewCards = deck.featuredCards ?? []
  const interactive = Boolean(onDeckClick)

  const content = (
    <Card className="group relative min-w-0 overflow-visible border-sidebar-border/60 bg-card transition-colors hover:z-20 hover:border-primary/35 hover:bg-muted/15 focus-within:z-20">
      <DeckHeroPreview deck={deck} cards={previewCards} />

      {interactive ? (
        <span
          className="absolute right-3 top-3 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full border border-sidebar-border/70 bg-background/85 text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover/editor:opacity-100 group-focus-visible/editor:opacity-100"
          aria-hidden="true"
        >
          <SquarePen className="h-4 w-4" />
        </span>
      ) : null}

      <CardContent className="relative z-20 bg-card p-3 pb-2">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold leading-5">{deck.name}</h2>
            <p className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
              {deck.archetype || 'Unclassified deck'}
            </p>
          </div>
          <DeckWinrateMetric stats={stats} />
        </div>
      </CardContent>
      <div className="relative z-20 rounded-b-lg bg-card px-3 pb-3">
        <DeckWinrateBar stats={stats} />
      </div>
    </Card>
  )

  if (!interactive) {
    return <div className="min-w-0">{content}</div>
  }

  return (
    <button
      type="button"
      onClick={() => onDeckClick?.(deck.revisionId, deck)}
      className="group/editor block min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      aria-label={`Open ${deck.name} in deck editor`}
    >
      {content}
    </button>
  )
}
