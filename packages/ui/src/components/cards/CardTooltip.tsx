/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { CatalogCardImage } from './CatalogCardImage'

export interface CardTooltipData {
  catalogId: number
  name?: string
  otherFaceCatalogId?: number | null
}

export interface CardTooltipProviderProps {
  children: ReactNode
  resolveOtherFaceCatalogId?: (catalogId: number) => Promise<number | null>
}

interface CardTooltipPosition {
  x: number
  y: number
}

interface CardTooltipContextType {
  showTooltip: (data: CardTooltipData, position: CardTooltipPosition) => void
  updatePosition: (position: CardTooltipPosition) => void
  hideTooltip: () => void
}

const CardTooltipContext = createContext<CardTooltipContextType | null>(null)

const CARD_WIDTH = 210
const CARD_HEIGHT = 294
const TOOLTIP_GAP = 8
const TOOLTIP_OFFSET = 16
/** Cursor-following card preview. Hosts may supply a known back-face ID offline. */
export function CardTooltipProvider({
  children,
  resolveOtherFaceCatalogId,
}: CardTooltipProviderProps) {
  const [activeCard, setActiveCard] = useState<CardTooltipData | null>(null)
  const [position, setPosition] = useState<CardTooltipPosition>({ x: 0, y: 0 })
  const [resolvedOtherFaceCatalogId, setResolvedOtherFaceCatalogId] = useState<number | null>(null)
  const otherFaceCatalogIdCache = useRef(new Map<number, number | null>())
  const pendingOtherFaceRequests = useRef(new Map<number, Promise<number | null>>())

  const showTooltip = useCallback((data: CardTooltipData, nextPosition: CardTooltipPosition) => {
    if (data.catalogId <= 0) return
    setActiveCard(data)
    setPosition(nextPosition)
    setResolvedOtherFaceCatalogId(data.otherFaceCatalogId ?? null)
  }, [])

  const updatePosition = useCallback((nextPosition: CardTooltipPosition) => {
    setPosition(nextPosition)
  }, [])

  const hideTooltip = useCallback(() => {
    setActiveCard(null)
    setResolvedOtherFaceCatalogId(null)
  }, [])

  // Face lookup is intentionally explicit here. The media provider may expose
  // a resolver for replay transformations, but ordinary tooltip hovers should
  // not turn every card preview into a /face request.
  const faceCatalogIdResolver = resolveOtherFaceCatalogId

  useEffect(() => {
    window.addEventListener('pointerdown', hideTooltip, { capture: true })
    window.addEventListener('mousedown', hideTooltip, { capture: true })
    window.addEventListener('dragstart', hideTooltip, { capture: true })
    window.addEventListener('wheel', hideTooltip, { capture: true, passive: true })

    return () => {
      window.removeEventListener('pointerdown', hideTooltip, { capture: true })
      window.removeEventListener('mousedown', hideTooltip, { capture: true })
      window.removeEventListener('dragstart', hideTooltip, { capture: true })
      window.removeEventListener('wheel', hideTooltip, { capture: true })
    }
  }, [hideTooltip])

  useEffect(() => {
    if (!activeCard || activeCard.otherFaceCatalogId !== undefined || !faceCatalogIdResolver) return

    const catalogId = activeCard.catalogId
    if (otherFaceCatalogIdCache.current.has(catalogId)) {
      setResolvedOtherFaceCatalogId(otherFaceCatalogIdCache.current.get(catalogId) ?? null)
      return
    }

    let request = pendingOtherFaceRequests.current.get(catalogId)
    if (!request) {
      request = faceCatalogIdResolver(catalogId)
        .catch(() => null)
        .then(otherFaceCatalogId => {
          otherFaceCatalogIdCache.current.set(catalogId, otherFaceCatalogId)
          pendingOtherFaceRequests.current.delete(catalogId)
          return otherFaceCatalogId
        })
      pendingOtherFaceRequests.current.set(catalogId, request)
    }

    let cancelled = false
    void request.then(otherFaceCatalogId => {
      if (!cancelled) setResolvedOtherFaceCatalogId(otherFaceCatalogId)
    })

    return () => {
      cancelled = true
    }
  }, [activeCard, faceCatalogIdResolver])

  const otherFaceCatalogId = activeCard?.otherFaceCatalogId ?? resolvedOtherFaceCatalogId
  const isDoubleSided = Boolean(
    otherFaceCatalogId && otherFaceCatalogId > 0 && otherFaceCatalogId !== activeCard?.catalogId,
  )
  const containerWidth = isDoubleSided ? CARD_WIDTH * 2 + TOOLTIP_GAP + 12 : CARD_WIDTH + 12
  const containerHeight = CARD_HEIGHT + 12
  let left = position.x + TOOLTIP_OFFSET
  let top = position.y - CARD_HEIGHT / 2

  if (typeof window !== 'undefined') {
    if (position.x > window.innerWidth / 2) {
      left = position.x - containerWidth - TOOLTIP_OFFSET
      if (left < 12) left = position.x + TOOLTIP_OFFSET
    } else if (left + containerWidth > window.innerWidth - 12) {
      left = position.x - containerWidth - TOOLTIP_OFFSET
    }

    left = Math.max(12, Math.min(left, window.innerWidth - containerWidth - 12))
    top = Math.max(12, Math.min(top, window.innerHeight - containerHeight - 12))
  }

  return (
    <CardTooltipContext.Provider value={{ showTooltip, updatePosition, hideTooltip }}>
      {children}
      {activeCard && typeof document !== 'undefined' ? createPortal(
        <div
          className="pointer-events-none fixed z-[9999] rounded-xl border border-white/15 bg-black/85 p-1.5 shadow-2xl backdrop-blur-md transition-opacity duration-150 animate-in fade-in-0 zoom-in-95"
          style={{ left, top }}
        >
          <div className="flex flex-row items-center gap-2">
            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-muted/30 shadow-md" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
              <CatalogCardImage
                catalogId={activeCard.catalogId}
                name={activeCard.name ?? ''}
                alt={activeCard.name ?? ''}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            {isDoubleSided && otherFaceCatalogId ? (
              <div className="relative overflow-hidden rounded-lg border border-white/10 bg-muted/30 shadow-md" style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
                <CatalogCardImage
                  catalogId={otherFaceCatalogId}
                  name={`${activeCard.name ?? ''} (Back Face)`}
                  alt={`${activeCard.name ?? ''} (Back Face)`}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </CardTooltipContext.Provider>
  )
}

export function useCardTooltipHover({
  catalogId,
  name,
  otherFaceCatalogId,
  enabled = true,
}: {
  catalogId?: number | null
  name?: string
  otherFaceCatalogId?: number | null
  enabled?: boolean
}) {
  const context = useContext(CardTooltipContext)

  useEffect(() => {
    if (!enabled) context?.hideTooltip()
  }, [context, enabled])

  const onMouseEnter = useCallback((event: ReactMouseEvent) => {
    if (!context || !enabled || !catalogId || catalogId <= 0 || event.buttons !== 0) return
    context.showTooltip({ catalogId, name, otherFaceCatalogId }, { x: event.clientX, y: event.clientY })
  }, [catalogId, context, enabled, name, otherFaceCatalogId])

  const onMouseMove = useCallback((event: ReactMouseEvent) => {
    if (!context || !enabled || !catalogId || catalogId <= 0) return
    if (event.buttons !== 0) {
      context.hideTooltip()
      return
    }
    context.updatePosition({ x: event.clientX, y: event.clientY })
  }, [catalogId, context, enabled])

  const onMouseLeave = useCallback(() => context?.hideTooltip(), [context])
  const onMouseDown = useCallback(() => context?.hideTooltip(), [context])

  return {
    onMouseEnter: context && enabled && catalogId ? onMouseEnter : undefined,
    onMouseMove: context && enabled && catalogId ? onMouseMove : undefined,
    onMouseLeave: context && enabled && catalogId ? onMouseLeave : undefined,
    onMouseDown: context && enabled && catalogId ? onMouseDown : undefined,
  }
}
