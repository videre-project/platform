/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, List } from 'lucide-react'
import type { TocItem } from '@/hooks/useTableOfContents'

interface TableOfContentsProps {
  items: TocItem[]
  activeId: string
  onSelect: (id: string) => void
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  activeId,
  onSelect,
}) => {
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number; opacity: number }>({
    top: 0,
    height: 0,
    opacity: 0,
  })
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!listRef.current || !activeId) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
      return
    }

    const activeEl = listRef.current.querySelector<HTMLElement>(`[data-toc-id="${activeId}"]`)
    if (activeEl) {
      const parentRect = listRef.current.getBoundingClientRect()
      const activeRect = activeEl.getBoundingClientRect()

      setIndicatorStyle({
        top: activeRect.top - parentRect.top,
        height: activeRect.height,
        opacity: 1,
      })
    }
  }, [activeId, items])

  if (items.length === 0) return null

  return (
    <nav className="article-toc-nav" aria-label="Table of contents">
      <div className="article-toc-header">
        <span>Contents</span>
      </div>
      <div className="article-toc-container">
        <div
          className="article-toc-active-bar"
          style={{
            transform: `translateY(${indicatorStyle.top}px)`,
            height: `${indicatorStyle.height}px`,
            opacity: indicatorStyle.opacity,
          }}
          aria-hidden="true"
        />
        <ul ref={listRef} className="article-toc-list">
          {items.map((item) => {
            const isActive = item.id === activeId
            return (
              <li
                key={item.id}
                data-toc-id={item.id}
                className={`article-toc-item article-toc-level-${item.level} ${
                  isActive ? 'is-active' : ''
                }`}
              >
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onSelect(item.id)
                  }}
                  className="article-toc-link"
                >
                  {item.text}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export const MobileTableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  activeId,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const activeItem = items.find((item) => item.id === activeId) || items[0]

  if (items.length === 0) return null

  return (
    <div className="article-mobile-toc">
      <button
        type="button"
        className="article-mobile-toc-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="article-mobile-toc-trigger-text">
          <List size={14} className="article-mobile-toc-icon" aria-hidden="true" />
          <span className="article-mobile-toc-label">On this page:</span>
          <span className="article-mobile-toc-active-title">
            {activeItem?.text}
          </span>
        </div>
        <ChevronDown
          size={15}
          className={`article-mobile-toc-chevron ${isOpen ? 'is-open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul className="article-mobile-toc-list">
          {items.map((item) => {
            const isActive = item.id === activeId
            return (
              <li
                key={item.id}
                className={`article-mobile-toc-item article-mobile-toc-level-${item.level} ${
                  isActive ? 'is-active' : ''
                }`}
              >
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    onSelect(item.id)
                    setIsOpen(false)
                  }}
                  className="article-mobile-toc-link"
                >
                  {item.text}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
