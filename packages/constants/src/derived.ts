/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  RETIRED_FORMATS
} from './constants'
import {
  CARD_RARITIES,
  CARD_RARITY_ALIASES,
  FORMATS,
  type CardRarity,
  type FormatType,
} from './enums.g'

const normalizeLookupKey = (value: string): string =>
  value.toLowerCase().replace(/[-_\s]+/g, ' ').trim()

const CARD_RARITY_LOOKUP = new Map<string, CardRarity>([
  ...CARD_RARITIES.map((rarity) => [normalizeLookupKey(rarity), rarity] as const),
  ...CARD_RARITY_ALIASES.map(({ alias, rarity }) => [
    normalizeLookupKey(alias),
    rarity,
  ] as const),
])

/** Resolve canonical and aliased rarity labels from API, database, or UI input. */
export function normalizeCardRarity(value?: string | null): CardRarity | undefined {
  if (!value) return undefined
  return CARD_RARITY_LOOKUP.get(normalizeLookupKey(value))
}

/** Lowercase wire/OpenAPI format codes derived from generated Title Case FORMATS. */
export type FormatCode = Lowercase<FormatType>

export const FORMAT_CODES = FORMATS.map((format) => format.toLowerCase() as FormatCode)

export type RetiredFormat = typeof RETIRED_FORMATS[number]

const RETIRED_FORMAT_SET = new Set<FormatType>(RETIRED_FORMATS)

export const ACTIVE_FORMATS = FORMATS.filter(
  (format): format is Exclude<FormatType, RetiredFormat> => !RETIRED_FORMAT_SET.has(format),
)

export const RETIRED_FORMAT_CODES = RETIRED_FORMATS.map(
  format => format.toLowerCase() as Lowercase<RetiredFormat>,
)

const RETIRED_FORMAT_CODE_SET = new Set<string>(RETIRED_FORMAT_CODES)

const FORMAT_CODE_SET = new Set<string>(FORMAT_CODES)

export function isFormatCode(value: string): value is FormatCode {
  return FORMAT_CODE_SET.has(value.toLowerCase())
}

export function toFormatCode(value: string): FormatCode | undefined {
  const normalized = value.trim().toLowerCase()
  return FORMAT_CODE_SET.has(normalized) ? (normalized as FormatCode) : undefined
}

export function isRetiredFormat(value: string): value is RetiredFormat {
  return RETIRED_FORMAT_SET.has(value as FormatType)
}

export function isRetiredFormatCode(value: string): value is Lowercase<RetiredFormat> {
  return RETIRED_FORMAT_CODE_SET.has(value.trim().toLowerCase())
}
