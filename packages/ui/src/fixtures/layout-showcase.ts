/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

/* Deterministic showcase data for layout stories and visual baselines. */

import type { DashboardArchetype, DashboardStats, PerformanceTrendPoint } from '../types/dashboard'
import type { DeckEditorCard, DeckGalleryItem } from '../types/decks'
import type { StandingEntry, TournamentEvent } from '../types/events'
import type { GameLogEntry } from '../types/game-log'
import type { MatchHistoryItem } from '../types/history'
import type { TradePartner, TradePost } from '../types/trades-page'

const ANCHOR = new Date('2026-08-01T12:00:00.000Z')

function daysAgo(days: number, hour = 12) {
  const d = new Date(ANCHOR)
  d.setUTCDate(d.getUTCDate() - days)
  d.setUTCHours(hour, 0, 0, 0)
  return d
}

function iso(days: number, hour = 12) {
  return daysAgo(days, hour).toISOString()
}

export const SHOWCASE_FORMATS = [
  'Modern',
  'Legacy',
  'Pioneer',
  'Standard',
  'Pauper',
] as const

// -- History --

export const HISTORY_SHOWCASE_ITEMS: MatchHistoryItem[] = [
  {
    id: 9001,
    eventId: 501,
    eventName: 'Modern Challenge',
    format: 'Modern',
    startTime: iso(1, 18),
    result: 'Win',
    record: '2-1-0',
    duration: '42m 10s',
    deckName: 'Rakdos Scam',
    deckColors: ['B', 'R'],
    opponentName: 'OpponentA',
    opponentDeckArchetype: 'Yawgmoth',
    opponentDeckColors: ['B', 'G'],
  },
  {
    id: 9002,
    eventId: 502,
    eventName: 'Legacy League',
    format: 'Legacy',
    startTime: iso(2, 20),
    result: 'Loss',
    record: '0-2-0',
    duration: '28m 05s',
    deckName: 'Reanimator',
    deckColors: ['B'],
    opponentName: 'OpponentB',
    opponentDeckName: 'Death & Taxes',
    opponentDeckColors: ['W'],
  },
  {
    id: 0,
    eventId: 503,
    eventName: 'Pioneer Showcase',
    format: 'Pioneer',
    startTime: iso(0, 10),
    result: 'In Progress',
    record: '1-0-0',
    duration: '—',
    deckName: 'Izzet Phoenix',
    deckColors: ['U', 'R'],
    isEvent: true,
    isActive: true,
    matches: [
      {
        id: 9003,
        eventId: 503,
        eventName: 'Pioneer Showcase',
        format: 'Pioneer',
        startTime: iso(0, 10),
        result: 'Win',
        record: '2-0-0',
        duration: '19m 40s',
        deckName: 'Izzet Phoenix',
        deckColors: ['U', 'R'],
        opponentName: 'OpponentC',
        opponentDeckArchetype: 'Rakdos Midrange',
        opponentDeckColors: ['B', 'R'],
      },
    ],
  },
]

// -- Trades marketplace --

export const TRADES_SHOWCASE_POSTS: TradePost[] = [
  {
    posterName: 'TraderOne',
    format: 'Message',
    message: 'WTS {R} Lightning Bolt playset — foils preferred',
  },
  {
    posterName: 'CollectorX',
    format: 'OfferedWantedList',
    message: 'WTB duals, WTS {U}{U} Force of Will',
  },
  {
    posterName: 'PauperPilot',
    format: 'Message',
    message: 'Looking for affinity pieces, have Tron lands',
  },
]

export const TRADES_SHOWCASE_PARTNERS: TradePartner[] = [
  { posterName: 'Alice', lastTradeTime: iso(3) },
  { posterName: 'Bob', lastTradeTime: iso(7) },
  { posterName: 'Carol', lastTradeTime: iso(14) },
]

// -- Dashboard --

export const DASHBOARD_SHOWCASE_STATS: DashboardStats = {
  overallWinrate: 58.3,
  totalMatches: 120,
  wins: 70,
  losses: 45,
  ties: 5,
  playWinrate: 61.2,
  playMatches: 60,
  drawWinrate: 55.0,
  drawMatches: 60,
  averageDuration: '24m 12s',
  durationTwoGames: '18m 40s',
  durationThreeGames: '31m 05s',
}

