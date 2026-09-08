/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, type RefObject } from 'react'

export function useHumanEmDash(containerRef: RefObject<HTMLElement | null>, dep: any) {
  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const skipTags = new Set(['CODE', 'PRE', 'SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'MJX-CONTAINER'])

    function walk(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue || ''
        if (text.includes('—')) {
          const parent = node.parentElement
          if (!parent || skipTags.has(parent.tagName) || parent.closest('.katex, code, pre, .human-emdash, mjx-container, .MathJax')) {
            return
          }

          const parts = text.split('—')
          const fragment = document.createDocumentFragment()

          parts.forEach((part, index) => {
            if (part) {
              fragment.appendChild(document.createTextNode(part))
            }
            if (index < parts.length - 1) {
              const span = document.createElement('span')
              span.className = 'human-emdash'
              span.tabIndex = 0
              span.setAttribute('role', 'note')
              span.setAttribute('aria-label', 'Human-generated em dash')

              const dashText = document.createTextNode('—')
              span.appendChild(dashText)

              const tooltip = document.createElement('span')
              tooltip.className = 'human-emdash-tooltip'
              tooltip.setAttribute('aria-hidden', 'true')

              // Check icon SVG
              const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
              svg.setAttribute('viewBox', '0 0 16 16')
              svg.setAttribute('width', '13')
              svg.setAttribute('height', '13')
              svg.setAttribute('fill', 'currentColor')
              svg.setAttribute('class', 'human-emdash-check-icon')

              const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
              path.setAttribute(
                'd',
                'M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zm3.41 5.41a.8.8 0 0 0-1.14 0L6.75 8.93 5.47 7.65a.8.8 0 1 0-1.14 1.14l1.85 1.85a.8.8 0 0 0 1.14 0l4.09-4.09a.8.8 0 0 0 0-1.14z'
              )
              svg.appendChild(path)

              const label = document.createElement('span')
              label.textContent = 'Human-generated em dash'

              tooltip.appendChild(svg)
              tooltip.appendChild(label)
              span.appendChild(tooltip)

              fragment.appendChild(span)
            }
          })

          node.parentNode?.replaceChild(fragment, node)
        }
        return
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement
        if (
          skipTags.has(el.tagName) ||
          el.classList.contains('katex') ||
          el.classList.contains('human-emdash') ||
          el.classList.contains('MathJax') ||
          el.tagName === 'MJX-CONTAINER'
        ) {
          return
        }
        const children = Array.from(node.childNodes)
        for (const child of children) {
          walk(child)
        }
      }
    }

    walk(root)
  }, [containerRef, dep])
}
