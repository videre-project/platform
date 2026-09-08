/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useState } from 'react'

export interface VidereCardRecord {
  id: number
  name: string
  set_code?: string
  image_url: string
}

const API_BASE_URL = 'https://api.videreproject.com'
const cardCache = new Map<string, VidereCardRecord | null>()
const pendingCardRequests = new Map<string, Promise<VidereCardRecord | null>>()
/**
 * Successful lookups indexed by card name (any printing). Lets a later
 * name-only mention reuse a printing already fetched elsewhere (e.g. a
 * set-specific snapshot card) instead of falling back to the API's
 * canonical card.
 */
const nameIndex = new Map<string, VidereCardRecord>()

function cacheKey(name: string, setCode?: string, catalogId?: number) {
  return `${name.trim().toLowerCase()}|${setCode?.toLowerCase() || ''}|${catalogId ?? ''}`
}

/**
 * Record a successful lookup under the card's name. Set-specific and
 * catalog lookups are authoritative and always win; canonical fallbacks
 * only fill the slot if no printing was fetched for the name yet.
 */
function indexByName(name: string, record: VidereCardRecord | null, authoritative = true) {
  if (!record) return
  const key = name.trim().toLowerCase()
  if (authoritative || !nameIndex.has(key)) nameIndex.set(key, record)
}

/**
 * Resolve a card to its canonical record by catalog id, exact name + set, or
 * name alone. Results are cached and in-flight requests are de-duplicated so
 * repeated lookups (across components) hit the network only once. Name-only
 * lookups reuse a printing already fetched (or in flight) under any set
 * before falling back to the canonical card.
 */
export async function fetchVidereCard(
  name: string,
  setCode?: string,
  catalogId?: number,
): Promise<VidereCardRecord | null> {
  if (!name.trim() && catalogId === undefined) return Promise.resolve(null)
  const normalized = cacheKey(name, setCode, catalogId)
  if (cardCache.has(normalized)) return cardCache.get(normalized) ?? null
  if (pendingCardRequests.has(normalized)) return pendingCardRequests.get(normalized)!

  // Name-only mentions prioritize printings fetched elsewhere: a printing
  // already cached under any set, or one still being fetched, beats the
  // API's canonical card.
  if (!setCode && catalogId === undefined) {
    const normalizedName = name.trim().toLowerCase()
    const indexed = nameIndex.get(normalizedName)
    if (indexed) {
      cardCache.set(normalized, indexed)
      return indexed
    }
    for (const [key, promise] of Array.from(pendingCardRequests)) {
      if (!key.startsWith(`${normalizedName}|`)) continue
      const awaited = await promise
      if (awaited) {
        cardCache.set(normalized, awaited)
        return awaited
      }
    }
    if (cardCache.has(normalized)) return cardCache.get(normalized) ?? null
  }

  const request = (async () => {
    try {
      if (catalogId !== undefined) {
        const response = await fetch(`${API_BASE_URL}/cards/${catalogId}`)
        if (response.ok) {
          const payload = (await response.json()) as { data?: VidereCardRecord[] }
          const record = payload.data?.[0] ?? null
          if (record) {
            cardCache.set(normalized, record)
            indexByName(name, record)
            return record
          }
        }
      }

      if (setCode) {
        const parameters = new URLSearchParams({
          exact: name,
          set: setCode,
          unique: 'prints',
          limit: '1',
        })
        const response = await fetch(`${API_BASE_URL}/cards?${parameters}`)
        if (response.ok) {
          const payload = (await response.json()) as { data?: VidereCardRecord[] }
          if (payload.data && payload.data.length > 0) {
            const record = payload.data[0]
            cardCache.set(normalized, record)
            indexByName(name, record)
            return record
          }
        }
      }

      // Default or fallback to canonical card lookup
      const fallbackParameters = new URLSearchParams({
        exact: name,
        unique: 'cards',
      })
      const fallbackRes = await fetch(`${API_BASE_URL}/cards/named?${fallbackParameters}`)
      if (!fallbackRes.ok) {
        cardCache.set(normalized, null)
        return null
      }
      const fallbackPayload = (await fallbackRes.json()) as { data?: VidereCardRecord[] }
      const record = fallbackPayload.data?.[0] ?? null
      cardCache.set(normalized, record)
      indexByName(name, record, false)
      return record
    } catch {
      cardCache.set(normalized, null)
      return null
    } finally {
      pendingCardRequests.delete(normalized)
    }
  })()

  pendingCardRequests.set(normalized, request)
  return request
}

/** Best-effort CDN image URL for a resolved card record. */
export function cardImageUrl(record: VidereCardRecord | null): string | null {
  if (!record) return null
  return record.image_url || (record.id ? `https://r2.videreproject.com/cards/${record.id}-300px.png` : null)
}

/**
 * Hook form of {@link fetchVidereCard} for use inside a component. Returns the
 * resolved record once fetched (or null if the card could not be found).
 */
export function useCardImage(name: string, setCode?: string, catalogId?: number) {
  const key = cacheKey(name, setCode, catalogId)
  const [card, setCard] = useState<VidereCardRecord | null>(() => cardCache.get(key) ?? null)

  useEffect(() => {
    let active = true
    if (cardCache.has(key)) {
      setCard(cardCache.get(key) ?? null)
      return
    }
    void fetchVidereCard(name, setCode, catalogId).then((resolved) => {
      if (active) setCard(resolved)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return card
}
