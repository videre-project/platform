/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export interface MetagameAPIRecord {
  id: number
  archetype: string
  count: number
  percentage: string
  game_count: number
  game_winrate: string
  game_ci: string
}

export interface MatchupAPIRecord {
  archetype: string
  game_count: number
  game_winrate: string
  game_ci: string
}

export interface MatchupMatrixAPIRecord {
  id: number | null
  archetype: string
  matchups: MatchupAPIRecord[]
}

export interface MetagameArchetype {
  id: number
  archetype: string
  count: number
  percentage: number
  games: number
  winrate: number
  confidenceInterval: number
}

export interface MetagameMatchup {
  archetype: string
  opponent: string
  games: number
  winrate: number
  confidenceInterval: number
}

export interface MetagameData {
  archetypes: MetagameArchetype[]
  matchups: MetagameMatchup[]
}

export interface MetagameDataFetcher {
  <T>(path: string): Promise<T>
}

const parsePercentage = (value: string): number => {
  const parsed = Number.parseFloat(value.replace(/[±%]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeMetagameData(
  metagameRows: MetagameAPIRecord[],
  matchupRows: MatchupMatrixAPIRecord[],
): MetagameData {
  const archetypes = metagameRows.slice(0, 16).map(row => ({
    id: row.id,
    archetype: row.archetype,
    count: row.count,
    percentage: parsePercentage(row.percentage),
    games: row.game_count,
    winrate: parsePercentage(row.game_winrate),
    confidenceInterval: parsePercentage(row.game_ci),
  }))
  const includedArchetypes = new Set(archetypes.map(row => row.archetype))
  const matchupRowsByArchetype = new Map<string, MatchupMatrixAPIRecord>()
  for (const row of matchupRows) {
    const existing = matchupRowsByArchetype.get(row.archetype)
    if (!existing || (existing.id === null && row.id !== null)) {
      matchupRowsByArchetype.set(row.archetype, row)
    }
  }

  const matchups = [...matchupRowsByArchetype.values()]
    .filter(row => includedArchetypes.has(row.archetype))
    .flatMap(row => row.matchups
      .filter(matchup => includedArchetypes.has(matchup.archetype))
      .map(matchup => ({
        archetype: row.archetype,
        opponent: matchup.archetype,
        games: matchup.game_count,
        winrate: parsePercentage(matchup.game_winrate),
        confidenceInterval: parsePercentage(matchup.game_ci),
      })))

  return { archetypes, matchups }
}

export async function loadMetagameData(
  format: string,
  minDate: string | undefined,
  maxDate: string | undefined,
  fetchData: MetagameDataFetcher,
): Promise<MetagameData> {
  const parameters = new URLSearchParams({ limit: '100' })
  if (minDate) parameters.set('min_date', minDate)
  if (maxDate) parameters.set('max_date', maxDate)

  const encodedFormat = encodeURIComponent(format.toLowerCase())
  const [metagameRows, matchupRows] = await Promise.all([
    fetchData<MetagameAPIRecord[]>(`/metagame/${encodedFormat}?${parameters}`),
    fetchData<MatchupMatrixAPIRecord[]>(`/matchups/${encodedFormat}?${parameters}`),
  ])

  return normalizeMetagameData(metagameRows, matchupRows)
}
