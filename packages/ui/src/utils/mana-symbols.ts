/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { getManaSymbolUrl } from "./videre-cdn"

const MANA_SYMBOL_PATTERN = /^(?:\d+|[A-Z]+|[A-Z0-9]+(?:\/[A-Z0-9]+){1,2})$/

/** MTGO prompt costs can group several symbols in one pair of braces. */
export function splitManaSymbols(value: string): string[] {
  const cost = value.trim().toUpperCase()
  const symbols = cost.match(/\d+|[WUBRGCXYZS]/g)
  return symbols && symbols.join("") === cost ? symbols : [value]
}

export function getManaSymbolSvgPath(symbol: string): string | null {
  const normalizedSymbol = symbol.trim().toUpperCase()
  if (!MANA_SYMBOL_PATTERN.test(normalizedSymbol)) return null

  return getManaSymbolUrl(`${normalizedSymbol.replace(/\//g, "")}.svg`)
}
