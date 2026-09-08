/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useState, useCallback, type RefObject } from 'react'

export interface TocItem {
  id: string
  text: string
  level: number // 2 for h2, 3 for h3
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function useTableOfContents(
  containerRef: RefObject<HTMLElement | null>,
  contentKey?: unknown
) {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  // Scan headings from container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const headingElements = container.querySelectorAll<HTMLHeadingElement>('h2, h3')
    const tocItems: TocItem[] = []
    const usedSlugs = new Set<string>()

    headingElements.forEach((el) => {
      const text = el.textContent?.trim() || ''
      if (!text) return

      let id = el.id
      if (!id) {
        let baseSlug = slugify(text) || 'section'
        let slug = baseSlug
        let counter = 1
        while (usedSlugs.has(slug) || document.getElementById(slug)) {
          slug = `${baseSlug}-${counter}`
          counter++
        }
        id = slug
        el.id = id
      }
      usedSlugs.add(id)

      // The appendix is lifted into its own band with a dedicated table of
      // contents, so keep its headings out of the main sidebar. Their ids are
      // still assigned above so the appendix TOC can link to them.
      if (el.closest('.article-appendix')) return

      tocItems.push({
        id,
        text,
        level: el.tagName === 'H2' ? 2 : 3,
      })
    })

    setItems(tocItems)
    if (tocItems.length > 0 && !activeId) {
      setActiveId(tocItems[0].id)
    }
  }, [containerRef, contentKey])

  // Scroll spy observer
  useEffect(() => {
    const container = containerRef.current
    if (!container || items.length === 0) return

    const headingElements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    if (headingElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible headings
        const visibleEntries = entries.filter((e) => e.isIntersecting)
        if (visibleEntries.length > 0) {
          // Pick the first intersecting heading from the top
          setActiveId(visibleEntries[0].target.id)
          return
        }

        // Fallback: check which heading is closest above top of viewport
        let currentActive = items[0]?.id || ''
        for (const el of headingElements) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 120) {
            currentActive = el.id
          } else {
            break
          }
        }
        setActiveId(currentActive)
      },
      {
        rootMargin: '-80px 0px -65% 0px',
        threshold: [0, 1],
      }
    )

    headingElements.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
    }
  }, [containerRef, items])

  const scrollTo = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const topOffset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.scrollY - topOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
      window.history.pushState(null, '', `#${id}`)
      setActiveId(id)
    }
  }, [])

  return { items, activeId, scrollTo }
}
