/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'
import { cardImageUrl, useCardImage } from './use-card-image'
import './CardName.css'

export interface CardNameProps {
  /** The italic text. When it matches a card name, hovering (or focusing)
   *  shows a full-card preview; otherwise it renders as a plain `<em>`. */
  children?: ReactNode
  className?: string
  [key: string]: unknown
}

/**
 * Drop-in replacement for `<em>` in article prose. The text is resolved
 * against the Videre card catalog; when it is a card name, the term gets a
 * hover (and keyboard-focus) full-card preview, matching the CardShowcase
 * and TournamentSnapshot previews. Anything that is not a card name
 * (deck names, event names, emphasis) renders as a plain `<em>`, unchanged.
 */
export function CardName({ children, className, node, ...rest }: CardNameProps) {
  const text = typeof children === 'string' ? children.trim() : ''
  const resolvable = text.length >= 2 && text.length <= 60
  const record = useCardImage(resolvable ? text : '')
  const url = cardImageUrl(record)

  if (!url) {
    return (
      <em className={className} {...rest}>
        {children}
      </em>
    )
  }

  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <em
            className={`card-name-em${className ? ` ${className}` : ''}`}
            {...rest}
            tabIndex={0}
            aria-label={`View full card: ${text}`}
          >
            {children}
          </em>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="card-name-full-tooltip"
            side="top"
            align="center"
            sideOffset={8}
          >
            <img src={url} alt={text} className="card-name-full-img" loading="eager" />
            <TooltipPrimitive.Arrow
              className="card-name-tooltip-arrow"
              width={10}
              height={5}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