export const DASHBOARD_SHOWCASE_TREND: PerformanceTrendPoint[] = Array.from({ length: 14 }, (_, i) => {
  const d = daysAgo(13 - i)
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const winrate = 50 + (i % 5) * 2
  return {
    date: label,
    rawDate: d.toISOString(),
    winrate,
    matches: 4 + (i % 3),
    rollingAvg: 52 + i * 0.4,
    ci95: [winrate - 8, winrate + 8],
    ci80: [winrate - 5, winrate + 5],
    ci50: [winrate - 2, winrate + 2],
  }
})

export const DASHBOARD_SHOWCASE_ARCHETYPES: DashboardArchetype[] = [
  {
    archetype: 'Rakdos Scam',
    colors: ['B', 'R'],
    matches: 40,
    wins: 24,
    losses: 16,
    winrate: 60,
    topCard: 'Grief',
  },
  {
    archetype: 'Yawgmoth',
    colors: ['B', 'G'],
    matches: 28,
    wins: 15,
    losses: 13,
    winrate: 53.6,
    topCard: 'Yawgmoth, Thran Physician',
  },
  {
    archetype: 'Murktide',
    colors: ['U', 'B'],
    matches: 22,
    wins: 12,
    losses: 10,
    winrate: 54.5,
    topCard: 'Murktide Regent',
  },
]

// -- Decks gallery --

export const DECKS_SHOWCASE_ITEMS: DeckGalleryItem[] = [
  {
    revisionId: 101,
    name: 'Rakdos Scam',
    format: 'Modern',
    archetype: 'Rakdos Scam',
    colors: ['B', 'R'],
    wins: 24,
    losses: 16,
    ties: 0,
    featuredCards: [
      { catalogId: 1, name: 'Grief', quantity: 4 },
      { catalogId: 2, name: 'Fury', quantity: 3 },
      { catalogId: 3, name: 'Ragavan, Nimble Pilferer', quantity: 4 },
    ],
  },
  {
    revisionId: 102,
    name: 'Reanimator',
    format: 'Legacy',
    archetype: 'Reanimator',
    colors: ['B'],
    wins: 12,
    losses: 8,
    ties: 1,
    featuredCards: [
      { catalogId: 4, name: 'Entomb', quantity: 4 },
      { catalogId: 5, name: 'Reanimate', quantity: 4 },
    ],
  },
  {
    revisionId: 103,
    name: 'Izzet Phoenix',
    format: 'Pioneer',
    colors: ['U', 'R'],
    wins: 18,
    losses: 12,
    ties: 0,
    featuredCards: [
      { catalogId: 6, name: 'Arclight Phoenix', quantity: 4 },
      { catalogId: 7, name: 'Consider', quantity: 4 },
    ],
  },
]

// -- Deck editor --

export const DECK_EDITOR_SHOWCASE_CARDS: DeckEditorCard[] = [
  {
    index: 0,
    originalIndex: 0,
    catalogId: 1,
    name: 'Lightning Bolt',
    quantity: 4,
    cmc: 1,
    colors: ['R'],
    types: ['Instant'],
    rarity: 'common',
    zone: 'Mainboard',
  },
  {
    index: 1,
    originalIndex: 1,
    catalogId: 2,
    name: 'Mountain',
    quantity: 20,
    cmc: 0,
    colors: [],
    types: ['Land', 'Basic'],
    rarity: 'common',
    zone: 'Mainboard',
  },
  {
    index: 2,
    originalIndex: 2,
    catalogId: 3,
    name: 'Ragavan, Nimble Pilferer',
    quantity: 4,
    cmc: 1,
    colors: ['R'],
    types: ['Creature'],
    rarity: 'mythic',
    zone: 'Mainboard',
  },
  {
    index: 3,
    originalIndex: 3,
    catalogId: 4,
    name: 'Fury',
    quantity: 3,
    cmc: 5,
    colors: ['R'],
    types: ['Creature'],
    rarity: 'mythic',
    zone: 'Sideboard',
  },
  {
    index: 4,
    originalIndex: 4,
    catalogId: 5,
    name: 'Surgical Extraction',
    quantity: 2,
    cmc: 1,
    colors: ['B'],
    types: ['Instant'],
    rarity: 'rare',
    zone: 'Sideboard',
  },
]

