/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useMemo, useState } from 'react'
import type { DatePickerWithRangeProps } from '@videreproject/ui'

import { fetchSharedJSON } from './apiClient'
import { toDateParameter } from './dateParameters'

type DateRange = NonNullable<DatePickerWithRangeProps['date']>

const API_BASE_URL = 'https://api.videreproject.com'

export interface EventSummary {
  id: number
  name: string
  date: string
  format: string
  kind: string
  rounds: number
  players: number
}

interface APIResponse<T> {
  data: T
  meta?: {
    has_more?: boolean
    next_offset?: number | null
    limit?: number
    offset?: number
  }
}

export interface EventsPaginationOptions {
  limit?: number
  offset?: number
}

export interface EventsPagination {
  limit: number
  offset: number
  hasMore: boolean
  nextOffset: number | null
}

export interface EventDeck {
  id: number
  event_id: number
  player: string
  mainboard: unknown[]
  sideboard: unknown[]
  deck_name: string | null
  archetype: string | null
}

export interface EventCard {
  id: number
  oracle_id?: string
  name: string
  display_name?: string
  image_url?: string
  mana_cost: string | null
  mana_value: number | null
  type_line: string | null
  colors: string[] | null
  is_multiface?: boolean
  faces?: Array<{
    mana_cost: string | null
    mana_value: number | null
    type_line: string | null
  }>
}

const COLOR_ORDER = ['W', 'U', 'B', 'R', 'G'] as const
const DECK_CARD_TUPLE = /^\((\d+),\s*(?:"([^"]*)"|([^,()]+)),\s*(\d+)\)$/
const EVENT_DATA_BATCH_SIZE = 500

function formatCode(format: string) {
  return encodeURIComponent(format.toLowerCase())
}

function getErrorMessage(reason: unknown) {
  if (reason instanceof DOMException && reason.name === 'AbortError') return null
  return reason instanceof Error ? reason.message : 'Failed to load events'
}

async function fetchEventRows<T>(
  endpoint: 'standings' | 'decks',
  eventId: number,
  signal: AbortSignal,
): Promise<T[]> {
  const rows: T[] = []
  let offset = 0

  while (true) {
    const query = new URLSearchParams({
      event_id: String(eventId),
      limit: String(EVENT_DATA_BATCH_SIZE),
      offset: String(offset),
    })
    const response = await fetchSharedJSON<APIResponse<T[]>>(
      `${API_BASE_URL}/${endpoint}?${query}`,
      signal,
    )
    rows.push(...response.data)

    const hasMore = response.meta?.has_more ?? response.data.length === EVENT_DATA_BATCH_SIZE
    if (!hasMore) break

    const nextOffset = response.meta?.next_offset ?? offset + response.data.length
    if (nextOffset <= offset) break
    offset = nextOffset
  }

  return rows
}

export function useEvents(
  format: string,
  dateRange: DateRange | undefined,
  kind?: string,
  pagination: EventsPaginationOptions = {},
) {
  const limit = pagination.limit ?? 50
  const offset = pagination.offset ?? 0
  const minDate = toDateParameter(dateRange?.from)
  const maxDate = toDateParameter(dateRange?.to ?? dateRange?.from)
  const requestKey = `${format}|${kind ?? ''}|${minDate ?? ''}|${maxDate ?? ''}|${limit}|${offset}`
  const [result, setResult] = useState<{
    requestKey: string
    data: EventSummary[]
    pagination: EventsPagination
    loading: boolean
    error: string | null
  }>({
    requestKey,
    data: [],
    pagination: { limit, offset, hasMore: false, nextOffset: null },
    loading: true,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (kind) params.set('kind', kind)
    if (minDate) params.set('min_date', minDate)
    if (maxDate) params.set('max_date', maxDate)

    setResult({
      requestKey,
      data: [],
      pagination: { limit, offset, hasMore: false, nextOffset: null },
      loading: true,
      error: null,
    })
    void fetchSharedJSON<APIResponse<EventSummary[]>>(
      `${API_BASE_URL}/events/${formatCode(format)}?${params}`,
      controller.signal,
    ).then(payload => {
      const responseLimit = payload.meta?.limit ?? limit
      const responseOffset = payload.meta?.offset ?? offset
      const hasMore = payload.meta?.has_more ?? payload.data.length === responseLimit
      setResult({
        requestKey,
        data: payload.data,
        pagination: {
          limit: responseLimit,
          offset: responseOffset,
          hasMore,
          nextOffset: payload.meta?.next_offset ?? (hasMore ? responseOffset + responseLimit : null),
        },
        loading: false,
        error: null,
      })
    }).catch(reason => {
      const error = getErrorMessage(reason)
      if (error) setResult({
        requestKey,
        data: [],
        pagination: { limit, offset, hasMore: false, nextOffset: null },
        loading: false,
        error,
      })
    })

    return () => controller.abort()
  }, [format, kind, limit, maxDate, minDate, offset, requestKey])

  return result.requestKey === requestKey
    ? result
    : {
        requestKey,
        data: [],
        pagination: { limit, offset, hasMore: false, nextOffset: null },
        loading: true,
        error: null,
      }
}

