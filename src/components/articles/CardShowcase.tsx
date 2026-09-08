/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cardImageUrl, useCardImage } from './use-card-image'
import './CardShowcase.css'

export type ShowcaseCard = string | { name: string; set?: string; id?: number }

export interface CardShowcaseProps {
  /** One or more cards to display, centered. Each is a card name or a
   *  `{ name, set?, id? }` object. */
  cards: ShowcaseCard[]
  /** Rendered size of each card. Defaults to "md". */
  size?: 'sm' | 'md' | 'lg'
  /** Optional caption rendered beneath the row of cards. */
  caption?: string
}

function ShowcaseCardItem({ card, size }: { card: ShowcaseCard; size: 'sm' | 'md' | 'lg' }) {
  const name = typeof card === 'string' ? card : card.name
  const set = typeof card === 'string' ? undefined : card.set
  const id = typeof card === 'string' ? undefined : card.id
  const record = useCardImage(name, set, id)
  const url = cardImageUrl(record)

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <figure
          className={`card-showcase-item card-showcase-${size}`}
          tabIndex={0}
          aria-label={`View full card: ${name}${set ? ` (${set})` : ''}`}
        >
          {url ? (
            <img
              src={url}
              alt={name}
              className="card-showcase-img"
              loading="lazy"
            />
          ) : (
            <div className="card-showcase-skeleton">
              <span className="card-showcase-skeleton-name">{name}</span>
            </div>
          )}
        </figure>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="card-showcase-full-tooltip"
          side="top"
          align="center"
          sideOffset={8}
        >
          {url ? (
            <img
              src={url}
              alt={name}
              className="card-showcase-full-img"
              loading="eager"
            />
          ) : (
            <div className="card-showcase-tooltip-fallback">
              <span>{name}</span>
            </div>
          )}
          <TooltipPrimitive.Arrow
            className="card-showcase-tooltip-arrow"
            width={10}
            height={5}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

/**
 * Renders one or more card images centered horizontally, for use inside
 * article prose. Cards resolve their images from the Videre CDN by name,
 * set, or catalog id.
 */
export function CardShowcase({ cards, size = 'md', caption }: CardShowcaseProps) {
  return (
    <div className="card-showcase">
      <TooltipPrimitive.Provider delayDuration={150}>
        <div className="card-showcase-row">
          {cards.map((card, index) => {
            const name = typeof card === 'string' ? card : card.name
            return <ShowcaseCardItem key={`${name}-${index}`} card={card} size={size} />
          })}
        </div>
      </TooltipPrimitive.Provider>
      {caption && <figcaption className="card-showcase-caption">{caption}</figcaption>}
    </div>
  )
}
