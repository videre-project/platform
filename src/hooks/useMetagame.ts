/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useState } from 'react'
import type { DatePickerWithRangeProps } from '@videreproject/ui'
import { fetchSharedJSON } from './apiClient'
import { toDateParameter } from './dateParameters'
import {
  loadMetagameData,
  type MetagameArchetype,
  type MetagameData,
  type MetagameMatchup,
} from '@/utils/metagameData'

type DateRange = NonNullable<DatePickerWithRangeProps['date']>

const API_BASE_URL = 'https://api.videreproject.com'

interface APIResponse<T> {
  data: T
}

export type { MetagameArchetype, MetagameData, MetagameMatchup }

interface UseMetagameResult {
  requestKey: string
  data: MetagameData | null
  loading: boolean
  error: string | null
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
    setResult({ requestKey, data: null, loading: true, error: null })

    void loadMetagameData(
      format,
      minDate,
      maxDate,
      path => fetchData(path, controller.signal),
    ).then(data => {
      setResult({
        requestKey,
        data,
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
