/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useState } from 'react'
import type { DatePickerWithRangeProps } from '@videreproject/ui'
import { fetchSharedJSON } from './apiClient'
import { toDateParameter } from './dateParameters'

type DateRange = NonNullable<DatePickerWithRangeProps['date']>

const API_BASE_URL = 'https://api.videreproject.com'

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

interface MatchupAPIRecord {
  id: number | null
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

interface UseMetagameResult {
  requestKey: string
  data: MetagameData | null
  loading: boolean
  error: string | null
}

const parsePercentage = (value: string): number => {
  const parsed = Number.parseFloat(value.replace(/[±%]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

async function fetchData<T>(path: string, signal: AbortSignal): Promise<T> {
  const payload = await fetchSharedJSON<APIResponse<T>>(`${API_BASE_URL}${path}`, signal)
  return payload.data
}

export function useMetagame(format: string, dateRange: DateRange | undefined): UseMetagameResult {
  const minDate = toDateParameter(dateRange?.from)
  const maxDate = toDateParameter(dateRange?.to ?? dateRange?.from)
  const requestKey = `${format}|${minDate ?? ''}|${maxDate ?? ''}`
  const [result, setResult] = useState<UseMetagameResult>({
    requestKey,
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    // Keep the full current-period response available to the movers hook so
    // both hooks can share the same request. The main chart still renders
    // only the leading sixteen archetypes below.
    const parameters = new URLSearchParams({ limit: '100' })
    if (minDate) parameters.set('min_date', minDate)
    if (maxDate) parameters.set('max_date', maxDate)

    const matchupParameters = new URLSearchParams(parameters)
    // The matchup endpoint ranks its outer rows independently of metagame
    // share. Fetch enough rows to cover every archetype in the top-16 field.
    matchupParameters.set('limit', '100')
    const encodedFormat = encodeURIComponent(format.toLowerCase())

    setResult({ requestKey, data: null, loading: true, error: null })

    void Promise.all([
      fetchData<MetagameAPIRecord[]>(
        `/metagame/${encodedFormat}?${parameters}`,
        controller.signal,
      ),
      fetchData<MatchupMatrixAPIRecord[]>(
        `/matchups/${encodedFormat}?${matchupParameters}`,
        controller.signal,
      ),
    ]).then(([metagameRows, matchupRows]) => {
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
      setResult({
        requestKey,
        data: {
          archetypes,
          matchups,
        },
        loading: false,
        error: null,
      })
    }).catch(reason => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return
      setResult({
        requestKey,
        data: null,
        loading: false,
        error: reason instanceof Error ? reason.message : 'Failed to load metagame data',
      })
    })

    return () => controller.abort()
  }, [format, maxDate, minDate, requestKey])

  return result.requestKey === requestKey
    ? result
    : { requestKey, data: null, loading: true, error: null }
}
