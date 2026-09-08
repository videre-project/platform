/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { getManaSymbolSvgPath } from '@videreproject/ui'
import './Mana.css'

/**
 * Renders an MTG mana cost (e.g. "RRWW") as a row of mana symbol icons.
 *
 * Used from MDX articles: the `remarkMana` plugin in vite.config.ts converts
 * mana-cost expressions in prose (e.g. `{RR}{WW}`) into `<Mana cost="RRWW" />`
 * elements and injects the import automatically.
 */
export function Mana({ cost }: { cost: string }) {
  return (
    <span className="article-mana-cost" role="img" aria-label={`Mana cost ${cost}`}>
      {cost.split('').map((symbol, index) => {
        const src = getManaSymbolSvgPath(symbol)
        return src ? (
          <img key={`${symbol}-${index}`} src={src} alt="" className="article-mana-cost-symbol" />
        ) : null
      })}
    </span>
  )
}
