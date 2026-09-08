/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export interface ArchetypeShare {
  name: string
  share: number
  winRate?: number
  homogeneity?: number
  polarity?: number
}

export interface TimelineDataPoint {
  id: string
  date: string        // ISO date YYYY-MM-DD
  displayDate: string // Formatted e.g. "Aug 26, 2024"
  nEff: number
  pMeta?: number
  topDecks: ArchetypeShare[]
  event?: string
  isBnR?: boolean
  bnrCards?: string
  setCode?: string
}

export interface SetMilestone {
  code: string
  name: string
  date: string
  displayDate: string
}

export interface BnRMilestone {
  id: string
  date: string
  displayDate: string
  bannedCards: string[]
  unbannedCards: string[]
  affectedArchetypes: string[]
  // Marks B&R announcements that explicitly listed Modern with no changes.
  // Emergency single-format bans that never addressed Modern are excluded.
  noAction?: boolean
}

export interface YearMarker {
  year: string
  date: string
}

export interface FormatHealthPoint {
  id: string
  name: string
  era: string
  pMeta: number
  nEff: number
  quadrant: string
  summary: string
  color: string
  dx?: number
  dy?: number
  textAnchor?: 'start' | 'middle' | 'end'
}
