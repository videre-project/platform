/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useState } from 'react'
import { BASIC_LAND_NAMES } from '@videreproject/constants'
import type { DatePickerWithRangeProps } from '@videreproject/ui'
import { fetchSharedJSON } from './apiClient'
import { toDateParameter } from './dateParameters'

type DateRange = NonNullable<DatePickerWithRangeProps['date']>

const API_BASE_URL = 'https://api.videreproject.com'
const METAGAME_LIMIT = 100
const ARCHETYPE_LIMIT = METAGAME_LIMIT
const MAX_SHIFTS_PER_DIRECTION = 5
export const MIN_COMPARABLE_GAMES = 10
const CARD_LOOKUP_CONCURRENCY = 4

interface APIResponse<T> {
  data: T
}

interface MetagameAPIRecord {
  id: number
  archetype: string
  count: number
  percentage: string
  game_count: number
  game_winrate: string
  game_ci: string
}

interface CardAPIRecord {
  card: string
  count: number
  percentage: string
  average: number
}

interface CardFaceAPIRecord {
  mana_cost: string | null
}

interface CardCatalogAPIRecord {
  id: number
  name: string
  canonical_name?: string
  display_name?: string
  mana_cost: string | null
  faces?: CardFaceAPIRecord[]
}

interface ArchetypeAPIRecord {
  id: number
  archetype: string
  count: number
  mainboard: CardAPIRecord[]
  sideboard: CardAPIRecord[]
}

interface MatchupAPIRecord {
  archetype: string
  game_count: number
  game_winrate: string
  game_ci: string
}

interface MatchupMatrixAPIRecord {
  id: number | null
  archetype: string
  matchups: MatchupAPIRecord[]
}

interface Period {
  from: Date
  to: Date
}

interface PeriodData {
  label: string
  rows: MetagameAPIRecord[]
  archetypes: ArchetypeAPIRecord[]
  matchups: MatchupMatrixAPIRecord[]
}

export interface DeckMover {
  id: number
  archetype: string
  current: MetagameAPIRecord | undefined
  previous: MetagameAPIRecord | undefined
  currentRank: number | undefined
  previousRank: number | undefined
  change: number
}

export interface MetagameMatchupChange {
  archetype: string
  opponent: string
  currentWinrate: number | undefined
  currentConfidenceInterval: number | undefined
  previousWinrate: number | undefined
  previousConfidenceInterval: number | undefined
  currentGames: number | undefined
  previousGames: number | undefined
  change: number | undefined
}

export type CardMoverZone = 'mainboard' | 'sideboard'

export interface CardMover {
  card: string
  catalogId: number | null
  zone: CardMoverZone
  manaCosts: string[]
  currentPercentage: number
  previousPercentage: number
  currentAverage: number
  previousAverage: number
  change: number
}

export interface MetagameMoversData {
  currentPeriod: string
  previousPeriod: string
  risingDecks: DeckMover[]
  fallingDecks: DeckMover[]
  risingCards: CardMover[]
  fallingCards: CardMover[]
  topDeckMovers: DeckMover[]
  shareMaximum: number
  winrateMinimum: number
  winrateMaximum: number
  matchupColumns: string[]
  matchupChanges: MetagameMatchupChange[]
}

interface UseMetagameMoversResult {
  requestKey: string
  data: MetagameMoversData | null
  loading: boolean
  error: string | null
  cardLoading: boolean
  cardError: string | null
}

