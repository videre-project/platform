/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  CARD_COLORS as CARD_COLOR_DEFS,
  normalizeCardRarity,
} from '@videreproject/constants'

import type { DeckEditorCard, DeckMatchStats, DeckSortMode } from '../types/decks'
import { COLORLESS_CARD_COLOR, CARD_RARITIES } from './card-search-model'
import { getDisplayCardColors } from './card-colors'

const UNKNOWN_GROUP = 'Unknown'
const WUBRG_SYMBOLS = CARD_COLOR_DEFS.map(color => color.symbol)

function formatCardRarity(rarity: string): string {
  return rarity.replace(/\b\w/g, letter => letter.toUpperCase())
}

function getRarityGroup(rarity: string): string {
  const normalized = normalizeCardRarity(rarity)
  return normalized ? formatCardRarity(normalized) : UNKNOWN_GROUP
}

const RARITY_COLUMNS = (CARD_RARITIES as readonly string[]).map(formatCardRarity)

/** Group editor cards by the active sort mode. Multicolor cards may appear in multiple color groups. */
export function groupCardsBySortMode(
  cards: DeckEditorCard[],
  mode: DeckSortMode,
): Map<string, DeckEditorCard[]> {
  const groups = new Map<string, DeckEditorCard[]>()

  cards.forEach(card => {
    let keys: string[] = []

    switch (mode) {
      case 'cmc':
        keys = [card.cmc >= 6 ? '6+' : card.cmc.toString()]
        break
      case 'colors':
        keys = [...getDisplayCardColors(card.colors)]
        break
      case 'types':
        keys = card.types.length > 0 ? [card.types[0]] : [UNKNOWN_GROUP]
        break
      case 'rarity':
        keys = [getRarityGroup(card.rarity)]
        break
    }

    keys.forEach(key => {
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(card)
    })
  })

  return groups
}

/** Column order for the given sort mode, only including non-empty columns. */
export function getSortModeColumns(
  mode: DeckSortMode,
  cards: DeckEditorCard[] = [],
): string[] {
  const groups = groupCardsBySortMode(cards, mode)

  switch (mode) {
    case 'cmc':
      return ['0', '1', '2', '3', '4', '5', '6+'].filter(column => groups.has(column))
    case 'colors':
      return [...WUBRG_SYMBOLS, COLORLESS_CARD_COLOR].filter(column => groups.has(column))
    case 'types': {
      const types = new Set(
        cards
          .map(card => card.types[0]?.trim())
          .filter((type): type is string => Boolean(type)),
      )
      const columns = [...types].sort((left, right) => left.localeCompare(right))
      return cards.some(card => !card.types[0]?.trim())
        ? [...columns, UNKNOWN_GROUP]
        : columns
    }
    case 'rarity':
      return [...RARITY_COLUMNS, UNKNOWN_GROUP].filter(column => groups.has(column))
  }
}

/**
 * Flatten sort groups into a single ordered list. Multicolor cards remain a
 * single entry and use their first matching group.
 */
export function sortCardsBySortMode(
  cards: DeckEditorCard[],
  mode: DeckSortMode,
): DeckEditorCard[] {
  const groups = groupCardsBySortMode(cards, mode)
  const ordered: DeckEditorCard[] = []
  const seen = new Set<number>()

  const appendGroup = (group: DeckEditorCard[] | undefined) => {
    group?.forEach(card => {
      if (!seen.has(card.index)) {
        seen.add(card.index)
        ordered.push(card)
      }
    })
  }

  getSortModeColumns(mode, cards).forEach(column => appendGroup(groups.get(column)))
  groups.forEach((group, key) => {
    if (!getSortModeColumns(mode, cards).includes(key)) appendGroup(group)
  })

  return ordered
}

/** Expand quantity into individual unit cards with sequential indices. */
export function unrollCards(cards: DeckEditorCard[]): DeckEditorCard[] {
  const unrolled: DeckEditorCard[] = []
  let newIndex = 0

  for (const card of cards) {
    for (let i = 0; i < card.quantity; i++) {
      unrolled.push({
        ...card,
        index: newIndex++,
        originalIndex: card.originalIndex,
        quantity: 1,
      })
    }
  }

  return unrolled
}

export function getDeckMatchStats(input: {
  wins: number
  losses: number
  ties: number
}): DeckMatchStats {
  const matches = input.wins + input.losses + input.ties
  return {
    winrate: matches > 0 ? Math.round((input.wins / matches) * 1000) / 10 : null,
    matches,
    wins: input.wins,
    losses: input.losses,
    ties: input.ties,
  }
}
