/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export interface MatchDetailsCard {
  catalogId: number
  name: string
  quantity?: number
  bottomed?: boolean
}

export interface MatchDetailsGame {
  id: string
  gameNumber: number
  result: string
  playDraw: string
  duration: string
  openingHand: MatchDetailsCard[]
  sideboarding: {
    in: MatchDetailsCard[]
    out: MatchDetailsCard[]
  }
}

export interface MatchDetailsData {
  eventName: string
  result?: string | null
  isActive?: boolean
  record: string
  format: string
  opponentName?: string | null
  opponentDeckName?: string | null
  opponentDeckArchetype?: string | null
  opponentDeckColors?: string[] | null
  date: string
  duration: string
  deckName?: string | null
  deckArchetype?: string | null
  deckColors?: string[] | null
  /**
   * Host-resolved artwork for the deck preview background. Hosts may provide
   * an art URL or omit this and let the shared layout crop the preview card's
   * modern-frame art box.
   */
  deckBackgroundArtUrl?: string | null
  deckPreviewCards: MatchDetailsCard[]
  games: MatchDetailsGame[]
}
