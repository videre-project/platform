/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react'
import { DeckGalleryTile } from '@videreproject/ui'

import { useMetagameDecks } from '@/hooks/useMetagameDecks'
import type { MetagameDeck } from '@/hooks/useMetagameDecks'
import './HomePreviews.css'

function navigateTo(path: string) {
  return (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

function SkeletonCard() {
  return (
    <div className="metagame-skeleton-card">
      <div className="metagame-skeleton-hero" />
      <div className="metagame-skeleton-body">
        <div className="metagame-skeleton-line w-2/3" />
        <div className="metagame-skeleton-line w-1/3" />
        <div className="metagame-skeleton-line w-full" />
        <div className="metagame-skeleton-line w-1/4" />
      </div>
    </div>
  )
}

function CarouselSkeleton() {
  return (
    <div className="metagame-fan metagame-fan--skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`skeleton-${i}`} className="metagame-fan-item">
          <SkeletonCard />
        </div>
      ))}
    </div>
  )
}

function MetagameGridContent({ decks }: { decks: MetagameDeck[] }) {
  return (
    <div
      className="metagame-fan"
      role="list"
      aria-label="Leading decks by format"
    >
      {decks.map(entry => (
        <div
          key={`${entry.deck.format}-${entry.deck.revisionId}`}
          className="metagame-fan-item"
          role="listitem"
          title={`${entry.deck.format}: ${entry.deck.name} · ${entry.percentage}, ${entry.matchWinrate} (${entry.deck.wins}-${entry.deck.losses} of ${entry.matchCount} matches)`}
        >
          <DeckGalleryTile deck={entry.deck} />
        </div>
      ))}
    </div>
  )
}

function MetagameFanError() {
  return (
    <div className="metagame-fan-error">
      <p className="text-sm text-muted">
        Couldn't reach the live metagame API right now. This section normally compares the leading
        archetype, field share, and win rate across every online format from{' '}
        <code>api.videreproject.com</code>.
      </p>
      <a href="/api-reference" onClick={navigateTo('/api-reference')} className="metagame-api-chip">
        View the metagame endpoint
      </a>
    </div>
  )
}

/**
 * Cross-format live metagame showcase. Each tile samples the leading archetype
 * from one API format and pairs its current share/win rate with a representative
 * decklist for card-art previews.
 */
export const MetagameFan: React.FC = () => {
  return (
    <section id="metagame-fan" className="metagame-fan-section">
      <div className="container">
        <div className="metagame-fan-copy">
          <h2>Prepare for the decks you&apos;ll actually face</h2>
          <p className="text-sm text-muted">
            Videre Tracker analyzes recent MTGO tournament results across every online format,
            helping you understand which archetypes define the field, how they are performing, and
            what you are likely to encounter.
          </p>
        </div>

        <MetagameFanContent />
      </div>
    </section>
  )
}

function MetagameFanContent() {
  const { decks, loading, error } = useMetagameDecks()

  return loading ? <CarouselSkeleton /> : error ? <MetagameFanError /> : <MetagameGridContent decks={decks} />
}
