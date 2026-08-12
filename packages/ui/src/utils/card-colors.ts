/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { COLORLESS_CARD_COLOR } from './card-search-model'

/** Prefer real colors; fall back to colorless for empty identity. */
export function getDisplayCardColors(
  colors?: readonly string[] | null,
): readonly string[] {
  return colors && colors.length > 0 ? colors : [COLORLESS_CARD_COLOR]
}
