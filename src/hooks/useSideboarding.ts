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
// Sideboarding matchup rows are ordered by Game 1 volume, which can differ
// from the metagame ordering. Fetch a small cushion beyond the chart's
// sixteen columns without asking the API to aggregate every archetype.
const SIDEBOARDING_MATRIX_LIMIT = 25

interface APIResponse<T> {
  data: T
}

interface SideboardingAPIRecord {
  id: number
  archetype: string
  game_one_count: number
  game_one_winrate: string
  game_one_ci: string
  postboard_game_count: number | null
  postboard_game_winrate: string | null
  postboard_game_ci: string | null
}

interface SideboardingMatchupAPIRecord {
  id: number
  archetype: string
  game_one_count: number
  game_one_winrate: string
  game_one_ci: string
  postboard_game_count: number | null
  postboard_game_winrate: string | null
  postboard_game_ci: string | null
}

interface SideboardingMatrixAPIRecord {
  id: number
  archetype: string
  matchups: SideboardingMatchupAPIRecord[]
}

export interface SideboardingMetric {
  games: number
  winrate: number
  confidenceInterval: number
}

export interface SideboardingRow {
  id: number
  archetype: string
  gameOne: SideboardingMetric
  postboard: SideboardingMetric | null
}

export interface SideboardingMatchup {
  archetype: string
  opponent: string
  gameOne: SideboardingMetric
  postboard: SideboardingMetric | null
}

export interface SideboardingData {
  rows: SideboardingRow[]
  matchups: SideboardingMatchup[]
}

interface UseSideboardingResult {
  requestKey: string
  data: SideboardingData | null
  loading: boolean
  error: string | null
}

const parsePercentage = (value: string | null): number | null => {
  if (value === null) return null
  const parsed = Number.parseFloat(value.replace(/[±%]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function useSideboarding(
  format: string,
  dateRange: DateRange | undefined,
): UseSideboardingResult {
  const minDate = toDateParameter(dateRange?.from)
  const maxDate = toDateParameter(dateRange?.to ?? dateRange?.from)
  const requestKey = `${format}|${minDate ?? ''}|${maxDate ?? ''}`
  const [result, setResult] = useState<UseSideboardingResult>({
    requestKey,
    data: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    const parameters = new URLSearchParams({ limit: '100' })
    const matchupParameters = new URLSearchParams({ limit: String(SIDEBOARDING_MATRIX_LIMIT) })
    if (minDate) parameters.set('min_date', minDate)
    if (maxDate) parameters.set('max_date', maxDate)
    if (minDate) matchupParameters.set('min_date', minDate)
    if (maxDate) matchupParameters.set('max_date', maxDate)

    setResult({ requestKey, data: null, loading: true, error: null })

    const encodedFormat = encodeURIComponent(format.toLowerCase())
    const fetchData = async <T,>(path: string): Promise<T> => {
      const payload = await fetchSharedJSON<APIResponse<T>>(`${API_BASE_URL}${path}`, controller.signal)
      return payload.data
    }

    void Promise.all([
      fetchData<SideboardingAPIRecord[]>(`/sideboarding/${encodedFormat}?${parameters}`),
      fetchData<SideboardingMatrixAPIRecord[]>(`/sideboarding/${encodedFormat}/matchups?${matchupParameters}`),
    ])
      .then(([summaryRows, matrixRows]) => {
        const toMetric = (row: {
          game_one_count: number
          game_one_winrate: string
          game_one_ci: string
          postboard_game_count: number | null
          postboard_game_winrate: string | null
          postboard_game_ci: string | null
        }): { gameOne: SideboardingMetric, postboard: SideboardingMetric | null } | null => {
          const gameOneWinrate = parsePercentage(row.game_one_winrate)
          const gameOneCi = parsePercentage(row.game_one_ci)
          if (gameOneWinrate === null || gameOneCi === null) return null

          const postboardWinrate = parsePercentage(row.postboard_game_winrate)
          const postboardCi = parsePercentage(row.postboard_game_ci)
          return {
            gameOne: {
              games: row.game_one_count,
              winrate: gameOneWinrate,
              confidenceInterval: gameOneCi,
            },
            postboard: postboardWinrate !== null && postboardCi !== null && row.postboard_game_count !== null
              ? {
                games: row.postboard_game_count,
                winrate: postboardWinrate,
                confidenceInterval: postboardCi,
              }
              : null,
          }
        }

        const rows = summaryRows.flatMap(row => {
          const metrics = toMetric(row)
          return metrics ? [{ id: row.id, archetype: row.archetype, ...metrics }] : []
        })
        const matchups = matrixRows.flatMap(row => row.matchups.flatMap(matchup => {
          const metrics = toMetric(matchup)
          return metrics ? [{ archetype: row.archetype, opponent: matchup.archetype, ...metrics }] : []
        }))

        setResult({ requestKey, data: { rows, matchups }, loading: false, error: null })
      })
      .catch(reason => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setResult({
          requestKey,
          data: null,
          loading: false,
          error: reason instanceof Error ? reason.message : 'Failed to load sideboarding data',
        })
      })

    return () => controller.abort()
  }, [format, maxDate, minDate, requestKey])

  return result.requestKey === requestKey
    ? result
    : { requestKey, data: null, loading: true, error: null }
}