const parsePercentage = (value: string): number => {
  const parsed = Number.parseFloat(value.replace(/[±%]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const getCardShare = (record: CardAPIRecord | undefined, archetype: ArchetypeAPIRecord): number => {
  if (!record) return 0
  if (archetype.count > 0) return (record.count / archetype.count) * 100
  return parsePercentage(record.percentage)
}

const normalizeCardName = (card: string): { key: string, display: string } => {
  const display = card
    .trim()
    .replace(/\s*\/{1,2}\s*/g, ' // ')
    .replace(/\s+/g, ' ')

  return {
    key: display.toLocaleLowerCase(),
    display,
  }
}

const indexCardsByName = (cards: CardAPIRecord[]): Map<string, CardAPIRecord> => {
  const indexed = new Map<string, CardAPIRecord>()
  for (const card of cards) {
    const { key, display } = normalizeCardName(card.card)
    const existing = indexed.get(key)
    if (!existing || card.count > existing.count) {
      indexed.set(key, { ...card, card: display })
    }
  }
  return indexed
}

const getCardCatalogKeys = (card: CardCatalogAPIRecord): string[] => [
  card.name,
  card.canonical_name,
  card.display_name,
].filter((name): name is string => Boolean(name)).map(name => normalizeCardName(name).key)

const getManaCosts = (card: CardCatalogAPIRecord | undefined): string[] => {
  if (!card) return []
  if (card.mana_cost) return [card.mana_cost]
  return (card.faces ?? [])
    .map(face => face.mana_cost)
    .filter((manaCost): manaCost is string => Boolean(manaCost))
}

async function fetchCardCatalog(names: string[], signal: AbortSignal): Promise<Map<string, CardCatalogAPIRecord>> {
  const responses: PromiseSettledResult<CardCatalogAPIRecord | undefined>[] = []
  for (let offset = 0; offset < names.length; offset += CARD_LOOKUP_CONCURRENCY) {
    if (signal.aborted) throw new DOMException('The card catalog request was aborted.', 'AbortError')
    const batch = names.slice(offset, offset + CARD_LOOKUP_CONCURRENCY)
    responses.push(...await Promise.allSettled(batch.map(async name => {
      const parameters = new URLSearchParams({
        exact: name,
        unique: 'cards',
      })
      const payload = await fetchSharedJSON<APIResponse<CardCatalogAPIRecord[]>>(
        `${API_BASE_URL}/cards/named?${parameters}`,
        signal,
      )
      return payload.data[0]
    })))
  }

  if (signal.aborted) throw new DOMException('The card catalog request was aborted.', 'AbortError')

  const catalog = new Map<string, CardCatalogAPIRecord>()
  for (const response of responses) {
    if (response.status !== 'fulfilled' || !response.value) continue
    for (const key of getCardCatalogKeys(response.value)) catalog.set(key, response.value)
  }
  return catalog
}

function getChartScales(current: PeriodData): Pick<MetagameMoversData, 'shareMaximum' | 'winrateMinimum' | 'winrateMaximum'> {
  const topArchetypes = current.rows.slice(0, 16)
  const shareMaximum = Math.max(5, Math.ceil(
    Math.max(...topArchetypes.map(archetype => parsePercentage(archetype.percentage)), 0) / 5,
  ) * 5)
  const spread = Math.max(
    10,
    ...topArchetypes.map(archetype => (
      Math.abs(parsePercentage(archetype.game_winrate) - 50) + parsePercentage(archetype.game_ci)
    )),
  ) * 1.2

  return {
    shareMaximum,
    winrateMinimum: Math.max(0, 50 - spread),
    winrateMaximum: Math.min(100, 50 + spread),
  }
}

const formatPeriod = ({ from, to }: Period): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${formatter.format(from)} – ${formatter.format(to)}`
}

function getPeriods(dateRange: DateRange | undefined): { current: Period, previous: Period } {
  const currentTo = dateRange?.to ?? dateRange?.from ?? new Date()
  const currentFrom = dateRange?.from ?? currentTo
  const duration = Math.max(
    1,
    Math.round((currentTo.getTime() - currentFrom.getTime()) / 86_400_000) + 1,
  )
  const previousTo = new Date(currentFrom)
  previousTo.setDate(previousTo.getDate() - 1)
  const previousFrom = new Date(previousTo)
  previousFrom.setDate(previousFrom.getDate() - duration + 1)

  return {
    current: { from: currentFrom, to: currentTo },
    previous: { from: previousFrom, to: previousTo },
  }
}

async function fetchPeriod(format: string, period: Period, signal: AbortSignal): Promise<PeriodData> {
  const parameters = new URLSearchParams({
    limit: String(METAGAME_LIMIT),
    min_date: toDateParameter(period.from),
    max_date: toDateParameter(period.to),
  })
  const archetypeParameters = new URLSearchParams(parameters)
  archetypeParameters.set('limit', String(ARCHETYPE_LIMIT))
  const matchupParameters = new URLSearchParams(parameters)
  const encodedFormat = encodeURIComponent(format.toLowerCase())
  const [metagamePayload, archetypesPayload, matchupsPayload] = await Promise.all([
    fetchSharedJSON<APIResponse<MetagameAPIRecord[]>>(`${API_BASE_URL}/metagame/${encodedFormat}?${parameters}`, signal),
    fetchSharedJSON<APIResponse<ArchetypeAPIRecord[]>>(`${API_BASE_URL}/archetypes/${encodedFormat}?${archetypeParameters}`, signal),
    fetchSharedJSON<APIResponse<MatchupMatrixAPIRecord[]>>(`${API_BASE_URL}/matchups/${encodedFormat}?${matchupParameters}`, signal),
  ])

  return {
    label: formatPeriod(period),
    rows: metagamePayload.data,
    archetypes: archetypesPayload.data,
    matchups: matchupsPayload.data,
  }
}

function getDeckMovers(current: PeriodData, previous: PeriodData): {
  rising: DeckMover[]
  falling: DeckMover[]
} {
  const currentByArchetype = new Map(current.rows.map(row => [row.archetype, row]))
  const previousByArchetype = new Map(previous.rows.map(row => [row.archetype, row]))
  const archetypes = new Set([...currentByArchetype.keys(), ...previousByArchetype.keys()])
  const movers = [...archetypes].map(archetype => {
    const currentRow = currentByArchetype.get(archetype)
    const previousRow = previousByArchetype.get(archetype)
    return {
      id: currentRow?.id ?? previousRow?.id ?? 0,
      archetype,
      current: currentRow,
      previous: previousRow,
      currentRank: currentRow ? current.rows.indexOf(currentRow) + 1 : undefined,
      previousRank: previousRow ? previous.rows.indexOf(previousRow) + 1 : undefined,
      change: parsePercentage(currentRow?.percentage ?? '0') - parsePercentage(previousRow?.percentage ?? '0'),
    }
  })

  return {
    rising: movers.filter(mover => mover.change > 0).sort((a, b) => b.change - a.change).slice(0, MAX_SHIFTS_PER_DIRECTION),
    falling: movers.filter(mover => mover.change < 0).sort((a, b) => a.change - b.change).slice(0, MAX_SHIFTS_PER_DIRECTION).reverse(),
  }
}

function getCardMovers(current: PeriodData, previous: PeriodData): {
  rising: CardMover[]
  falling: CardMover[]
} {
  const previousByArchetype = new Map(previous.archetypes.map(row => [row.archetype, row]))
  const comparableArchetypes = current.archetypes.flatMap(currentArchetype => {
    const previousArchetype = previousByArchetype.get(currentArchetype.archetype)
    if (!previousArchetype || currentArchetype.count <= 0 || previousArchetype.count <= 0) {
      return []
    }

    return [{
      current: currentArchetype,
      previous: previousArchetype,
      // Use a fixed reference population for both periods. This keeps a deck
      // becoming more or less popular from appearing as a card trend.
      weight: (currentArchetype.count + previousArchetype.count) / 2,
    }]
  })
  const totalWeight = comparableArchetypes.reduce((sum, archetype) => sum + archetype.weight, 0)
  if (totalWeight === 0) return { rising: [], falling: [] }

  const aggregates = new Map<string, {
    card: string
    zone: CardMoverZone
    currentPercentage: number
    previousPercentage: number
    currentCopies: number
    previousCopies: number
  }>()

  for (const { current: currentArchetype, previous: previousArchetype, weight } of comparableArchetypes) {
    for (const zone of ['mainboard', 'sideboard'] as const) {
      const currentCards = indexCardsByName(currentArchetype[zone])
      const previousCards = indexCardsByName(previousArchetype[zone])
      const cards = new Set([...currentCards.keys(), ...previousCards.keys()])

      for (const cardKey of cards) {
        const currentRecord = currentCards.get(cardKey)
        const previousRecord = previousCards.get(cardKey)
        const card = currentRecord?.card ?? previousRecord?.card ?? cardKey
        const key = `${zone}\u0000${cardKey}`
        const aggregate = aggregates.get(key) ?? {
            card,
            zone,
            currentPercentage: 0,
            previousPercentage: 0,
            currentCopies: 0,
            previousCopies: 0,
          }
        const currentShare = getCardShare(currentRecord, currentArchetype)
        const previousShare = getCardShare(previousRecord, previousArchetype)
        aggregate.currentPercentage += weight * currentShare
        aggregate.previousPercentage += weight * previousShare
        aggregate.currentCopies += weight * (currentShare / 100) * (currentRecord?.average ?? 0)
        aggregate.previousCopies += weight * (previousShare / 100) * (previousRecord?.average ?? 0)
        aggregates.set(key, aggregate)
      }
    }
  }

  // The constants package is the authoritative list for filtering basic
  // lands. Looking each one up through /cards/named adds a second round of
  // network work before the card-trends section can render.
  const basicLandKeys = new Set(BASIC_LAND_NAMES.map(name => normalizeCardName(name).key))
  const movers = [...aggregates.values()].filter(aggregate => (
    !basicLandKeys.has(normalizeCardName(aggregate.card).key)
  )).map(aggregate => {
    const currentPercentage = aggregate.currentPercentage / totalWeight
    const previousPercentage = aggregate.previousPercentage / totalWeight
    return {
      card: aggregate.card,
      catalogId: null,
      zone: aggregate.zone,
      manaCosts: [],
      currentPercentage,
      previousPercentage,
      currentAverage: currentPercentage > 0
        ? aggregate.currentCopies / (totalWeight * currentPercentage / 100)
        : 0,
      previousAverage: previousPercentage > 0
        ? aggregate.previousCopies / (totalWeight * previousPercentage / 100)
        : 0,
      change: currentPercentage - previousPercentage,
    }
  })

  const topMovers = (zone: CardMoverZone, rising: boolean): CardMover[] => movers
    .filter(mover => mover.zone === zone && (rising ? mover.change > 0 : mover.change < 0))
    .sort((a, b) => rising ? b.change - a.change : a.change - b.change)
    .slice(0, 5)
  const rising = [
    ...topMovers('mainboard', true),
    ...topMovers('sideboard', true),
  ]
  const falling = [
    ...topMovers('mainboard', false),
    ...topMovers('sideboard', false),
  ]
  return { rising, falling }
}

async function enrichCardMovers(
  cards: { rising: CardMover[], falling: CardMover[] },
  signal: AbortSignal,
): Promise<{ rising: CardMover[], falling: CardMover[] }> {
  const catalog = await fetchCardCatalog(
    [...new Set([...cards.rising, ...cards.falling].map(mover => mover.card))],
    signal,
  )
  const addManaCosts = (mover: CardMover): CardMover => ({
    ...mover,
    catalogId: catalog.get(normalizeCardName(mover.card).key)?.id ?? null,
    manaCosts: getManaCosts(catalog.get(normalizeCardName(mover.card).key)),
  })

  return {
    rising: cards.rising.map(addManaCosts),
    falling: cards.falling.map(addManaCosts),
  }
}

function getMatchupChanges(
  current: PeriodData,
  previous: PeriodData,
  topDeckMovers: DeckMover[],
): { columns: string[], changes: MetagameMatchupChange[] } {
  const currentColumns = current.rows.slice(0, 16)
  const currentOrder = new Map(currentColumns.map((row, index) => [row.archetype, index]))
  const previousShare = new Map(previous.rows.map(row => [row.archetype, parsePercentage(row.percentage)]))
  const columns = [...currentColumns]
    .sort((left, right) => {
      const leftShare = previousShare.get(left.archetype)
      const rightShare = previousShare.get(right.archetype)
      if (leftShare === undefined && rightShare === undefined) {
        return currentOrder.get(left.archetype)! - currentOrder.get(right.archetype)!
      }
      if (leftShare === undefined) return 1
      if (rightShare === undefined) return -1
      return rightShare - leftShare || currentOrder.get(left.archetype)! - currentOrder.get(right.archetype)!
    })
    .map(row => row.archetype)
  const indexMatchupRows = (rows: MatchupMatrixAPIRecord[]) => {
    const indexed = new Map<string, MatchupMatrixAPIRecord>()
    for (const row of rows) {
      const existing = indexed.get(row.archetype)
      if (!existing || (existing.id === null && row.id !== null)) indexed.set(row.archetype, row)
    }
    return indexed
  }
  const currentByArchetype = indexMatchupRows(current.matchups)
  const previousByArchetype = indexMatchupRows(previous.matchups)
  const changes: MetagameMatchupChange[] = []

  for (const mover of topDeckMovers) {
    const currentRow = currentByArchetype.get(mover.archetype)
    const previousRow = previousByArchetype.get(mover.archetype)
    const currentByOpponent = new Map(currentRow?.matchups.map(matchup => [matchup.archetype, matchup]))
    const previousByOpponent = new Map(previousRow?.matchups.map(matchup => [matchup.archetype, matchup]))

    for (const opponent of columns) {
      const currentMatchup = currentByOpponent?.get(opponent)
      const previousMatchup = previousByOpponent?.get(opponent)
      const currentWinrate = currentMatchup ? parsePercentage(currentMatchup.game_winrate) : undefined
      const currentConfidenceInterval = currentMatchup ? parsePercentage(currentMatchup.game_ci) : undefined
      const previousWinrate = previousMatchup ? parsePercentage(previousMatchup.game_winrate) : undefined
      const previousConfidenceInterval = previousMatchup ? parsePercentage(previousMatchup.game_ci) : undefined
      const hasCurrentData = currentMatchup !== undefined
      const hasPreviousData = previousMatchup !== undefined
      const hasComparableData = hasCurrentData && hasPreviousData
        && (currentMatchup?.game_count ?? 0) >= MIN_COMPARABLE_GAMES
        && (previousMatchup?.game_count ?? 0) >= MIN_COMPARABLE_GAMES

      changes.push({
        archetype: mover.archetype,
        opponent,
        currentWinrate: hasCurrentData ? currentWinrate : undefined,
        currentConfidenceInterval: hasCurrentData ? currentConfidenceInterval : undefined,
        previousWinrate: hasPreviousData ? previousWinrate : undefined,
        previousConfidenceInterval: hasPreviousData ? previousConfidenceInterval : undefined,
        currentGames: currentMatchup?.game_count,
        previousGames: previousMatchup?.game_count,
        change: hasComparableData
          ? currentWinrate! - previousWinrate!
          : undefined,
      })
    }
  }

  return { columns, changes }
}

export function useMetagameMovers(format: string, dateRange: DateRange | undefined): UseMetagameMoversResult {
  const periods = getPeriods(dateRange)
  const currentFrom = toDateParameter(periods.current.from)
  const currentTo = toDateParameter(periods.current.to)
  const requestKey = `${format}|${currentFrom}|${currentTo}`
  const [result, setResult] = useState<UseMetagameMoversResult>({
    requestKey,
    data: null,
    loading: true,
    error: null,
    cardLoading: true,
    cardError: null,
  })
  useEffect(() => {
    const controller = new AbortController()
    const { current, previous } = getPeriods(dateRange)
    setResult({
      requestKey,
      data: null,
      loading: true,
      error: null,
      cardLoading: true,
      cardError: null,
    })

    void Promise.all([
      fetchPeriod(format, current, controller.signal),
      fetchPeriod(format, previous, controller.signal),
    ]).then(([current, previous]) => {
      const decks = getDeckMovers(current, previous)
      const cards = getCardMovers(current, previous)
      const topDeckMovers = [...decks.rising, ...decks.falling].sort((a, b) => {
        const aShare = parsePercentage(a.current?.percentage ?? a.previous?.percentage ?? '0')
        const bShare = parsePercentage(b.current?.percentage ?? b.previous?.percentage ?? '0')
        return bShare - aShare || Math.abs(b.change) - Math.abs(a.change)
      })
      const scales = getChartScales(current)
      const matchupChanges = getMatchupChanges(current, previous, topDeckMovers)
      const data: MetagameMoversData = {
        currentPeriod: current.label,
        previousPeriod: previous.label,
        risingDecks: decks.rising,
        fallingDecks: decks.falling,
        risingCards: cards.rising,
        fallingCards: cards.falling,
        topDeckMovers,
        ...scales,
        matchupColumns: matchupChanges.columns,
        matchupChanges: matchupChanges.changes,
      }

      // Publish the shifts as soon as the period and matchup requests have
      // completed. Card catalog lookups are only needed by the lower card
      // trends section and should not delay the chart above it.
      setResult({
        requestKey,
        data,
        loading: false,
        error: null,
        cardLoading: false,
        cardError: null,
      })

      // Mana costs and catalog IDs are presentation enrichment. Keep them out
      // of the critical path so card trends can render with their actual
      // values while the optional card lookups complete.
      void enrichCardMovers(cards, controller.signal)
        .then(cards => {
          if (controller.signal.aborted) return
          setResult(previousResult => {
            if (previousResult.requestKey !== requestKey || !previousResult.data) return previousResult
            return {
              ...previousResult,
              data: {
                ...previousResult.data,
                risingCards: cards.rising,
                fallingCards: cards.falling,
              },
              cardLoading: false,
              cardError: null,
            }
          })
        })
        .catch(reason => {
          if (reason instanceof DOMException && reason.name === 'AbortError') return
          setResult(previousResult => {
            if (previousResult.requestKey !== requestKey) return previousResult
            return {
              ...previousResult,
              cardLoading: false,
              cardError: reason instanceof Error ? reason.message : 'Failed to load card trends',
            }
          })
        })
    }).catch(reason => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return
      setResult({
        requestKey,
        data: null,
        loading: false,
        error: reason instanceof Error ? reason.message : 'Failed to load metagame movers',
        cardLoading: false,
        cardError: null,
      })
    })

    return () => controller.abort()
  }, [currentFrom, currentTo, format, dateRange, requestKey])

  return result.requestKey === requestKey
    ? result
    : {
      requestKey,
      data: null,
      loading: true,
      error: null,
      cardLoading: true,
      cardError: null,
    }
}
