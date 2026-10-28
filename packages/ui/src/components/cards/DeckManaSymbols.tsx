/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { cn } from '../../lib/cn'
import { getDisplayCardColors } from '../../utils/card-colors'
import { getManaSymbolSvgPath } from '../../utils/mana-symbols'

/** An empty color identity is colorless; an omitted identity is unknown. */
export function DeckManaSymbols({ colors, className, symbolClassName }: {
  colors?: readonly string[] | null
  className?: string
  symbolClassName?: string
}) {
  if (!colors) return null
  return (
    <span className={cn('inline-flex h-4 items-center gap-0.5 leading-none', className)}>
      {getDisplayCardColors(colors).map((color, index) => (
        <img key={`${color}-${index}`} src={getManaSymbolSvgPath(color) ?? undefined} alt={color}
          className={cn('block h-3.5 w-3.5 rounded-full bg-background shadow-sm ring-1 ring-background', symbolClassName)} />
      ))}
    </span>
  )
}
