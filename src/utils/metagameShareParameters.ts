/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { ACTIVE_FORMATS } from '@videreproject/constants'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DEFAULT_FORMAT = 'Standard'
const DEFAULT_RANGE_DAYS = 31

export interface MetagameDateRange {
  from: Date
  to: Date
}

export interface MetagameShareParameters {
  format: string
  dateRange: MetagameDateRange
}

export interface MetagameSearchParameterOptions {
  includeDefaults?: boolean
  now?: Date
}

const toDateParameter = (date: Date): string => {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateParameter(value: string | null): Date | undefined {
  const match = value?.match(ISO_DATE)
  if (!match) return undefined

  const [, year, month, day] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  if (
    parsed.getFullYear() !== Number(year)
    || parsed.getMonth() !== Number(month) - 1
    || parsed.getDate() !== Number(day)
  ) return undefined

  return parsed
}

export function getDefaultMetagameDateRange(now = new Date()): MetagameDateRange {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const from = new Date(to)
  from.setDate(from.getDate() - DEFAULT_RANGE_DAYS)
  return { from, to }
}

export function normalizeMetagameFormat(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase()
  return ACTIVE_FORMATS.find(format => format.toLowerCase() === normalized) ?? DEFAULT_FORMAT
}

export function readMetagameShareParameters(
  search: string | URLSearchParams,
  now = new Date(),
): MetagameShareParameters {
  const parameters = typeof search === 'string' ? new URLSearchParams(search) : search
  const defaults = getDefaultMetagameDateRange(now)
  const minDate = parseDateParameter(parameters.get('min_date'))
  const maxDate = parseDateParameter(parameters.get('max_date'))
  let from = minDate ?? (maxDate ? new Date(maxDate) : defaults.from)
  let to = maxDate ?? (minDate ? new Date(minDate) : defaults.to)

  if (from.getTime() > to.getTime()) [from, to] = [to, from]

  return {
    format: normalizeMetagameFormat(parameters.get('format')),
    dateRange: { from, to },
  }
}

export function createMetagameSearchParameters({
  format,
  dateRange,
}: MetagameShareParameters, {
  includeDefaults = true,
  now = new Date(),
}: MetagameSearchParameterOptions = {}): URLSearchParams {
  const parameters = new URLSearchParams()
  const normalizedFormat = normalizeMetagameFormat(format)
  const defaults = getDefaultMetagameDateRange(now)
  const minDate = toDateParameter(dateRange.from)
  const maxDate = toDateParameter(dateRange.to)
  const defaultMinDate = toDateParameter(defaults.from)
  const defaultMaxDate = toDateParameter(defaults.to)

  if (includeDefaults || normalizedFormat !== DEFAULT_FORMAT) {
    parameters.set('format', normalizedFormat.toLowerCase())
  }
  if (includeDefaults || minDate !== defaultMinDate || maxDate !== defaultMaxDate) {
    parameters.set('min_date', minDate)
    parameters.set('max_date', maxDate)
  }

  return parameters
}

export function createMetagameShareUrl(
  origin: string,
  state: MetagameShareParameters,
): URL {
  const url = new URL('/metagame', origin)
  url.search = createMetagameSearchParameters(state).toString()
  return url
}

export function formatMetagameShareDateRange(dateRange: MetagameDateRange): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${formatter.format(dateRange.from)} – ${formatter.format(dateRange.to)}`
}
