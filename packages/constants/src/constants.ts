/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  type FormatType,
} from './enums.g'

/** Canonical names of basic lands that should not be treated as metagame signals. */
export const BASIC_LAND_NAMES = [
  'Plains',
  'Island',
  'Swamp',
  'Mountain',
  'Forest',
  'Wastes',
  'Snow-Covered Plains',
  'Snow-Covered Island',
  'Snow-Covered Swamp',
  'Snow-Covered Mountain',
  'Snow-Covered Forest',
] as const

/** Formats retained in historical data but no longer supported for live play. */
export const RETIRED_FORMATS = [
  'Extended',
  'Classic'
] as const satisfies readonly FormatType[]