// -- Game log --

function logEntry(
  seq: number,
  type: GameLogEntry['gameLogType'],
  data: unknown,
  offsetMs: number,
): GameLogEntry {
  const ts = new Date(ANCHOR.getTime() + offsetMs)
  return {
    id: 1000 + seq,
    gameId: 42,
    timestamp: ts.toISOString(),
    gameLogType: type,
    data: JSON.stringify(data),
    nonce: seq,
    seq,
    ts,
    deltaMs: seq === 0 ? null : 250,
  }
}

export const GAME_LOG_SHOWCASE_ENTRIES: GameLogEntry[] = [
  logEntry(0, 'GameState', { turn: 1, phase: 'Main1', previousTurn: 0, previousPhase: null }, 0),
  logEntry(
    1,
    'GameAction',
    { type: 'CastSpell', cardName: 'Lightning Bolt', playerName: 'You' },
    1200,
  ),
  logEntry(
    2,
    'ZoneChange',
    {
      cardName: 'Lightning Bolt',
      fromZone: 'Hand',
      toZone: 'Stack',
      type: 'Cast',
    },
    1400,
  ),
  logEntry(
    3,
    'LogMessage',
    { message: 'You cast Lightning Bolt targeting Opponent.' },
    1600,
  ),
  logEntry(
    4,
    'PlayerChange',
    {
      playerName: 'Opponent',
      property: 'Life',
      oldValue: '20',
      newValue: '17',
    },
    2000,
  ),
  logEntry(5, 'GameState', { turn: 1, phase: 'Combat', previousTurn: 1, previousPhase: 'Main1' }, 5000),
]

// -- Events --

export const EVENTS_SHOWCASE_ITEMS: TournamentEvent[] = [
  {
    id: 'ev-1',
    name: 'Modern Challenge',
    format: 'Modern',
    status: 'active',
    type: 'swiss',
    startTime: '11:00 AM',
    endTime: '5:00 PM',
    totalPlayers: 128,
    totalRounds: 8,
    roundNumber: 3,
    wins: 2,
    losses: 0,
    state: 'RoundInProgress',
    _rawStartTime: iso(0, 11),
    _rawEndTime: iso(0, 17),
  },
  {
    id: 'ev-2',
    name: 'Legacy League',
    format: 'Legacy',
    status: 'scheduled',
    type: 'league',
    startTime: '6:00 PM',
    endTime: '10:00 PM',
    totalPlayers: 24,
    minimumPlayers: 8,
    state: 'WaitingToStart',
    _rawStartTime: iso(0, 18),
    _rawEndTime: iso(0, 22),
  },
  {
    id: 'ev-3',
    name: 'Pioneer Showcase',
    format: 'Pioneer',
    status: 'completed',
    type: 'swiss',
    startTime: '9:00 AM',
    endTime: '2:00 PM',
    totalPlayers: 64,
    totalRounds: 6,
    wins: 3,
    losses: 2,
    state: 'Finished',
    _rawStartTime: iso(1, 9),
    _rawEndTime: iso(1, 14),
  },
]

export const EVENT_DETAILS_SHOWCASE_STANDINGS: StandingEntry[] = [
  {
    rank: 1,
    player: 'Player One',
    points: 12,
    record: '4-0-0',
    opponentMatchWinPercentage: '62.5%',
    gameWinPercentage: '75.0%',
    opponentGameWinPercentage: '55.0%',
  },
  {
    rank: 2,
    player: 'Player Two',
    points: 9,
    record: '3-1-0',
    opponentMatchWinPercentage: '58.3%',
    gameWinPercentage: '66.7%',
    opponentGameWinPercentage: '52.0%',
  },
  {
    rank: 3,
    player: 'You',
    points: 9,
    record: '3-1-0',
    opponentMatchWinPercentage: '54.2%',
    gameWinPercentage: '62.5%',
    opponentGameWinPercentage: '50.0%',
  },
  {
    rank: 4,
    player: 'Player Four',
    points: 6,
    record: '2-2-0',
    opponentMatchWinPercentage: '50.0%',
    gameWinPercentage: '50.0%',
    opponentGameWinPercentage: '48.0%',
  },
]
