/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { arrow, autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom'

import { CatalogCardImage } from './CatalogCardImage'
import { TooltipCaret } from '../../primitives/TooltipCaret'

export interface CardTooltipData {
  catalogId: number
  name?: string
  imageUrl?: string | null
  otherFaceCatalogId?: number | null
}

export interface CardTooltipProviderProps {
  children: ReactNode
  resolveOtherFaceCatalogId?: (catalogId: number) => Promise<number | null>
}

interface CardTooltipContextType {
  showTooltip: (data: CardTooltipData, anchor: HTMLElement, point: { x: number; y: number }, placement: 'left' | 'right' | 'auto') => void
  hideTooltip: () => void
}

const CardTooltipContext = createContext<CardTooltipContextType | null>(null)

// Keep tooltip movement from rerendering the application subtree.
const TooltipChildren = memo(function TooltipChildren({ children }: { children: ReactNode }) {
  return children
})

const CARD_WIDTH = 210
const TOOLTIP_GAP = 8
const TOOLTIP_PADDING = 14
const VIEWPORT_PADDING = 12
const CARET_SIZE = 12

/** Anchored card preview. Hosts may supply a known back-face ID offline. */
export function CardTooltipProvider({
  children,
  resolveOtherFaceCatalogId,
}: CardTooltipProviderProps) {
  const [activeCard, setActiveCard] = useState<CardTooltipData | null>(null)
  const [resolvedOtherFaceCatalogId, setResolvedOtherFaceCatalogId] = useState<number | null>(null)
  const otherFaceCatalogIdCache = useRef(new Map<number, number | null>())
  const pendingOtherFaceRequests = useRef(new Map<number, Promise<number | null>>())
  // Wrapper element that hides the tooltip on any press. A native listener is
  // attached to it (see the effect below) because React synthetic handlers do
  // not reliably dispatch to a display:contents element in the WebView2 host.
  const hideOnPressRef = useRef<HTMLDivElement | null>(null)

  const arrowRef = useRef<HTMLDivElement>(null)
  const [anchorPoint, setAnchorPoint] = useState({ x: 0.5, y: 0.5 })
  const [preferredSide, setPreferredSide] = useState<'left' | 'right'>('right')
  const otherFaceCatalogId = activeCard?.otherFaceCatalogId ?? resolvedOtherFaceCatalogId
  const isDoubleSided = Boolean(
    otherFaceCatalogId && otherFaceCatalogId > 0 && otherFaceCatalogId !== activeCard?.catalogId,
  )
  const faceCount = isDoubleSided ? 2 : 1
  const containerWidth = CARD_WIDTH * faceCount + TOOLTIP_GAP * (faceCount - 1) + TOOLTIP_PADDING
  const caret = arrow({ element: arrowRef, padding: 12 })
  const { refs, floatingStyles, placement, middlewareData, isPositioned } = useFloating({
    open: activeCard != null,
    placement: preferredSide,
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(12),
      flip({
        padding: VIEWPORT_PADDING,
        crossAxis: false,
        fallbackPlacements: [preferredSide === 'left' ? 'right' : 'left', 'top', 'bottom'],
      }),
      // Shift along the card's edge without crossing back over the card itself.
      shift({ padding: VIEWPORT_PADDING }),
      size({
        padding: VIEWPORT_PADDING,
        apply({ availableWidth, availableHeight, elements }) {
          const heightLimitedWidth =
            Math.max(0, availableHeight - TOOLTIP_PADDING) * (5 / 7) * faceCount
            + TOOLTIP_GAP * (faceCount - 1) + TOOLTIP_PADDING
          elements.floating.style.setProperty(
            '--card-tooltip-max-width',
            `${Math.max(0, Math.min(availableWidth, heightLimitedWidth))}px`,
          )
        },
      }, [faceCount]),
      {
        ...caret,
        options: { ...caret.options, anchorPoint },
        // Keep the full card as the collision boundary, but point the caret
        // at its hovered area (which can be just a title in a stacked deck).
        fn(state) {
          const reference = state.rects.reference
          return caret.fn({
            ...state,
            rects: {
              ...state.rects,
              reference: {
                ...reference,
                x: reference.x + reference.width * anchorPoint.x,
                y: reference.y + reference.height * anchorPoint.y,
                width: 0,
                height: 0,
              },
            },
          })
        },
      },
    ],
  })
  const setReference = refs.setReference
  const side = placement.split('-')[0] as 'top' | 'right' | 'bottom' | 'left'
  const arrowEdge = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' }[side]
  const arrowRotation = { top: 0, right: 90, bottom: 180, left: -90 }[side]

  const showTooltip = useCallback((data: CardTooltipData, anchor: HTMLElement, point: { x: number; y: number }, preferredPlacement: 'left' | 'right' | 'auto') => {
    if (data.catalogId <= 0) return
    const bounds = anchor.getBoundingClientRect()
    setPreferredSide(preferredPlacement === 'auto'
      ? bounds.left > document.documentElement.clientWidth - bounds.right ? 'left' : 'right'
      : preferredPlacement)
    setAnchorPoint(point)
    setReference(anchor)
    setActiveCard(data)
    setResolvedOtherFaceCatalogId(data.otherFaceCatalogId ?? null)
  }, [setReference])

  const hideTooltip = useCallback(() => {
    setActiveCard(null)
    setResolvedOtherFaceCatalogId(null)
  }, [])

  // Position updates should not notify every card consuming this context.
  const contextValue = useMemo(
    () => ({ showTooltip, hideTooltip }),
    [showTooltip, hideTooltip],
  )

  // Face lookup is intentionally explicit here. The media provider may expose
  // a resolver for replay transformations, but ordinary tooltip hovers should
  // not turn every card preview into a /face request.
  const faceCatalogIdResolver = resolveOtherFaceCatalogId

  useEffect(() => {
    window.addEventListener('pointerdown', hideTooltip, { capture: true })
    window.addEventListener('mousedown', hideTooltip, { capture: true })
    window.addEventListener('dragstart', hideTooltip, { capture: true })
    window.addEventListener('wheel', hideTooltip, { capture: true, passive: true })
    window.addEventListener('blur', hideTooltip)
    document.addEventListener('pointerdown', hideTooltip, { capture: true })
    document.addEventListener('mousedown', hideTooltip, { capture: true })

    return () => {
      window.removeEventListener('pointerdown', hideTooltip, { capture: true })
      window.removeEventListener('mousedown', hideTooltip, { capture: true })
      window.removeEventListener('dragstart', hideTooltip, { capture: true })
      window.removeEventListener('wheel', hideTooltip, { capture: true })
      window.removeEventListener('blur', hideTooltip)
      document.removeEventListener('pointerdown', hideTooltip, { capture: true })
      document.removeEventListener('mousedown', hideTooltip, { capture: true })
    }
  }, [hideTooltip])

  // Use native listeners because synthetic events on display:contents do not
  // reliably dismiss the preview in Wine's WebView2.
  useEffect(() => {
    const el = hideOnPressRef.current
    if (!el) return
    const handler = () => hideTooltip()
    el.addEventListener('pointerdown', handler, { capture: true })
    el.addEventListener('pointerup', handler, { capture: true })
    el.addEventListener('mousedown', handler, { capture: true })
    return () => {
      el.removeEventListener('pointerdown', handler, { capture: true })
      el.removeEventListener('pointerup', handler, { capture: true })
      el.removeEventListener('mousedown', handler, { capture: true })
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

  return (
    <CardTooltipContext.Provider value={contextValue}>
      <div ref={hideOnPressRef} style={{ display: 'contents' }}>
        <TooltipChildren>{children}</TooltipChildren>
      </div>
      {activeCard && typeof document !== 'undefined' ? createPortal(
        <div
          ref={refs.setFloating}
          role="tooltip"
          aria-label={`${activeCard.name ?? 'Card'} preview`}
          data-side={side}
          className="pointer-events-none z-[9999]"
          style={{
            ...floatingStyles,
            width: containerWidth,
            maxWidth: 'min(calc(100vw - 24px), var(--card-tooltip-max-width, 100vw))',
            visibility: isPositioned ? 'visible' : 'hidden',
          }}
        >
          <div className="relative rounded-xl border border-white/15 bg-black/85 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in-0 zoom-in-95">
            <div className="flex flex-row items-start gap-2">
              <div className="relative aspect-[5/7] min-w-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-muted/30 shadow-md">
                <CatalogCardImage
                  catalogId={activeCard.catalogId}
                  name={activeCard.name ?? ''}
                  imageUrl={activeCard.imageUrl ?? undefined}
                  alt={activeCard.name ?? ''}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              {isDoubleSided && otherFaceCatalogId ? (
                <div className="relative aspect-[5/7] min-w-0 flex-1 overflow-hidden rounded-lg border border-white/10 bg-muted/30 shadow-md">
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
            <div
              ref={arrowRef}
              data-tooltip-caret
              className="absolute h-3 w-3"
              style={{
                left: middlewareData.arrow?.x,
                top: middlewareData.arrow?.y,
                [arrowEdge]: -CARET_SIZE / 2,
                transform: `rotate(${arrowRotation}deg)`,
              }}
            >
              <TooltipCaret className="absolute left-0 top-1/2 overflow-visible fill-black/85 stroke-white/15" />
            </div>
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
  imageUrl,
  otherFaceCatalogId,
  anchorPoint = { x: 0.5, y: 0.5 },
  placement = 'right',
  enabled = true,
  delayMs = 0,
}: {
  catalogId?: number | null
  name?: string
  imageUrl?: string | null
  otherFaceCatalogId?: number | null
  /** Anchor within the card, expressed as fractions of its width and height. */
  anchorPoint?: { x: number; y: number }
  /** Prefer an edge, or use the horizontal edge with more viewport space. */
  placement?: 'left' | 'right' | 'auto'
  enabled?: boolean
  /** Optional hover delay for small preview thumbnails. */
  delayMs?: number
}) {
  const context = useContext(CardTooltipContext)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelPending = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])
  useEffect(() => cancelPending, [cancelPending])
  const { x: anchorX, y: anchorY } = anchorPoint

  useEffect(() => {
    if (!enabled) { cancelPending(); context?.hideTooltip() }
  }, [cancelPending, context, enabled])

  const onMouseEnter = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!context || !enabled || !catalogId || catalogId <= 0 || event.buttons !== 0) return
    cancelPending()
    const anchor = event.currentTarget
    const show = () => {
      timer.current = null
      if (delayMs > 0 && (!anchor.isConnected || !anchor.matches(':hover'))) return
      context.showTooltip({ catalogId, name, imageUrl, otherFaceCatalogId }, anchor, { x: anchorX, y: anchorY }, placement)
    }
    if (delayMs > 0) timer.current = setTimeout(show, delayMs)
    else show()
  }, [catalogId, context, enabled, imageUrl, name, otherFaceCatalogId, anchorX, anchorY, placement, delayMs, cancelPending])

  const onMouseMove = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!context || !enabled || !catalogId || catalogId <= 0) return
    if (event.buttons !== 0) {
      cancelPending()
      context.hideTooltip()
      return
    }
  }, [catalogId, context, enabled, cancelPending])

  const onMouseLeave = useCallback(() => { cancelPending(); context?.hideTooltip() }, [context, cancelPending])
  const onMouseDown = useCallback(() => { cancelPending(); context?.hideTooltip() }, [context, cancelPending])

  return {
    onMouseEnter: context && enabled && catalogId ? onMouseEnter : undefined,
    onMouseMove: context && enabled && catalogId ? onMouseMove : undefined,
    onMouseLeave: context && enabled && catalogId ? onMouseLeave : undefined,
    onMouseDown: context && enabled && catalogId ? onMouseDown : undefined,
  }
}
