/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  type FormatType,
} from './enums.g'

/** Formats retained in historical data but no longer supported for live play. */
export const RETIRED_FORMATS = [
  'Extended',
  'Classic'
] as const satisfies readonly FormatType[]
