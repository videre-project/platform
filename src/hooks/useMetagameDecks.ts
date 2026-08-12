/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useEffect, useState } from 'react'
import { ACTIVE_FORMATS, type FormatCode } from '@videreproject/constants'
import type { DeckFeaturedCard, DeckGalleryItem } from '@videreproject/ui'

const API = 'https://api.videreproject.com'
const CACHE_KEY = 'videre:metagame-formats:v5'
const CACHE_TTL_MS = 1000 * 60 * 2 // 2 minutes

const API_FORMATS = ACTIVE_FORMATS.map(label => ({
  code: label.toLowerCase() as FormatCode,
  label,
}))

interface MetagameRow {
  id: number
  archetype: string
  count: number
  percentage: string
  match_count: number
  match_winrate: string
}

interface DeckRow {
  id: number
  format: string
  deck_name: string | null
  archetype: string | null
  archetype_id: number | null
  mainboard: unknown[]
}

interface CardRow {
  id: number
  colors: string[] | null
}

export interface MetagameDeck {
  deck: DeckGalleryItem
  /** Field share as published by the API (e.g. "9.18%"). */
  percentage: string
  /** Non-mirror matches logged for this archetype. */
  matchCount: number
  /** Published match win rate (e.g. "48.93%"). */
  matchWinrate: string
}

interface UseMetagameDecksResult {
  decks: MetagameDeck[]
  loading: boolean
  error: boolean
  refresh: () => void
}

const BASIC_LANDS = /^(Plains|Island|Swamp|Mountain|Forest|Wastes)$/i
const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'] as const
// Decklist tuples arrive as PostgreSQL-style rows, e.g. (24029,"Breeding Pool",2)
const TUPLE_RE = /^\((\d+),\s*(?:"([^"]*)"|([^,()]+)),\s*(\d+)\)$/

function parseMainboard(mainboard: unknown[]): DeckFeaturedCard[] {
  const cards: DeckFeaturedCard[] = []
  for (const tuple of mainboard) {
    if (typeof tuple !== 'string') continue
    const match = tuple.match(TUPLE_RE)
    if (!match) continue
    const catalogId = Number(match[1])
    const name = match[2] ?? match[3] ?? ''
    const quantity = Number(match[4])
    if (!name || !catalogId) continue
    cards.push({ catalogId, name: name.trim(), quantity })
  }
  return cards
}

function parsePercent(value: string | undefined): number {
  const n = parseFloat(value ?? '')
  return Number.isNaN(n) ? 0 : n
}

async function fetchJson<T>(
  url: string,
  signal: AbortSignal,
  init?: Omit<RequestInit, 'signal'>,
): Promise<T | null> {
  const res = await fetch(url, { ...init, signal })
  if (!res.ok) return null
  return (await res.json()) as T
}

function resolveDeckColors(cards: DeckFeaturedCard[], cardById: Map<number, CardRow>): string[] {
  const colors = new Set(
    cards.flatMap(card => cardById.get(card.catalogId)?.colors ?? []),
  )
  return COLOR_ORDER.filter(color => colors.has(color))
}

/**
 * Samples the leading archetype in every API format, joins each result with a
 * representative decklist for card-art previews, and projects the result into
 * the DeckGalleryItem shape consumed by @videreproject/ui's deck components.
 */
export function useMetagameDecks(): UseMetagameDecksResult {
  const [result, setResult] = useState<UseMetagameDecksResult>({
    decks: [], loading: true, error: false, refresh: () => {},
  })

  const load = useCallback(() => {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const { ts, decks } = JSON.parse(cached) as { ts: number; decks: MetagameDeck[] }
        if (typeof ts === 'number' && Date.now() - ts < CACHE_TTL_MS && Array.isArray(decks)) {
          setResult({ decks, loading: false, error: false, refresh: load })
          return
        }
      } catch { /* expired or malformed -> refetch */ }
    }

    const ac = new AbortController()
    let cancelled = false

    setResult(r => ({ ...r, loading: true }))

    void (async () => {
      const metagameResults = await Promise.allSettled(
        API_FORMATS.map(format =>
          fetchJson<{ data: MetagameRow[] }>(
            `${API}/metagame/${format.code}?limit=1`,
            ac.signal,
          ),
        ),
      )

      if (cancelled) return
      const formatRows = metagameResults.flatMap((settled, index) => {
        if (settled.status !== 'fulfilled' || !settled.value?.data?.length) return []
        const row = settled.value.data.slice().sort((a, b) => b.count - a.count)[0]
        return [{ format: API_FORMATS[index], row }]
      })

      if (formatRows.length === 0) {
        setResult({ decks: [], loading: false, error: true, refresh: load })
        return
      }

      // Fetch one representative decklist for each format's leading archetype.
      // A failed lookup still yields a useful stats tile without card art.
      const deckResults = await Promise.allSettled(
        formatRows.map(({ format, row }) =>
          fetchJson<{ data: DeckRow[] }>(
            `${API}/decks/${format.code}?limit=1&archetype=${encodeURIComponent(row.archetype)}`,
            ac.signal,
          ),
        ),
      )

      const parsedMainboards = deckResults.map(settled => {
        const deck = settled.status === 'fulfilled' ? settled.value?.data?.[0] : undefined
        return deck ? parseMainboard(deck.mainboard ?? []) : []
      })
      const catalogIds = [
        ...new Set(parsedMainboards.flatMap(cards => cards.map(card => card.catalogId))),
      ]
      const cardResponse = catalogIds.length > 0
        ? await fetchJson<{ data: CardRow[] }>(
            `${API}/cards/search?limit=500&unique=prints`,
            ac.signal,
            {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                collection: { ids: catalogIds, mode: 'only', match: 'prints' },
              }),
            },
          )
        : null
      const cardById = new Map((cardResponse?.data ?? []).map(card => [card.id, card]))

      const merged: MetagameDeck[] = formatRows.map(({ format, row }, index) => {
        const settled = deckResults[index]
        const deck =
          settled?.status === 'fulfilled' && settled.value?.data?.[0]
            ? settled.value.data[0]
            : undefined

        const winrate = parsePercent(row.match_winrate)
        const matches = row.match_count
        const wins = Math.round((winrate / 100) * matches)
        const losses = matches - wins
        const mainboard = parsedMainboards[index]
        const featuredCards = mainboard
          .filter(card => !BASIC_LANDS.test(card.name))
          .slice(0, 5)

        const galleryItem: DeckGalleryItem = {
          revisionId: deck?.id ?? row.id,
          name: row.archetype,
          format: format.label,
          // DeckGalleryTile subtitle: field share (e.g. "9.18% of the field").
          archetype: `${row.percentage} of the field`,
          // Match Tracker's deck-color calculation: union the printed colors
          // of every mainboard card, then display them in WUBRG order.
          colors: resolveDeckColors(mainboard, cardById),
          wins,
          losses,
          ties: 0,
          featuredCards,
        }

        return {
          deck: galleryItem,
          percentage: row.percentage,
          matchCount: matches,
          matchWinrate: row.match_winrate,
        }
      })

      setResult({ decks: merged, loading: false, error: false, refresh: load })
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), decks: merged }))
      } catch { /* Ignore storage errors and private browsing restrictions. */ }
    })().catch((e) => {
      if (cancelled) return
      if (e instanceof DOMException && e.name === 'AbortError') return
      setResult({ decks: [], loading: false, error: true, refresh: load })
    })

    return () => {
      cancelled = true
      ac.abort()
    }
  }, [])

  useEffect(() => load(), [load])

  return result
}