export interface EventStanding {
  event_id: number
  rank: number
  player: string
  record: string
  points: number
  omwp: number | null
  gwp: number | null
  owp: number | null
  archetype: string | null
  deck_id: number | null
  deck_name: string | null
}

export interface EventDetails {
  event: EventSummary | null
  standings: EventStanding[]
  decks: EventDeck[]
  deckColors: Record<number, string[]>
  cardCatalog: Record<number, EventCard>
}

function getDeckCardIds(entries: unknown[]) {
  return entries.flatMap(entry => {
    if (typeof entry !== 'string') return []
    const match = entry.match(DECK_CARD_TUPLE)
    if (!match) return []
    const id = Number(match[1])
    return Number.isFinite(id) ? [id] : []
  })
}

async function getDeckCardCatalog(decks: EventDeck[], signal: AbortSignal) {
  const cardIds = [...new Set(decks.flatMap(deck => [
    ...getDeckCardIds(deck.mainboard),
    ...getDeckCardIds(deck.sideboard),
  ]))]
  if (cardIds.length === 0) return { deckColors: {}, cardCatalog: {} }

  const cardIdBatches = Array.from({ length: Math.ceil(cardIds.length / 500) }, (_, index) => cardIds.slice(index * 500, (index + 1) * 500))
  const responses = await Promise.all(cardIdBatches.map(ids => fetchSharedJSON<APIResponse<EventCard[]>>(
    `${API_BASE_URL}/cards/search?limit=500&unique=prints`,
    signal,
    {
      method: 'QUERY',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ collection: { ids, mode: 'only', match: 'prints' } }),
    },
  )))
  const cards = responses.flatMap(response => response.data)
  const cardsById = new Map(cards.map(card => [card.id, card]))

  return {
    deckColors: Object.fromEntries(decks.map(deck => [
      deck.id,
      COLOR_ORDER.filter(color => getDeckCardIds(deck.mainboard).some(id => cardsById.get(id)?.colors?.includes(color))),
    ])),
    cardCatalog: Object.fromEntries(cards.map(card => [card.id, card])),
  }
}

export function useSelectedDeckCardCatalog(
  deck: EventDeck | undefined,
  cardCatalog: Record<number, EventCard> | undefined,
) {
  const cardIds = useMemo(() => [...new Set([
    ...getDeckCardIds(deck?.mainboard ?? []),
    ...getDeckCardIds(deck?.sideboard ?? []),
  ])].filter(id => {
    const card = cardCatalog?.[id]
    return card?.is_multiface === true && !card.mana_cost && !card.faces
  }), [cardCatalog, deck])
  const requestKey = cardIds.join(',')
  const [details, setDetails] = useState<Record<number, EventCard>>({})

  useEffect(() => {
    if (cardIds.length === 0) {
      setDetails({})
      return
    }

    const controller = new AbortController()
    void Promise.all(cardIds.map(async id => {
      try {
        const response = await fetchSharedJSON<APIResponse<EventCard[]>>(`${API_BASE_URL}/cards/${id}`, controller.signal)
        return response.data[0] ?? null
      } catch {
        return null
      }
    })).then(cards => {
      if (controller.signal.aborted) return
      setDetails(Object.fromEntries(cards.filter((card): card is EventCard => card != null).map(card => [card.id, card])))
    })

    return () => controller.abort()
  }, [cardIds, requestKey])

  return useMemo(() => ({
    ...cardCatalog,
    ...Object.fromEntries(cardIds.flatMap(id => details[id] ? [[id, details[id]]] : [])),
  }), [cardCatalog, cardIds, details])
}

