/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export {
  CARD_COLORS,
  CARD_RARITIES,
  CARD_RARITY_ALIASES,
  CARD_RARITY_LADDER,
  CARD_TYPES,
  EVENTS,
  FORMATS,
  RESULTS,
  type CardColor,
  type CardRarity,
  type CardRarityAlias,
  type CardType,
  type EventType,
  type FormatType,
  type RankedCardRarity,
  type ResultType,
} from './enums.g'

export {
  RETIRED_FORMATS,
} from './constants'

export {
  ACTIVE_FORMATS,
  FORMAT_CODES,
  RETIRED_FORMAT_CODES,
  isFormatCode,
  isRetiredFormat,
  isRetiredFormatCode,
  normalizeCardRarity,
  toFormatCode,
  type FormatCode,
  type RetiredFormat,
} from './derived'
