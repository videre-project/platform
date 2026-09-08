/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState, useEffect, type ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Info, ExternalLink } from 'lucide-react'
import './ConceptTooltip.css'

export interface WikipediaSummary {
  title: string
  description?: string
  extract?: string
  content_urls?: {
    desktop?: {
      page?: string
    }
  }
}

// In-memory cache to avoid duplicate network requests
const wikipediaCache = new Map<string, WikipediaSummary | null>()
const pendingRequests = new Map<string, Promise<WikipediaSummary | null>>()

async function fetchWikipediaSummary(pageTitle: string): Promise<WikipediaSummary | null> {
  const normalized = pageTitle.trim().replace(/\s+/g, '_')
  if (!normalized) return null

  if (wikipediaCache.has(normalized)) {
    return wikipediaCache.get(normalized)!
  }

  if (pendingRequests.has(normalized)) {
    return pendingRequests.get(normalized)!
  }

  const promise = (async () => {
    try {
      const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(normalized)}`
      const res = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
      })
      if (!res.ok) {
        wikipediaCache.set(normalized, null)
        return null
      }
      const data: WikipediaSummary = await res.json()
      wikipediaCache.set(normalized, data)
      return data
    } catch {
      wikipediaCache.set(normalized, null)
      return null
    } finally {
      pendingRequests.delete(normalized)
    }
  })()

  pendingRequests.set(normalized, promise)
  return promise
}

export interface ConceptTooltipProps {
  /** Wikipedia page title or search slug */
  page?: string
  /** Alias for page */
  term?: string
  /** Custom title override */
  title?: string
  /** Custom description override (if provided, skips Wikipedia API fetch) */
  description?: string
  /** Alias for description */
  blurb?: string
  /** Source attribution name (defaults to "Wikipedia") */
  source?: string
  /** Custom link URL override */
  href?: string
  /** Inline text wrapped by the tooltip */
  children?: ReactNode
  /** Whether to render the subtle (i) info icon. Defaults to true. */
  showIcon?: boolean
  /** Maximum number of lines to display before truncating with an ellipsis. Defaults to 7. */
  maxLines?: number
}

export function ConceptTooltip({
  page,
  term,
  title: customTitle,
  description: customDesc,
  blurb,
  source = 'Wikipedia',
  href: customHref,
  children,
  showIcon = true,
  maxLines = 7,
}: ConceptTooltipProps) {
  const targetPage = (page || term || (typeof children === 'string' ? children : '')).trim()
  const staticDesc = customDesc || blurb

  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<WikipediaSummary | null>(() => {
    if (staticDesc || !targetPage) return null
    return wikipediaCache.get(targetPage.replace(/\s+/g, '_')) || null
  })
  const [isLoading, setIsLoading] = useState(false)

  const prefetch = () => {
    if (staticDesc || !targetPage || data || wikipediaCache.has(targetPage.replace(/\s+/g, '_'))) {
      return
    }
    fetchWikipediaSummary(targetPage).then((result) => {
      if (result) setData(result)
    })
  }

  useEffect(() => {
    if (!isOpen || staticDesc || !targetPage || data) return

    let isMounted = true
    setIsLoading(true)

    fetchWikipediaSummary(targetPage).then((result) => {
      if (!isMounted) return
      setData(result)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [isOpen, targetPage, staticDesc, data])

  const fallbackHref = targetPage
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(targetPage.replace(/\s+/g, '_'))}`
    : 'https://en.wikipedia.org/'

  const finalTitle = customTitle || data?.title || targetPage || 'Concept'
  const finalDescription =
    staticDesc ||
    data?.extract ||
    (isLoading
      ? ''
      : 'A quantitative concept referenced in competitive format analysis.')
  const finalHref = customHref || data?.content_urls?.desktop?.page || fallbackHref

  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <TooltipPrimitive.Trigger asChild>
          <span
            className="concept-tooltip-trigger"
            tabIndex={0}
            role="button"
            onPointerEnter={prefetch}
            onFocus={prefetch}
          >
            <span className="concept-tooltip-text">{children || finalTitle}</span>
            {showIcon && (
              <span className="concept-tooltip-icon-wrap" aria-hidden="true">
                <Info size={11} className="concept-tooltip-icon" />
              </span>
            )}
          </span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="concept-tooltip-content"
            side="top"
            align="center"
            sideOffset={8}
          >
            {isLoading && !data && !staticDesc ? (
              <div className="concept-tooltip-loading" aria-label="Loading Wikipedia summary...">
                <div className="concept-tooltip-skeleton-title" />
                <div className="concept-tooltip-skeleton-line" />
                <div className="concept-tooltip-skeleton-line short" />
              </div>
            ) : (
              <div className="concept-tooltip-body">
                <h4 className="concept-tooltip-title">{finalTitle}</h4>
                <p
                  className="concept-tooltip-desc"
                  style={{
                    WebkitLineClamp: maxLines,
                    lineClamp: maxLines,
                  }}
                >
                  {finalDescription}
                </p>
              </div>
            )}
            <div className="concept-tooltip-footer">
              <a
                href={finalHref}
                target="_blank"
                rel="noopener noreferrer"
                className="concept-tooltip-read-more"
                onClick={(e) => e.stopPropagation()}
              >
                Read more on {source}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
            <TooltipPrimitive.Arrow className="concept-tooltip-arrow" width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