export function useEventDetails(eventId: number | null) {
  const requestKey = eventId == null ? '' : String(eventId)
  const [result, setResult] = useState<{
    requestKey: string
    data: EventDetails | null
    loading: boolean
    error: string | null
  }>({ requestKey, data: null, loading: eventId != null, error: null })

  useEffect(() => {
    if (eventId == null) {
      setResult({ requestKey: '', data: null, loading: false, error: null })
      return
    }

    const controller = new AbortController()
    const query = new URLSearchParams({ event_id: String(eventId), limit: '100' })
    setResult({ requestKey, data: null, loading: true, error: null })

    void Promise.all([
      fetchSharedJSON<APIResponse<EventSummary[]>>(`${API_BASE_URL}/events?${query}`, controller.signal),
      fetchEventRows<EventStanding>('standings', eventId, controller.signal),
      fetchEventRows<EventDeck>('decks', eventId, controller.signal).catch(reason => {
        if (reason instanceof DOMException && reason.name === 'AbortError') throw reason
        return []
      }),
    ]).then(([eventResponse, standingsResponse, decksResponse]) => {
      setResult({
        requestKey,
        data: {
          event: eventResponse.data[0] ?? null,
          standings: standingsResponse,
          decks: decksResponse,
          deckColors: {},
          cardCatalog: {},
        },
        loading: false,
        error: null,
      })

      void getDeckCardCatalog(decksResponse, controller.signal).then(catalog => {
        if (controller.signal.aborted) return
        setResult(current => current.requestKey === requestKey && current.data
          ? { ...current, data: { ...current.data, ...catalog } }
          : current)
      }).catch(() => undefined)
    }).catch(reason => {
      const error = getErrorMessage(reason)
      if (error) setResult({ requestKey, data: null, loading: false, error })
    })

    return () => controller.abort()
  }, [eventId, requestKey])

  return result.requestKey === requestKey
    ? result
    : { requestKey, data: null, loading: true, error: null }
}

export interface EventMatch {
  id: number
  event_id: number
  round: number
  player: string
  opponent: string | null
  player_deck_id: number | null
  opponent_deck_id: number | null
  record: string
  result: 'win' | 'loss' | 'draw' | string
  isbye: boolean
  games: string[]
  player_deck_name: string | null
  player_archetype: string | null
  opponent_deck_name: string | null
  opponent_archetype: string | null
}

export function useEventMatches(eventId: number | null, player: string | null) {
  const requestKey = eventId == null || player == null ? '' : `${eventId}|${player}`
  const [result, setResult] = useState<{
    requestKey: string
    data: EventMatch[]
    loading: boolean
    error: string | null
  }>({ requestKey, data: [], loading: false, error: null })

  useEffect(() => {
    if (eventId == null || player == null) {
      setResult({ requestKey: '', data: [], loading: false, error: null })
      return
    }

    const controller = new AbortController()
    const query = new URLSearchParams({
      event_id: String(eventId),
      player,
      limit: '100',
    })
    setResult({ requestKey, data: [], loading: true, error: null })

    void fetchSharedJSON<APIResponse<EventMatch[]>>(`${API_BASE_URL}/matches?${query}`, controller.signal)
      .then(payload => {
        const matches = payload.data
          .filter(match => match.player === player && !match.isbye)
          .sort((left, right) => left.round - right.round)
        setResult({ requestKey, data: matches, loading: false, error: null })
      })
      .catch(reason => {
        const error = getErrorMessage(reason)
        if (error) setResult({ requestKey, data: [], loading: false, error })
      })

    return () => controller.abort()
  }, [eventId, player, requestKey])

  return result.requestKey === requestKey
    ? result
    : { requestKey, data: [], loading: true, error: null }
}
