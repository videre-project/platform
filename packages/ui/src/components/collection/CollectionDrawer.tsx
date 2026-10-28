/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react'
import { type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '../../primitives/Button'

const COLLAPSED_HEIGHT = 40
const DEFAULT_HEIGHT = 280

export function CollectionDrawer({ title, children }: { title: string; children: ReactNode }) {
  const contentId = useId()
  const panelRef = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<{ pointerId: number; startY: number; startHeight: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [availableHeight, setAvailableHeight] = useState(DEFAULT_HEIGHT)
  const maxHeight = Math.max(COLLAPSED_HEIGHT, availableHeight - 48)
  const minHeight = Math.min(160, maxHeight)
  const clampHeight = (value: number) => Math.min(maxHeight, Math.max(minHeight, value))
  const expandedHeight = clampHeight(height)

  useLayoutEffect(() => {
    const parent = panelRef.current?.parentElement
    if (!parent) return
    const measure = () => setAvailableHeight(parent.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  return <section ref={panelRef} aria-label={title}
    className="absolute inset-x-0 bottom-0 z-20 flex flex-col"
    style={{ height: open ? expandedHeight : COLLAPSED_HEIGHT }}>
    <div aria-hidden="true" className="scroll-fade-bottom" style={{ bottom: '100%' }} />
    {open && <div role="separator" tabIndex={0} aria-label={`Resize ${title.toLowerCase()} panel`}
      aria-orientation="horizontal" aria-controls={contentId} aria-valuemin={minHeight}
      aria-valuemax={maxHeight} aria-valuenow={expandedHeight} aria-valuetext={`${Math.round(expandedHeight)} pixels high`}
      title="Drag to resize"
      className="absolute inset-x-2 top-0 z-30 flex h-4 cursor-row-resize touch-none select-none items-center justify-center bg-transparent text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      onPointerDown={event => {
        if (event.button !== 0) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startHeight: expandedHeight }
      }}
      onPointerMove={event => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return
        setHeight(clampHeight(drag.startHeight + drag.startY - event.clientY))
      }}
      onPointerUp={event => {
        dragRef.current = null
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onLostPointerCapture={() => { dragRef.current = null }}
      onPointerCancel={() => { dragRef.current = null }}
      onKeyDown={event => {
        const step = event.shiftKey ? 48 : 16
        const next = event.key === 'ArrowUp' ? expandedHeight + step
          : event.key === 'ArrowDown' ? expandedHeight - step
          : event.key === 'Home' ? minHeight : event.key === 'End' ? maxHeight : null
        if (next != null) {
          event.preventDefault()
          setHeight(clampHeight(next))
        } else if (event.key === 'Escape') {
          event.preventDefault()
          setOpen(false)
          toggleRef.current?.focus()
        }
      }}>
      <GripHorizontal aria-hidden="true" className="pointer-events-none h-4 w-6" />
    </div>}
    <div className="relative z-20 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-lg border border-sidebar-border bg-background shadow-lg">
      <Button ref={toggleRef} variant="ghost" aria-expanded={open} aria-controls={contentId}
        className="h-10 w-full shrink-0 justify-between rounded-none px-3 text-sm font-medium hover:bg-muted/30"
        onClick={() => setOpen(current => !current)}>
        {title}{open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </Button>
      <div id={contentId} hidden={!open} className="min-h-0 flex-1 overflow-hidden border-t border-sidebar-border/60">
        {children}
      </div>
    </div>
  </section>
}
