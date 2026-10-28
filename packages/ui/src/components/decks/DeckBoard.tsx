/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import {
  LayoutGrid,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'

import { m15FrameUrl } from '../../assets'
import { cn } from '../../lib/cn'
import { Button } from '../../primitives/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/Card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'
import type {
  DeckBoardHighlight,
  DeckBoardProps,
  DeckCardDragEndPayload,
  DeckDiffEntry,
  DeckEditorCard,
  DeckSortMode,
  DeckZone,
} from '../../types/decks'
import { CARD_COLORS } from '../../utils/card-search-model'
import { getStackPeekOffset } from '../../utils/card-layout'
import {
  getSortModeColumns,
  groupCardsBySortMode,
  sortCardsBySortMode,
  unrollCards,
} from '../../utils/deck-sortable'
import { getManaSymbolSvgPath } from '../../utils/mana-symbols'
import { CardImage } from '../cards/CardImage'
import { useCardTooltipHover } from '../cards/CardTooltip'

const GAP = 16
const COLUMNS = 5
const COLUMN_HEADER_HEIGHT = 40
const DEFAULT_CARD_WIDTH = 214
const DEFAULT_CARD_HEIGHT = 300
/** Removed (ghost) copies use indices at/above this so they can be told apart from real cards. */
const GHOST_INDEX_BASE = 900000

interface Position {
  x: number
  y: number
}

interface GridSlot {
  col: number
  row: number
}

interface DragPreview {
  sourceZone: DeckZone
  targetZone: DeckZone
  pointer: Position
  grabOffset: Position
  count: number
  primaryOffset: number
  indices: readonly number[]
}

interface GridLayout {
  cards: DeckEditorCard[]
  slots: ReadonlyMap<number, GridSlot>
  columns: number
  collapsed: boolean
  scale: number
  element: HTMLDivElement | null
}

interface GridPlacement {
  cardsKey: string
  sortMode: DeckSortMode
  collapsed: boolean
  slots: ReadonlyMap<string, GridSlot>
}

function copyKeys(cards: readonly DeckEditorCard[]): Map<number, string> {
  const counts = new Map<number, number>()
  return new Map(
    cards.map(card => {
      const count = counts.get(card.catalogId) ?? 0
      counts.set(card.catalogId, count + 1)
      return [card.index, `${card.catalogId}-${count}`]
    }),
  )
}

function cardsKey(cards: readonly DeckEditorCard[]): string {
  const counts = new Map<number, number>()
  for (const card of cards) {
    counts.set(card.catalogId, (counts.get(card.catalogId) ?? 0) + card.quantity)
  }
  return JSON.stringify([...counts].sort((a, b) => a[0] - b[0]))
}

interface PendingDrop {
  indices: ReadonlySet<number>
  cards: ReadonlyMap<number, DeckEditorCard>
  quantities: Map<number, number>
  sourceCounts: Map<number, number>
}

function isGhostCard(card: DeckEditorCard): boolean {
  return card.originalIndex >= GHOST_INDEX_BASE
}

const SheetCard = memo(function SheetCard({
  index,
  card,
  cardWidth,
  cardHeight,
  left,
  top,
  onDragStart,
  onContextMenu,
  isDragging,
  isAnyDragging,
  zIndex,
  diffDelta,
  suppressBottomBorder,
  suppressTopBorder,
  highlighted = false,
  selected = false,
  emphasized = false,
  hiddenWhileDragging = false,
  dimmed = false,
  occluded = false,
  tooltipPlacement,
}: {
  index: number
  card: DeckEditorCard
  cardWidth: number
  cardHeight: number
  left: number
  top: number
  onDragStart: (index: number, e: ReactPointerEvent<HTMLDivElement>) => void
  onContextMenu?: DeckBoardProps['onCardContextMenu']
  isDragging: boolean
  isAnyDragging?: boolean
  zIndex: number
  diffDelta?: number
  suppressBottomBorder?: boolean
  suppressTopBorder?: boolean
  highlighted?: boolean
  /** Part of the current marquee selection (persistent ring + tint). */
  selected?: boolean
  /** Transient host emphasis shares the selection appearance without changing selection. */
  emphasized?: boolean
  /** Hide the in-canvas copy while its portal drag preview is active. */
  hiddenWhileDragging?: boolean
  dimmed?: boolean
  occluded?: boolean
  tooltipPlacement?: DeckBoardProps['sideboardTooltipPlacement']
}) {
  const { catalogId, imageUrl } = card
  const isGhost = isGhostCard(card)
  // No scale: the card keeps its size so the selection highlight renders
  // identically to the at-rest state. The lift is conveyed by the shadow only.
  const dragTransform = 'translateZ(0)'
  const isAdded = diffDelta != null && diffDelta > 0

  const tooltipHandlers = useCardTooltipHover({
    catalogId,
    name: card.name,
    imageUrl,
    otherFaceCatalogId: card.otherFaceCatalogId,
    placement: tooltipPlacement,
    anchorPoint: { x: 0.5, y: occluded ? getStackPeekOffset(cardHeight) / (2 * cardHeight) : 0.5 },
    enabled: !isDragging && !isAnyDragging,
  })

  return (
    <div
      {...tooltipHandlers}
      data-deck-card-index={index}
      data-deck-card-name={isGhost ? undefined : card.name}
      data-deck-card-change={diffDelta ? (isGhost ? 'removed' : 'added') : undefined}
      aria-label={diffDelta ? `${card.name}: ${isGhost ? 'removed from' : 'added to'} ${card.zone.toLowerCase()}` : undefined}
      // Dragged cards keep the exact selection highlight (the overlay below);
      // only the lift (scale/shadow/cursor) differs while a card is moving.
      className={cn(
        'group absolute select-none rounded-lg',
        isGhost ? 'cursor-default' : 'cursor-grab',
        isDragging
          ? 'cursor-grabbing shadow-xl'
          : highlighted
            ? ''
            : 'hover:ring-1 hover:ring-primary/30',
      )}
      style={{
        left,
        top,
        width: cardWidth,
        height: cardHeight,
        zIndex: isDragging ? 1000 : zIndex,
        willChange: isDragging ? 'left, top' : 'auto',
        transform: isDragging ? dragTransform : 'none',
        // Dragged cards (including every member of a multi-card group) skip
        // the rest-state left/top tween so the group tracks the pointer as
        // one rigid block. Leaving that tween on followers is what made
        // them lag behind the grabbed card.
        transition: isDragging
          ? 'box-shadow 0.2s ease'
          : 'left 0.15s ease-out, top 0.15s ease-out, box-shadow 0.2s ease',
        visibility: hiddenWhileDragging ? 'hidden' : 'visible',
      }}
      onPointerDown={e => {
        // The tooltip's own onMouseDown (hide) is clobbered by this drag
        // handler, so call it explicitly: any click on the card hides the
        // hover preview, then a left button also starts a drag.
        tooltipHandlers.onMouseDown?.()
        if (e.button !== 0) return
        // Keep the board's background marquee handler from treating this as a
        // background press; the grid decides between toggle / group / single drag.
        e.stopPropagation()
        if (!isGhost) onDragStart(index, e)
      }}
      onContextMenu={event => {
        event.preventDefault()
        if (!isGhost) onContextMenu?.(card, { x: event.clientX, y: event.clientY })
      }}
    >
      <div className={cn('pointer-events-none relative h-full w-full overflow-hidden rounded-lg', isGhost && 'bg-background')}>
        {/* Keep selection and history overlays at full brightness. */}
        <CardImage
          catalogId={catalogId}
          imageUrl={imageUrl}
          alt=""
          width={cardWidth}
          height={cardHeight}
          draggable={false}
          className="transition-[filter] duration-150 motion-reduce:transition-none"
          style={{
            display: 'block',
            width: cardWidth,
            height: cardHeight,
            opacity: isGhost ? 0.45 : undefined,
            filter: dimmed && !isDragging && !isAnyDragging ? 'brightness(0.7)' : undefined,
          }}
        />

        {diffDelta != null && diffDelta !== 0 ? (
          <div
            className={cn(
              'pointer-events-none absolute inset-0 z-30 rounded-lg border-2',
              isAdded
                ? 'border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]',
              suppressTopBorder && 'rounded-t-none border-t-0',
              suppressBottomBorder && 'rounded-b-none border-b-0',
            )}
          />
        ) : null}

        {/* Highlight: a full-height border overlay at this card's own z-index
            (no box-shadow transition, so it appears instantly on right-click).
            For a covered copy, the copy in front has a higher zIndex and an
            opaque image, so it occludes the lower portion and clips the
            highlight to the visible top peek, as if the outline inherited this
            card's z-index and the next card drew over it. */}
        {highlighted ? (
          <div className="pointer-events-none absolute inset-0 z-40 rounded-lg border-2 border-primary" />
        ) : null}

        {/* Selection and sidebar emphasis share an inset border + tint, distinct from
            the transient context-menu outline above. A real border (not a
            box-shadow ring) so it paints crisply while a card is being dragged
            — box-shadows fade to a thin line during rapid movement in the
            WebView2 host (the same reason the "highlighted" overlay uses a
            border). */}
        {selected || emphasized ? (
          <div className="pointer-events-none absolute inset-0 z-40 rounded-lg border-2 border-primary/70 bg-primary/10" />
        ) : null}

      </div>
    </div>
  )
})

function SkeletonCard({
  cardWidth,
  cardHeight,
  position,
  zIndex,
}: {
  cardWidth: number
  cardHeight: number
  position: Position
  zIndex: number
}) {
  return (
    <div
      className="absolute overflow-hidden rounded-lg"
      style={{
        left: position.x,
        top: position.y,
        width: cardWidth,
        height: cardHeight,
        zIndex,
        transition: 'left 0.15s ease-out, top 0.15s ease-out',
        backgroundImage: `url(${m15FrameUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: 'hsl(var(--muted))',
        filter: 'sepia(20%) saturate(150%) hue-rotate(190deg) brightness(0.7)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{ backgroundSize: '200% 100%', borderRadius: 8 }}
      />
    </div>
  )
}

function slotPosKey(col: number, row: number) {
  return col * 100000 + row
}

/** Hit-test a marquee against each copy's *visible* peek, not the full card. */
function collectMarqueeHits(
  cards: DeckEditorCard[],
  positions: Map<number, Position>,
  slots: Map<number, GridSlot>,
  rect: { left: number; top: number; right: number; bottom: number },
): Set<number> {
  const hits = new Set<number>()
  const posBySlot = new Map<number, Position>()
  for (const card of cards) {
    const slot = slots.get(card.index)
    const pos = positions.get(card.index)
    if (slot && pos) posBySlot.set(slotPosKey(slot.col, slot.row), pos)
  }
  for (const card of cards) {
    if (isGhostCard(card)) continue
    const pos = positions.get(card.index)
    const slot = slots.get(card.index)
    if (!pos || !slot) continue
    const covering = posBySlot.get(slotPosKey(slot.col, slot.row + 1))
    const visibleBottom = covering ? covering.y : pos.y + DEFAULT_CARD_HEIGHT
    if (
      pos.x + DEFAULT_CARD_WIDTH > rect.left &&
      pos.x < rect.right &&
      pos.y < rect.bottom &&
      visibleBottom > rect.top
    ) {
      hits.add(card.index)
    }
  }
  return hits
}

function hoverFromPointer(pos: Position, columnCount: number): { hoverCol: number; hoverRowRaw: number } {
  const offsetPerCard = getStackPeekOffset(DEFAULT_CARD_HEIGHT)
  const colWidth = DEFAULT_CARD_WIDTH + GAP
  return {
    hoverCol: Math.max(0, Math.min(columnCount - 1, Math.round((pos.x - GAP) / colWidth))),
    hoverRowRaw: Math.max(0, Math.round((pos.y - GAP - COLUMN_HEADER_HEIGHT) / offsetPerCard)),
  }
}

/**
 * Splice `moving` (already in visual order) into `hoverCol` at the pointer row.
 * Remaining cards in that column open a hole; vacated source columns pack up.
 * This is the single-card live-preview / drop path, generalized to a block.
 */
function insertBlock(
  slots: Map<number, GridSlot>,
  moving: readonly number[],
  hoverCol: number,
  hoverRowRaw: number,
  primaryIndex: number,
): Map<number, GridSlot> {
  if (moving.length === 0) return slots

  const movingSet = new Set(moving)
  const next = new Map(slots)
  const sourceCols = new Set<number>()
  for (const idx of moving) {
    const slot = slots.get(idx)
    if (slot) sourceCols.add(slot.col)
  }

  for (const col of sourceCols) {
    if (col === hoverCol) continue
    const remaining = [...slots.entries()]
      .filter(([idx, slot]) => !movingSet.has(idx) && slot.col === col)
      .sort((a, b) => a[1].row - b[1].row)
    remaining.forEach(([idx], row) => next.set(idx, { col, row }))
  }

  const statics = [...slots.entries()]
    .filter(([idx, slot]) => !movingSet.has(idx) && slot.col === hoverCol)
    .sort((a, b) => a[1].row - b[1].row)

  // hoverRowRaw is the visual row of the *grabbed* card. Shift back by that
  // card's place in the stack so the block is placed around it. Clamp only
  // after subtracting — clamping first (to statics.length) made insertAt
  // unable to reach the bottom of the column when grabbing a lower card.
  const primaryOffset = Math.max(0, moving.indexOf(primaryIndex))
  const insertAt = Math.max(0, Math.min(statics.length, hoverRowRaw - primaryOffset))

  statics.forEach(([idx], i) => {
    next.set(idx, { col: hoverCol, row: i >= insertAt ? i + moving.length : i })
  })
  moving.forEach((idx, i) => {
    next.set(idx, { col: hoverCol, row: insertAt + i })
  })
  return next
}

function incomingSlots(layout: GridLayout, preview: DragPreview): Map<number, GridSlot> {
  const rect = layout.element!.getBoundingClientRect()
  const position = {
    x: (preview.pointer.x - rect.left - preview.grabOffset.x) / layout.scale,
    y: (preview.pointer.y - rect.top - preview.grabOffset.y) / layout.scale,
  }
  const { hoverCol, hoverRowRaw } = hoverFromPointer(position, layout.columns)
  const incoming = Array.from({ length: preview.count }, (_, index) => -index - 1)
  return insertBlock(
    new Map(layout.slots), incoming, hoverCol, hoverRowRaw,
    incoming[preview.primaryOffset] ?? incoming[0],
  )
}

function orderBySlot(indices: Iterable<number>, slots: Map<number, GridSlot>): number[] {
  return [...indices].sort((a, b) => {
    const slotA = slots.get(a) ?? { col: 0, row: 0 }
    const slotB = slots.get(b) ?? { col: 0, row: 0 }
    return slotA.col - slotB.col || slotA.row - slotB.row
  })
}

function getSlotPosition(col: number, row: number, cardWidth: number, cardHeight: number): Position {
  const offsetPerCard = getStackPeekOffset(cardHeight)
  return {
    x: col * (cardWidth + GAP) + GAP,
    y: row * offsetPerCard + GAP + COLUMN_HEADER_HEIGHT,
  }
}

function getPileHeight(cardsInColumn: number, cardHeight: number): number {
  if (cardsInColumn === 0) return 0
  const offsetPerCard = getStackPeekOffset(cardHeight)
  return cardHeight + offsetPerCard * (cardsInColumn - 1)
}

function calculateDeckStats(cards: DeckEditorCard[]) {
  const totalCards = cards.reduce((acc, c) => acc + c.quantity, 0)
  let creatures = 0
  let lands = 0
  let totalCmc = 0
  let nonLandCount = 0

  cards.forEach(c => {
    if (c.types.includes('Creature')) creatures += c.quantity
    if (c.types.includes('Land')) lands += c.quantity
    if (!c.types.includes('Land')) {
      nonLandCount += c.quantity
      totalCmc += c.cmc * c.quantity
    }
  })

  const spells = totalCards - creatures - lands
  const avgCmc = nonLandCount > 0 ? (totalCmc / nonLandCount).toFixed(2) : '0'
  return { totalCards, creatures, lands, spells, avgCmc }
}

function DeckStats({
  mainboard,
  sideboard,
}: {
  mainboard: DeckEditorCard[]
  sideboard: DeckEditorCard[]
}) {
  const mainStats = useMemo(() => calculateDeckStats(mainboard), [mainboard])
  const sideStats = useMemo(() => calculateDeckStats(sideboard), [sideboard])

  return (
    <Card className="border-sidebar-border/60">
      <CardContent className="flex gap-8 bg-muted/20 px-4 py-2">
        <table className="text-xs text-muted-foreground">
          <tbody>
            <tr>
              <td className="pr-2 font-semibold text-foreground">Main ({mainStats.totalCards})</td>
              <td className="pr-2">
                Creatures: <span className="font-medium text-foreground">{mainStats.creatures}</span>
              </td>
              <td className="pr-2">
                Spells: <span className="font-medium text-foreground">{mainStats.spells}</span>
              </td>
              <td className="pr-2">
                Lands: <span className="font-medium text-foreground">{mainStats.lands}</span>
              </td>
              <td>
                Avg CMC: <span className="font-medium text-foreground">{mainStats.avgCmc}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {sideStats.totalCards > 0 ? (
          <div className="flex items-center gap-2 border-l border-border/50 pl-4 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Side ({sideStats.totalCards})</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function getEffectiveCardsForZone(
  cards: DeckEditorCard[],
  allCards: DeckEditorCard[] = [],
  zone: DeckZone,
  diffMap?: ReadonlyMap<number, DeckDiffEntry>,
): DeckEditorCard[] {
  if (!diffMap || diffMap.size === 0) return cards

  const ghostEntries: DeckEditorCard[] = []
  let nextGhostIndex = GHOST_INDEX_BASE

  diffMap.forEach((diff, catalogId) => {
    if (diff.delta < 0) {
      const ghostCount = Math.abs(diff.delta)
      const template =
        allCards.find(c => c.catalogId === catalogId) || cards.find(c => c.catalogId === catalogId)

      for (let i = 0; i < ghostCount; i++) {
        const types =
          template?.types && template.types.length > 0
            ? template.types
            : diff.types && diff.types.length > 0
              ? diff.types
              : ['Unknown']

        ghostEntries.push({
          index: nextGhostIndex++,
          originalIndex: nextGhostIndex,
          catalogId,
          name: diff.name,
          quantity: 1,
          cmc: template?.cmc ?? diff.cmc ?? 0,
          colors: template?.colors ?? diff.colors ?? [],
          types,
          rarity: template?.rarity ?? diff.rarity ?? 'common',
          imageUrl: template?.imageUrl,
          otherFaceCatalogId: template?.otherFaceCatalogId,
          zone,
        })
      }
    }
  })

  if (ghostEntries.length === 0) return cards

  // Insert each ghost next to the remaining copies of the same card so the
  // stable column sort keeps it grouped with its pile instead of dropping it
  // to the bottom of the column. Ghosts for fully removed cards (no
  // remaining copies) fall through to the end.
  const ghostsByCatalog = new Map<number, DeckEditorCard[]>()
  for (const ghost of ghostEntries) {
    const list = ghostsByCatalog.get(ghost.catalogId) ?? []
    list.push(ghost)
    ghostsByCatalog.set(ghost.catalogId, list)
  }

  const result: DeckEditorCard[] = []
  const unplacedGhosts = new Map(ghostsByCatalog)
  for (const card of cards) {
    result.push(card)
    const ghosts = unplacedGhosts.get(card.catalogId)
    if (ghosts) {
      result.push(...ghosts)
      unplacedGhosts.delete(card.catalogId)
    }
  }
  unplacedGhosts.forEach(ghosts => result.push(...ghosts))

  return result
}

function DeckGrid({
  title,
  cards,
  allCards,
  sortMode,
  collapsed = false,
  forceScale,
  onNaturalWidthChange,
  onSelectionStartChange,
  diffMap,
  onDragEnd,
  onSelectionChange,
  onCardContextMenu,
  highlightedCard,
  hoveredCardName,
  emphasizedCardName,
  dragPreview,
  tooltipPlacement,
  onDragPreviewChange,
  placement,
  onLayoutChange,
  onCrossZoneDrop,
  onReorder,
}: {
  title: string
  cards: DeckEditorCard[]
  allCards?: DeckEditorCard[]
  loading: boolean
  sortMode: DeckSortMode
  collapsed?: boolean
  forceScale?: number
  onNaturalWidthChange?: (width: number) => void
  onSelectionStartChange: (zone: DeckZone, handler: ((event: ReactPointerEvent<HTMLDivElement>) => void) | null) => void
  diffMap?: ReadonlyMap<number, DeckDiffEntry>
  onDragEnd?: (payload: DeckCardDragEndPayload) => void | Promise<void>
  onSelectionChange?: DeckBoardProps['onSelectionChange']
  onCardContextMenu?: DeckBoardProps['onCardContextMenu']
  highlightedCard?: DeckBoardHighlight | null
  hoveredCardName: string | null
  emphasizedCardName: string | null
  tooltipPlacement?: DeckBoardProps['sideboardTooltipPlacement']
  dragPreview: DragPreview | null
  onDragPreviewChange: (preview: DragPreview | null) => void
  placement?: GridPlacement
  onLayoutChange: (zone: DeckZone, layout: GridLayout) => void
  onCrossZoneDrop: (preview: DragPreview) => ReadonlyMap<number, GridSlot>
  onReorder: (zone: DeckZone) => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const innerBoardRef = useRef<HTMLDivElement>(null)
  const onDragPreviewChangeRef = useRef(onDragPreviewChange)
  onDragPreviewChangeRef.current = onDragPreviewChange
  const dragStateRef = useRef<{
    index: number
    startSlot: GridSlot
    startMousePos: Position
    basePos: Position
    catalogId: number
  } | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragCurrentPos, setDragCurrentPos] = useState<Position>({ x: 0, y: 0 })
  const [dragPointerPosition, setDragPointerPosition] = useState<Position | null>(null)
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null)
  const previousCardsRef = useRef(cards)

  // -- Marquee selection / multi-card drag --
  const [selectedIndices, setSelectedIndices] = useState<ReadonlySet<number>>(new Set())
  const selectedRef = useRef<ReadonlySet<number>>(selectedIndices)
  selectedRef.current = selectedIndices

  const [marqueeRect, setMarqueeRect] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const marqueeStateRef = useRef<{
    startX: number
    startY: number
    currentX: number
    currentY: number
    additive: boolean
    /** Selection at press time; live marquee previews are applied on top. */
    baseline: ReadonlySet<number>
    boardEl: HTMLElement
  } | null>(null)

  const [multiDrag, setMultiDrag] = useState<{
    indices: readonly number[]
    indexSet: ReadonlySet<number>
    primaryIndex: number
    primaryBase: Position
    basePositions: ReadonlyMap<number, Position>
  } | null>(null)
  const [multiDragPos, setMultiDragPos] = useState<Position | null>(null)
  const multiDragRef = useRef<{
    indices: number[]
    primaryIndex: number
    startSlots: Map<number, GridSlot>
    basePositions: Map<number, Position>
    startMousePos: Position
    catalogIds: Map<number, number>
  } | null>(null)
  const multiDragPosRef = useRef<Position | null>(null)
  multiDragPosRef.current = multiDragPos

  const zone: DeckZone = title.toLowerCase().includes('side') ? 'Sideboard' : 'Mainboard'

  const effectiveCards = useMemo(
    () => getEffectiveCardsForZone(cards, allCards, zone, diffMap),
    [cards, allCards, zone, diffMap],
  )

  const unrolledCards = useMemo(() => {
    const sorted = sortCardsBySortMode(effectiveCards, sortMode)
    return unrollCards(sorted)
  }, [effectiveCards, sortMode])
  const cardInstanceKeys = useMemo(() => copyKeys(unrolledCards), [unrolledCards])

  const groupedCards = useMemo(
    () => groupCardsBySortMode(unrolledCards, sortMode),
    [unrolledCards, sortMode],
  )

  const actualColumns = useMemo(() => {
    if (collapsed) return 1
    return getSortModeColumns(sortMode, unrolledCards).length || COLUMNS
  }, [collapsed, sortMode, unrolledCards])

  const [draggedSlots, setDraggedSlots] = useState<Map<number, GridSlot> | null>(null)

  const defaultSlots = useMemo(() => {
    const newSlots = new Map<number, GridSlot>()
    if (collapsed) {
      unrolledCards.forEach((card, index) => {
        newSlots.set(card.index, { col: 0, row: index })
      })
    } else {
      let currentColumn = 0
      groupedCards.forEach(pile => {
        pile.forEach((card, rowIndex) => {
          newSlots.set(card.index, { col: currentColumn, row: rowIndex })
        })
        currentColumn++
      })
    }
    return newSlots
  }, [collapsed, groupedCards, unrolledCards])

  // Reset drag overrides when sort / cards / collapse change.
  useEffect(() => {
    setDraggedSlots(null)
  }, [sortMode, collapsed, cards])

  const placedSlots = useMemo(() => {
    if (!placement || placement.sortMode !== sortMode || placement.collapsed !== collapsed || placement.cardsKey !== cardsKey(unrolledCards)) return null
    return new Map(unrolledCards.map(card => [
      card.index,
      placement.slots.get(cardInstanceKeys.get(card.index)!) ?? defaultSlots.get(card.index)!,
    ]))
  }, [placement, sortMode, collapsed, unrolledCards, cardInstanceKeys, defaultSlots])
  const cardSlots = placedSlots || draggedSlots || defaultSlots

  useLayoutEffect(() => {
    onLayoutChange(zone, { cards: unrolledCards, slots: cardSlots,
      columns: actualColumns, collapsed, scale: forceScale ?? 1, element: innerBoardRef.current })
  }, [zone, unrolledCards, cardSlots, actualColumns, collapsed, forceScale, onLayoutChange])

  // Only the copies that actually changed get a diff border. For additions the
  // top `delta` copies of the pile are the new ones; for removals only the
  // ghost (removed) copies are highlighted, leaving surviving copies clean.
  const diffCopyIndices = useMemo(() => {
    const changed = new Set<number>()
    if (!diffMap || diffMap.size === 0) return changed

    const byCatalog = new Map<number, DeckEditorCard[]>()
    for (const card of unrolledCards) {
      const list = byCatalog.get(card.catalogId) ?? []
      list.push(card)
      byCatalog.set(card.catalogId, list)
    }

    diffMap.forEach((diff, catalogId) => {
      if (diff.delta === 0) return

      const copies = byCatalog.get(catalogId) ?? []
      if (copies.length === 0) return

      let changedCopies: DeckEditorCard[]
      if (diff.delta < 0) {
        // Removed copies are the ghost entries; surviving copies are unchanged.
        // Ghosts keep a high `originalIndex` through unrolling (only `index` is
        // renumbered), so match on `originalIndex`.
        changedCopies = copies.filter(card => card.originalIndex >= GHOST_INDEX_BASE)
      } else {
        // Added copies: highlight the top `delta` copies of the pile.
        const ordered = [...copies].sort((a, b) => {
          const slotA = defaultSlots.get(a.index) ?? { col: 0, row: 0 }
          const slotB = defaultSlots.get(b.index) ?? { col: 0, row: 0 }
          return slotA.col - slotB.col || slotA.row - slotB.row
        })
        changedCopies = ordered.slice(-Math.min(diff.delta, copies.length))
      }

      changedCopies.forEach(card => changed.add(card.index))
    })

    return changed
  }, [diffMap, unrolledCards, defaultSlots])

  const effectiveCardSlots = useMemo(() => {
    if (dragPreview?.targetZone === zone && dragPreview.sourceZone !== zone) {
      if (innerBoardRef.current) {
        // Negative indices reserve space without creating copies of incoming
        // cards. The source grid continues to own the pointer-following portal.
        return incomingSlots({ cards: unrolledCards, slots: cardSlots,
          columns: actualColumns, collapsed, scale: forceScale ?? 1, element: innerBoardRef.current }, dragPreview)
      }
    }
    if (dragPreview?.sourceZone === zone && dragPreview.targetZone !== zone) {
      const moving = new Set(multiDrag?.indices ?? (draggingIndex == null ? [] : [draggingIndex]))
      const remaining = new Map([...cardSlots].filter(([index]) => !moving.has(index)))
      for (let col = 0; col < actualColumns; ++col) {
        [...remaining].filter(([,slot]) => slot.col === col)
          .sort((a,b) => a[1].row - b[1].row)
          .forEach(([index], row) => remaining.set(index, { col, row }))
      }
      return remaining
    }
    if (multiDrag != null && multiDragPos != null) {
      const { hoverCol, hoverRowRaw } = hoverFromPointer(multiDragPos, actualColumns)
      return insertBlock(
        cardSlots,
        multiDrag.indices,
        hoverCol,
        hoverRowRaw,
        multiDrag.primaryIndex,
      )
    }
    if (draggingIndex != null) {
      const { hoverCol, hoverRowRaw } = hoverFromPointer(dragCurrentPos, actualColumns)
      return insertBlock(cardSlots, [draggingIndex], hoverCol, hoverRowRaw, draggingIndex)
    }
    return cardSlots
  }, [actualColumns, cardSlots, draggingIndex, dragCurrentPos, multiDrag, multiDragPos, dragPreview, forceScale, collapsed, zone, unrolledCards])

  const cardsPerColumn = useMemo(() => {
    const counts = new Array(actualColumns).fill(0) as number[]
    effectiveCardSlots.forEach(slot => {
      if (slot.col >= 0 && slot.col < actualColumns) {
        counts[slot.col] = Math.max(counts[slot.col], slot.row + 1)
      }
    })
    return counts
  }, [actualColumns, effectiveCardSlots])

  // Removed markers occupy stack space, but are no longer cards in this zone.
  const displayedCounts = useMemo(() => {
    const counts = new Array(actualColumns).fill(0) as number[]
    for (const card of unrolledCards) {
      const slot = effectiveCardSlots.get(card.index)
      if (!isGhostCard(card) && slot && slot.col >= 0 && slot.col < actualColumns) counts[slot.col]++
    }
    return counts
  }, [actualColumns, effectiveCardSlots, unrolledCards])

  const cardPositions = useMemo(() => {
    const positions = new Map<number, Position>()
    unrolledCards.forEach(card => {
      const slot = effectiveCardSlots.get(card.index)
      if (slot) {
        positions.set(
          card.index,
          getSlotPosition(slot.col, slot.row, DEFAULT_CARD_WIDTH, DEFAULT_CARD_HEIGHT),
        )
      }
    })
    return positions
  }, [effectiveCardSlots, unrolledCards])

  const cardByIndex = useMemo(() => {
    const m = new Map<number, DeckEditorCard>()
    unrolledCards.forEach(c => m.set(c.index, c))
    return m
  }, [unrolledCards])

  const slotKey = (col: number, row: number) => `${col}|${row}`
  const slotToCardIndex = useMemo(() => {
    const m = new Map<string, number>()
    cardSlots.forEach((slot, idx) => m.set(slotKey(slot.col, slot.row), idx))
    return m
  }, [cardSlots])

  const naturalWidth = DEFAULT_CARD_WIDTH * actualColumns + GAP * (actualColumns + 1)
  const maxPileHeight = Math.max(
    ...cardsPerColumn.map(count => getPileHeight(count, DEFAULT_CARD_HEIGHT)),
    DEFAULT_CARD_HEIGHT,
  )
  const maxY = maxPileHeight + GAP * 2 + COLUMN_HEADER_HEIGHT

  useEffect(() => {
    onNaturalWidthChange?.(naturalWidth)
  }, [naturalWidth, onNaturalWidthChange])

  const scale = forceScale ?? 1
  const scaleToPixel = useCallback(
    (value: number) => (value === 0 ? 0 : Math.max(1, Math.round(value * scale))),
    [scale],
  )

  const scaledWidth = scaleToPixel(naturalWidth)
  const scaledHeight = scaleToPixel(maxY)
  const scaledCardWidth = scaleToPixel(DEFAULT_CARD_WIDTH)
  const scaledCardHeight = scaleToPixel(DEFAULT_CARD_HEIGHT)

  const columnLabels = useMemo(
    () => getSortModeColumns(sortMode, unrolledCards),
    [sortMode, unrolledCards],
  )

  const cardOrder = useMemo(() => unrolledCards.map(c => c.index), [unrolledCards])

  const cardPositionsRef = useRef(cardPositions)
  cardPositionsRef.current = cardPositions
  const cardSlotsRef = useRef(cardSlots)
  cardSlotsRef.current = cardSlots
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const actualColumnsRef = useRef(actualColumns)
  actualColumnsRef.current = actualColumns
  const currentPosRef = useRef(dragCurrentPos)
  currentPosRef.current = dragCurrentPos
  const onDragEndRef = useRef(onDragEnd)
  onDragEndRef.current = onDragEnd
  const onSelectionChangeRef = useRef(onSelectionChange)
  onSelectionChangeRef.current = onSelectionChange
  const zoneRef = useRef(zone)
  zoneRef.current = zone
  const unrolledCardsRef = useRef(unrolledCards)
  unrolledCardsRef.current = unrolledCards
  const cardByIndexRef = useRef(cardByIndex)
  cardByIndexRef.current = cardByIndex
  const cardsRef = useRef(cards)
  cardsRef.current = cards
  const pointerPositionRef = useRef<Position>({ x: 0, y: 0 })
  const dragOverlayRef = useRef<{
    grabOffset: Position
    cardOffsets: Map<number, Position>
    width: number
    height: number
  }>({
    grabOffset: { x: 0, y: 0 },
    cardOffsets: new Map(),
    width: DEFAULT_CARD_WIDTH,
    height: DEFAULT_CARD_HEIGHT,
  })

  const getDropZoneAtPointer = useCallback((position: Position): DeckZone => {
    // Read-only previews may rearrange a zone locally, but cannot transfer copies.
    if (!onDragEndRef.current) return zoneRef.current
    const element = document.elementFromPoint(position.x, position.y)
    const zone = element?.closest<HTMLElement>('[data-deck-zone]')?.dataset.deckZone
    return zone === 'Mainboard' || zone === 'Sideboard' ? zone : zoneRef.current
  }, [])

  const createDragPreview = useCallback((pointer: Position, indices: readonly number[], primary: number): DragPreview => ({
      sourceZone: zoneRef.current,
      targetZone: getDropZoneAtPointer(pointer),
      pointer,
      grabOffset: dragOverlayRef.current.grabOffset,
      count: indices.length,
      primaryOffset: Math.max(0, indices.indexOf(primary)),
      indices,
  }), [getDropZoneAtPointer])

  const publishDragPreview = useCallback((pointer: Position, indices: readonly number[], primary: number) => {
    onDragPreviewChangeRef.current(createDragPreview(pointer, indices, primary))
  }, [createDragPreview])

  const notifyDragEnd = useCallback(
    (payload: DeckCardDragEndPayload, pendingIndices?: readonly number[]) => {
      const callback = onDragEndRef.current
      if (!callback) return

      if (!pendingIndices || pendingIndices.length === 0) {
        callback(payload)
        return
      }

      // Keep the portal preview visible while the host persists a cross-zone
      // move. Clearing the local drag state before that promise settles makes
      // the old source card briefly reappear at its original location.
      const quantities = new Map<number, number>()
      for (const movedCard of payload.movedCards) {
        quantities.set(
          movedCard.catalogId,
          (quantities.get(movedCard.catalogId) ?? 0) + 1,
        )
      }
      const sourceCounts = new Map<number, number>()
      for (const card of cardsRef.current) {
        sourceCounts.set(card.catalogId, (sourceCounts.get(card.catalogId) ?? 0) + card.quantity)
      }
      const clearPreview = () => {
        setPendingDrop(null)
        setDragPointerPosition(null)
      }
      const previewCards = new Map<number, DeckEditorCard>()
      for (const index of pendingIndices) {
        const card = cardByIndexRef.current.get(index)
        if (card) previewCards.set(index, card)
      }
      setPendingDrop({ indices: new Set(pendingIndices), cards: previewCards, quantities, sourceCounts })
      try {
        const result = callback(payload)
        if (result && typeof result.then === 'function') {
          // The data refresh clears a successful move; rejection restores the
          // source immediately. Preview cards retain their identity on reindex.
          void result.catch(clearPreview)
        } else {
          clearPreview()
        }
      } catch {
        clearPreview()
      }
    },
    [],
  )

  /**
   * Commits a selection and notifies the host. An empty set reports `null`
   * so hosts can distinguish "nothing selected".
   */
  const applySelection = useCallback((next: ReadonlySet<number>) => {
    const editable = new Set([...next].filter(index => {
      const card = cardByIndexRef.current.get(index)
      return card != null && !isGhostCard(card)
    }))
    setSelectedIndices(editable)
    if (editable.size === 0) {
      onSelectionChangeRef.current?.(null)
      return
    }
    const indices = [...editable]
    const catalogIds = [
      ...new Set(
        indices
          .map(index => cardByIndexRef.current.get(index)?.catalogId)
          .filter((id): id is number => id != null),
      ),
    ]
    const quantities = new Map<number, number>()
    for (const index of indices) {
      const id = cardByIndexRef.current.get(index)!.catalogId
      quantities.set(id, (quantities.get(id) ?? 0) + 1)
    }
    onSelectionChangeRef.current?.({ zone: zoneRef.current, cardIndices: indices, catalogIds,
      cards: [...quantities].map(([catalogId, quantity]) => ({ catalogId, quantity })) })
  }, [])

  const handleBackgroundPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    viewportRef.current?.focus({ preventScroll: true })
    e.currentTarget.setPointerCapture(e.pointerId)
    const boardEl = innerBoardRef.current
    if (!boardEl) return
    // The board content is CSS-scaled; convert the press to natural (unscaled)
    // coordinates so the marquee matches card positions.
    const rect = boardEl.getBoundingClientRect()
    const s = scaleRef.current
    const x = (e.clientX - rect.left) / s
    const y = (e.clientY - rect.top) / s
    marqueeStateRef.current = {
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      additive: e.shiftKey || e.ctrlKey || e.metaKey,
      baseline: new Set(selectedRef.current),
      boardEl,
    }
    setMarqueeRect({ left: x, top: y, width: 0, height: 0 })
  }, [])

  useLayoutEffect(() => {
    onSelectionStartChange(zone, handleBackgroundPointerDown)
    return () => onSelectionStartChange(zone, null)
  }, [zone, handleBackgroundPointerDown, onSelectionStartChange])

  const finalizeMarquee = useCallback(() => {
    const marquee = marqueeStateRef.current
    if (!marquee) return
    marqueeStateRef.current = null
    setMarqueeRect(null)

    const left = Math.min(marquee.startX, marquee.currentX)
    const top = Math.min(marquee.startY, marquee.currentY)
    const right = Math.max(marquee.startX, marquee.currentX)
    const bottom = Math.max(marquee.startY, marquee.currentY)

    // A near-zero box is a plain background click: clear the selection
    // (shift-held clicks keep the current selection).
    if (right - left < 4 && bottom - top < 4) {
      if (!marquee.additive) applySelection(new Set())
      return
    }

    const hits = collectMarqueeHits(
      unrolledCardsRef.current,
      cardPositionsRef.current,
      cardSlotsRef.current,
      { left, top, right, bottom },
    )
    const next = new Set(marquee.additive ? marquee.baseline : [])
    hits.forEach(index => next.add(index))
    applySelection(next)
  }, [applySelection])

  const finalizeMultiDrag = useCallback(() => {
    const multi = multiDragRef.current
    if (!multi) return
    onDragPreviewChangeRef.current(null)
    multiDragRef.current = null
    multiDragPosRef.current = null
    setMultiDrag(null)
    setMultiDragPos(null)

    const primaryBase = multi.basePositions.get(multi.primaryIndex)
    const pos = primaryBase
      ? {
          x: primaryBase.x +
            (pointerPositionRef.current.x - multi.startMousePos.x) / scaleRef.current,
          y: primaryBase.y +
            (pointerPositionRef.current.y - multi.startMousePos.y) / scaleRef.current,
        }
      : multiDragPosRef.current
    if (!pos) return

    const toZone = getDropZoneAtPointer(pointerPositionRef.current)
    const crossSlots = toZone === zoneRef.current ? null : onCrossZoneDrop(
      createDragPreview(pointerPositionRef.current, multi.indices, multi.primaryIndex))

    const { hoverCol, hoverRowRaw } = hoverFromPointer(pos, actualColumnsRef.current)
    const next = insertBlock(
      cardSlotsRef.current,
      multi.indices,
      hoverCol,
      hoverRowRaw,
      multi.primaryIndex,
    )
    if (toZone === zoneRef.current) setDraggedSlots(next)

    const movedCards = multi.indices.map(idx => ({
      cardIndex: idx,
      catalogId: multi.catalogIds.get(idx) ?? 0,
      from: multi.startSlots.get(idx) ?? { col: 0, row: 0 },
      to: crossSlots?.get(idx) ?? next.get(idx) ?? { col: 0, row: 0 },
    }))
    const isCrossZoneDrop = toZone !== zoneRef.current
    const changed = movedCards.some(m => m.from.col !== m.to.col || m.from.row !== m.to.row)
    if (changed || toZone !== zoneRef.current) {
      if (!isCrossZoneDrop) onReorder(zoneRef.current)
      const primary = movedCards.find(m => m.cardIndex === multi.primaryIndex)!
      notifyDragEnd({
        zone: zoneRef.current,
        toZone,
        cardIndex: primary.cardIndex,
        catalogId: primary.catalogId,
        from: primary.from,
        to: primary.to,
        movedCards,
      }, isCrossZoneDrop ? multi.indices : undefined)
    }
    if (!isCrossZoneDrop) setDragPointerPosition(null)
  }, [getDropZoneAtPointer, notifyDragEnd, onCrossZoneDrop, onReorder, createDragPreview])

  const cancelDrag = useCallback(() => {
    onDragPreviewChangeRef.current(null)
    marqueeStateRef.current = null
    multiDragRef.current = null
    dragStateRef.current = null
    multiDragPosRef.current = null
    setMarqueeRect(null)
    setMultiDrag(null)
    setMultiDragPos(null)
    setDraggingIndex(null)
    setDragPointerPosition(null)
  }, [])

  const handleBoardKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        cancelDrag()
        if (selectedRef.current.size > 0) {
          e.stopPropagation()
          applySelection(new Set())
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        applySelection(new Set(unrolledCardsRef.current.map(card => card.index)))
      }
    },
    [applySelection, cancelDrag],
  )

  const handleDragStart = useCallback(
    (index: number, e: ReactPointerEvent<HTMLDivElement>) => {
      const card = cardByIndexRef.current.get(index)
      if (!card || isGhostCard(card)) return
      const isTouch = e.pointerType === 'touch'
      const clientX = e.clientX
      const clientY = e.clientY
      pointerPositionRef.current = { x: clientX, y: clientY }
      setDragPointerPosition({ x: clientX, y: clientY })

      const primaryElement = e.currentTarget as HTMLElement
      const primaryRect = primaryElement.getBoundingClientRect()
      const cardOffsets = new Map<number, Position>([[index, { x: 0, y: 0 }]])
      const selectedIndicesForDrag =
        !isTouch && selectedRef.current.has(index) && selectedRef.current.size > 1
          ? [...selectedRef.current]
          : [index]
      for (const selectedIndex of selectedIndicesForDrag) {
        const element = innerBoardRef.current?.querySelector<HTMLElement>(
          `[data-deck-card-index="${selectedIndex}"]`,
        )
        const rect = element?.getBoundingClientRect()
        if (rect) {
          cardOffsets.set(selectedIndex, {
            x: rect.left - primaryRect.left,
            y: rect.top - primaryRect.top,
          })
        }
      }
      dragOverlayRef.current = {
        grabOffset: { x: clientX - primaryRect.left, y: clientY - primaryRect.top },
        cardOffsets,
        width: primaryRect.width,
        height: primaryRect.height,
      }

      // Modifier clicks toggle a copy without starting a drag.
      if (!isTouch && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        const next = new Set(selectedRef.current)
        if (next.has(index)) next.delete(index)
        else next.add(index)
        applySelection(next)
        return
      }

      e.currentTarget.setPointerCapture(e.pointerId)

      // Grabbing a card that is part of a multi-card selection drags the
      // whole selection as a stack and splices it into the column under the
      // pointer, same as a single-card drag.
      if (!isTouch && selectedRef.current.has(index) && selectedRef.current.size > 1) {
        const startSlots = new Map<number, GridSlot>()
        const basePositions = new Map<number, Position>()
        const catalogIds = new Map<number, number>()
        for (const idx of selectedRef.current) {
          const slot = cardSlotsRef.current.get(idx)
          const pos = cardPositionsRef.current.get(idx)
          if (!slot || !pos) continue
          startSlots.set(idx, slot)
          basePositions.set(idx, pos)
          const card = cardByIndexRef.current.get(idx)
          if (card) catalogIds.set(idx, card.catalogId)
        }
        const primaryBase = basePositions.get(index)
        if (!primaryBase) return
        const ordered = orderBySlot(startSlots.keys(), startSlots)
        multiDragRef.current = {
          indices: ordered,
          primaryIndex: index,
          startSlots,
          basePositions,
          startMousePos: { x: clientX, y: clientY },
          catalogIds,
        }
      setMultiDrag({
          indices: ordered,
          indexSet: new Set(ordered),
          primaryIndex: index,
          primaryBase,
          basePositions,
      })
        multiDragPosRef.current = primaryBase
        setMultiDragPos(primaryBase)
        publishDragPreview({ x: clientX, y: clientY }, ordered, index)
        return
      }

      // Single-card drag: also becomes the new (single-card) selection so the
      // card stays highlighted and can be re-grabbed or extended by a marquee.
      const startSlot = cardSlotsRef.current.get(index)
      if (!startSlot) return

      const basePos = cardPositionsRef.current.get(index) || { x: 0, y: 0 }

      dragStateRef.current = {
        index,
        startSlot,
        startMousePos: { x: clientX, y: clientY },
        basePos,
        catalogId: card?.catalogId ?? 0,
      }
      setDraggingIndex(index)
      currentPosRef.current = basePos
      setDragCurrentPos(basePos)
      applySelection(new Set([index]))
      publishDragPreview({ x: clientX, y: clientY }, [index], index)
    },
    [applySelection, publishDragPreview],
  )

  // Card indices are renumbered on sort / collapse / data changes, so any
  // selection or in-flight gesture is invalidated with them.
  useEffect(() => {
    if (previousCardsRef.current !== cards && pendingDrop != null) {
      const sourceRemovalApplied = [...pendingDrop.quantities].every(
        ([catalogId, quantity]) => {
          const currentQuantity = cards
            .filter(card => card.catalogId === catalogId)
            .reduce((total, card) => total + card.quantity, 0)
          const previousQuantity = pendingDrop.sourceCounts.get(catalogId) ?? 0
          return currentQuantity <= previousQuantity - quantity
        },
      )
      if (sourceRemovalApplied) {
        setPendingDrop(null)
        setDragPointerPosition(null)
      }
    }
    previousCardsRef.current = cards
  }, [cards, pendingDrop])

  useEffect(() => {
    if (selectedRef.current.size > 0) applySelection(new Set())
    if (marqueeStateRef.current) {
      marqueeStateRef.current = null
      setMarqueeRect(null)
    }
    if (multiDragRef.current) {
      onDragPreviewChangeRef.current(null)
      multiDragRef.current = null
      multiDragPosRef.current = null
      setMultiDrag(null)
      setMultiDragPos(null)
    }
    if (dragStateRef.current) {
      onDragPreviewChangeRef.current(null)
      dragStateRef.current = null
      setDraggingIndex(null)
      setDragPointerPosition(null)
    }
  }, [sortMode, collapsed, cards, applySelection])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const clientX = e.clientX
      const clientY = e.clientY
      pointerPositionRef.current = { x: clientX, y: clientY }
      const s = scaleRef.current

      const marquee = marqueeStateRef.current
      if (marquee) {
        const rect = marquee.boardEl.getBoundingClientRect()
        marquee.currentX = (clientX - rect.left) / s
        marquee.currentY = (clientY - rect.top) / s
        const left = Math.min(marquee.startX, marquee.currentX)
        const top = Math.min(marquee.startY, marquee.currentY)
        const width = Math.abs(marquee.currentX - marquee.startX)
        const height = Math.abs(marquee.currentY - marquee.startY)
        setMarqueeRect({ left, top, width, height })
        // Live-preview the hit cards so the selection highlight tracks the
        // box instead of appearing only on mouseup.
        if (width >= 4 || height >= 4) {
          const hits = collectMarqueeHits(
            unrolledCardsRef.current,
            cardPositionsRef.current,
            cardSlotsRef.current,
            { left, top, right: left + width, bottom: top + height },
          )
          const next = new Set(marquee.additive ? marquee.baseline : [])
          hits.forEach(index => next.add(index))
          setSelectedIndices(next)
        } else if (!marquee.additive) {
          setSelectedIndices(new Set())
        }
        return
      }

      const multi = multiDragRef.current
      if (multi) {
        publishDragPreview({ x: clientX, y: clientY }, multi.indices, multi.primaryIndex)
        const primaryBase = multi.basePositions.get(multi.primaryIndex)
        if (!primaryBase) return
        const nextPos = {
          x: primaryBase.x + (clientX - multi.startMousePos.x) / s,
          y: primaryBase.y + (clientY - multi.startMousePos.y) / s,
        }
        multiDragPosRef.current = nextPos
        setDragPointerPosition({ x: clientX, y: clientY })
        setMultiDragPos(nextPos)
        return
      }

      if (!dragStateRef.current) return
      publishDragPreview({ x: clientX, y: clientY }, [dragStateRef.current.index], dragStateRef.current.index)
      setDragPointerPosition({ x: clientX, y: clientY })
      const { startMousePos, basePos } = dragStateRef.current
      const nextPos = {
        x: basePos.x + (clientX - startMousePos.x) / s,
        y: basePos.y + (clientY - startMousePos.y) / s,
      }
      currentPosRef.current = nextPos
      setDragCurrentPos(nextPos)
    }

    const onEnd = (e: PointerEvent) => {
      pointerPositionRef.current = { x: e.clientX, y: e.clientY }
      setDragPointerPosition({ x: e.clientX, y: e.clientY })
      if (marqueeStateRef.current) {
        finalizeMarquee()
        return
      }

      if (multiDragRef.current) {
        finalizeMultiDrag()
        return
      }

      const ds = dragStateRef.current
      if (!ds) return
      onDragPreviewChangeRef.current(null)

      const currentPos = {
        x: ds.basePos.x + (e.clientX - ds.startMousePos.x) / scaleRef.current,
        y: ds.basePos.y + (e.clientY - ds.startMousePos.y) / scaleRef.current,
      }
      currentPosRef.current = currentPos

      const toZone = getDropZoneAtPointer(pointerPositionRef.current)
      const crossSlots = toZone === zoneRef.current ? null : onCrossZoneDrop(
        createDragPreview(pointerPositionRef.current, [ds.index], ds.index))

      const { hoverCol, hoverRowRaw } = hoverFromPointer(
        currentPos,
        actualColumnsRef.current,
      )
      const next = insertBlock(
        cardSlotsRef.current,
        [ds.index],
        hoverCol,
        hoverRowRaw,
        ds.index,
      )
      const finalSlot = crossSlots?.get(ds.index) ?? next.get(ds.index) ?? ds.startSlot
      const isCrossZoneDrop = toZone !== zoneRef.current
      if (toZone === zoneRef.current) setDraggedSlots(next)

      dragStateRef.current = null
      setDraggingIndex(null)
      if (
        finalSlot.col !== ds.startSlot.col ||
        finalSlot.row !== ds.startSlot.row ||
        toZone !== zoneRef.current
      ) {
        if (!isCrossZoneDrop) onReorder(zoneRef.current)
        notifyDragEnd({
          zone: zoneRef.current,
          toZone,
          cardIndex: ds.index,
          catalogId: ds.catalogId,
          from: ds.startSlot,
          to: finalSlot,
          movedCards: [
            {
              cardIndex: ds.index,
              catalogId: ds.catalogId,
              from: ds.startSlot,
              to: finalSlot,
            },
          ],
        }, isCrossZoneDrop ? [ds.index] : undefined)
      }

      if (!isCrossZoneDrop) setDragPointerPosition(null)
    }

    const onCancel = cancelDrag

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd, true)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd, true)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onCancel)
    }
  }, [cancelDrag, finalizeMarquee, finalizeMultiDrag, getDropZoneAtPointer, notifyDragEnd, publishDragPreview, onCrossZoneDrop, onReorder, createDragPreview])

  const manaColorSet = new Set<string>(CARD_COLORS)
  const overlayIndices =
    multiDrag?.indices ??
    (draggingIndex != null
      ? [draggingIndex]
      : pendingDrop != null
        ? [...pendingDrop.indices]
        : [])
  const dragOverlay =
    overlayIndices.length > 0 && typeof document !== 'undefined'
      ? createPortal(
          <div className="pointer-events-none fixed inset-0 z-[10000]">
            {overlayIndices.map((cardIndex, overlayIndex) => {
              const card = pendingDrop?.cards.get(cardIndex) ?? cardByIndex.get(cardIndex)
              if (!card) return null
              const offset = dragOverlayRef.current.cardOffsets.get(cardIndex) ?? { x: 0, y: 0 }
              const position = {
                x: (dragPointerPosition ?? pointerPositionRef.current).x - dragOverlayRef.current.grabOffset.x + offset.x,
                y: (dragPointerPosition ?? pointerPositionRef.current).y - dragOverlayRef.current.grabOffset.y + offset.y,
              }
              const diff = diffMap?.get(card.catalogId)
              const isHighlighted =
                highlightedCard != null && card.catalogId === highlightedCard.catalogId
              return (
                <SheetCard
                  key={`drag-overlay-${cardInstanceKeys.get(cardIndex) ?? cardIndex}`}
                  index={cardIndex}
                  card={card}
                  cardWidth={dragOverlayRef.current.width}
                  cardHeight={dragOverlayRef.current.height}
                  left={position.x}
                  top={position.y}
                  onDragStart={() => undefined}
                  isDragging
                  isAnyDragging={true}
                  zIndex={10000 + overlayIndex}
                  diffDelta={diffCopyIndices.has(cardIndex) ? diff?.delta : undefined}
                  highlighted={isHighlighted}
                  selected={selectedIndices.has(cardIndex)}
                />
              )
            })}
          </div>,
          document.body,
        )
      : null

  return (
    <ScrollArea.Root type="hover" className="relative min-h-0 flex-1 bg-muted/30">
      <ScrollArea.Viewport
        ref={viewportRef}
        data-deck-zone={zone}
        className="h-full w-full cursor-default outline-none"
        tabIndex={0}
        aria-label="Deck board"
        onKeyDown={handleBoardKeyDown}
        onPointerDown={handleBackgroundPointerDown}
      >
      <div style={{ height: scaledHeight, position: 'relative' }}>
        <div
          ref={innerBoardRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: scaledWidth,
            height: scaledHeight,
            touchAction: draggingIndex != null || multiDrag != null ? 'none' : 'auto',
          }}
        >
          {cardSlots.size > 0 ? (
            <div
              className="absolute left-0 top-0 flex origin-top-left"
              style={{
                gap: GAP,
                paddingLeft: GAP,
                paddingTop: GAP / 2,
                transform: `scale(${scale})`,
              }}
            >
              {displayedCounts.map((count, col) => {
                if (collapsed && col === 0) {
                  return (
                    <div
                      key={col}
                      className="flex flex-col items-center justify-center rounded-md bg-muted/50 px-1 text-xs font-medium text-muted-foreground"
                      style={{ width: DEFAULT_CARD_WIDTH, height: COLUMN_HEADER_HEIGHT - GAP / 2 }}
                    >
                      <span className="max-w-full truncate">{title}</span>
                      <span className="text-[10px] opacity-60">{count}</span>
                    </div>
                  )
                }

                const label = columnLabels[col] || ''
                const isMana = sortMode === 'colors' && manaColorSet.has(label)
                return (
                  <div
                    key={col}
                    className="flex flex-col items-center justify-center rounded-md bg-muted/50 px-1 text-xs font-medium text-muted-foreground"
                    style={{ width: DEFAULT_CARD_WIDTH, height: COLUMN_HEADER_HEIGHT - GAP / 2 }}
                  >
                    <span className="flex max-w-full items-center gap-1 truncate" title={label}>
                      {isMana ? (
                        <img
                          src={getManaSymbolSvgPath(label) ?? undefined}
                          alt={label}
                          className="h-4 w-4"
                        />
                      ) : (
                        label
                      )}
                    </span>
                    <span className="text-[10px] opacity-60">{count}</span>
                  </div>
                )
              })}
            </div>
          ) : null}

          {cardOrder.map(cardIndex => {
            const card = cardByIndex.get(cardIndex)
            const slot = effectiveCardSlots.get(cardIndex) ?? cardSlots.get(cardIndex)
            const isGroupMember = multiDrag != null && multiDrag.indexSet.has(cardIndex)
            const zIndex = isGroupMember ? 999 : (slot?.row ?? 0)
            const rawPos =
              draggingIndex === cardIndex
                ? dragCurrentPos
                : multiDrag != null && multiDrag.indexSet.has(cardIndex) && multiDragPos
                  ? {
                      x: (multiDrag.basePositions.get(cardIndex)?.x ?? 0) +
                        (multiDragPos.x - multiDrag.primaryBase.x),
                      y: (multiDrag.basePositions.get(cardIndex)?.y ?? 0) +
                        (multiDragPos.y - multiDrag.primaryBase.y),
                    }
                  : (cardPositions.get(cardIndex) ?? { x: 0, y: 0 })
            const pos = {
              x: scaleToPixel(rawPos.x),
              y: scaleToPixel(rawPos.y),
            }

            if (card) {
              const diff = diffMap?.get(card.catalogId)
              const isDiffCopy = diffCopyIndices.has(cardIndex)
              let suppressBottomBorder = false
              let suppressTopBorder = false

              // Merge a border with a neighbor only when that neighbor is also a
              // changed copy of the same sign, so unchanged copies stay clean.
              if (isDiffCopy && slot && diff?.delta) {
                const belowIdx = slotToCardIndex.get(slotKey(slot.col, slot.row + 1))
                if (belowIdx != null && diffCopyIndices.has(belowIdx)) {
                  const cardBelowDiff = diffMap?.get(cardByIndex.get(belowIdx)?.catalogId ?? -1)
                  if (
                    cardBelowDiff?.delta != null &&
                    Math.sign(cardBelowDiff.delta) === Math.sign(diff.delta)
                  ) {
                    suppressBottomBorder = true
                  }
                }

                const aboveIdx = slotToCardIndex.get(slotKey(slot.col, slot.row - 1))
                if (aboveIdx != null && diffCopyIndices.has(aboveIdx)) {
                  const cardAboveDiff = diffMap?.get(cardByIndex.get(aboveIdx)?.catalogId ?? -1)
                  if (
                    cardAboveDiff?.delta != null &&
                    Math.sign(cardAboveDiff.delta) === Math.sign(diff.delta)
                  ) {
                    suppressTopBorder = true
                  }
                }
              }

              const instanceKey = cardInstanceKeys.get(cardIndex) ?? cardIndex

              // Highlight every copy of the card across both zones, so a card
              // split between mainboard and sideboard lights up everywhere.
              const isHighlighted =
                highlightedCard != null &&
                card.catalogId === highlightedCard.catalogId

              return (
                <SheetCard
                  key={instanceKey}
                  index={cardIndex}
                  card={card}
                  cardWidth={scaledCardWidth}
                  cardHeight={scaledCardHeight}
                  occluded={slot != null && slotToCardIndex.has(slotKey(slot.col, slot.row + 1))}
                  tooltipPlacement={tooltipPlacement}
                  left={pos.x}
                  top={pos.y}
                  onDragStart={handleDragStart}
                  onContextMenu={onCardContextMenu}
                  isDragging={
                    draggingIndex === cardIndex ||
                    (multiDrag != null && multiDrag.indexSet.has(cardIndex))
                  }
                  isAnyDragging={draggingIndex !== null || multiDragPos != null}
                  zIndex={zIndex}
                  diffDelta={isDiffCopy ? diff?.delta : undefined}
                  suppressBottomBorder={suppressBottomBorder}
                  suppressTopBorder={suppressTopBorder}
                  highlighted={isHighlighted}
                  selected={selectedIndices.has(cardIndex)}
                  emphasized={!isGhostCard(card) && emphasizedCardName === card.name}
                  hiddenWhileDragging={
                    draggingIndex === cardIndex ||
                    (multiDrag != null && multiDrag.indexSet.has(cardIndex)) ||
                    pendingDrop?.indices.has(cardIndex) === true
                  }
                  dimmed={
                    !isGhostCard(card) &&
                    hoveredCardName !== null &&
                    hoveredCardName !== card.name
                  }
                />
              )
            }

            return (
              <SkeletonCard
                key={cardIndex}
                cardWidth={scaledCardWidth}
                cardHeight={scaledCardHeight}
                position={pos}
                zIndex={zIndex}
              />
            )
          })}

          {marqueeRect ? (
            <div
              className="pointer-events-none absolute z-[1100] rounded-sm border border-primary/80 bg-primary/15"
              // Cards are positioned in scaled-pixel space in this container,
              // so the marquee (stored in natural coordinates) is scaled too.
              style={{
                left: scaleToPixel(marqueeRect.left),
                top: scaleToPixel(marqueeRect.top),
                width: scaleToPixel(marqueeRect.width),
                height: scaleToPixel(marqueeRect.height),
              }}
            />
          ) : null}
        </div>
      </div>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        data-deck-scrollbar
        className="pointer-events-none flex w-2.5 touch-none select-none p-0.5"
      >
        <ScrollArea.Thumb className="pointer-events-auto relative flex-1 cursor-default rounded-full bg-muted-foreground/40 hover:bg-muted-foreground/70" />
      </ScrollArea.Scrollbar>
      {dragOverlay}
    </ScrollArea.Root>
  )
}

/**
 * Controlled deck board (mainboard + sideboard grids).
 * Host supplies cards; this component owns drag UI and sort presentation only.
 */
export function DeckBoard({
  cards,
  loading = false,
  sortMode: controlledSortMode,
  onSortModeChange,
  sideboardCollapsed: controlledSideboardCollapsed,
  onSideboardCollapsedChange,
  sideboardTooltipPlacement = 'auto',
  diffMap,
  onDragEnd,
  onSelectionChange,
  onCardOrderChange,
  onCardHoverChange,
  onCardContextMenu,
  highlightedCard,
  emphasizedCardName,
  showDeckStats = false,
  showHeader = false,
  editorTitle = 'Deck',
  emptyMessage = 'No cards to display',
  className,
}: DeckBoardProps) {
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [hoveredCardName, setHoveredCardName] = useState<string | null>(null)
  const externalEmphasisName = emphasizedCardName && cards.some(card => card.name === emphasizedCardName)
    ? emphasizedCardName : null
  const activeHoverName = hoveredCardName ?? externalEmphasisName
  const activeEmphasisName = dragPreview || hoveredCardName !== null ? null : externalEmphasisName
  const boardHoverName = !dragPreview && cards.some(card => card.name === hoveredCardName) ? hoveredCardName : null
  useEffect(() => { onCardHoverChange?.(boardHoverName) }, [boardHoverName, onCardHoverChange])
  useEffect(() => () => onCardHoverChange?.(null), [onCardHoverChange])
  const handleCardPointerOver = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const card = target.closest<HTMLElement>('[data-deck-card-name]')
    setHoveredCardName(event.buttons === 0 ? card?.dataset.deckCardName ?? null : null)
  }, [])
  const [internalSortMode, setInternalSortMode] = useState<DeckSortMode>('cmc')
  const sortMode = controlledSortMode ?? internalSortMode
  const layoutsRef = useRef(new Map<DeckZone, GridLayout>())
  const selectionStartsRef = useRef(new Map<DeckZone, (event: ReactPointerEvent<HTMLDivElement>) => void>())
  const registerSelectionStart = useCallback((zone: DeckZone, handler: ((event: ReactPointerEvent<HTMLDivElement>) => void) | null) => {
    if (handler) selectionStartsRef.current.set(zone, handler)
    else selectionStartsRef.current.delete(zone)
  }, [])
  const [placements, setPlacements] = useState<Partial<Record<DeckZone, GridPlacement>>>({})
  const registerLayout = useCallback((zone: DeckZone, layout: GridLayout) => {
    layoutsRef.current.set(zone, layout)
    if (onCardOrderChange) {
      const ordered = layout.cards.filter(card => !isGhostCard(card)).slice().sort((a, b) => {
        const left = layout.slots.get(a.index), right = layout.slots.get(b.index)
        return (left?.col ?? Infinity) - (right?.col ?? Infinity) ||
          (left?.row ?? Infinity) - (right?.row ?? Infinity)
      })
      onCardOrderChange(zone, [...new Set(ordered.map(card => card.name))])
    }
  }, [onCardOrderChange])
  const clearPlacement = useCallback((zone: DeckZone) => {
    setPlacements(previous => ({ ...previous, [zone]: undefined }))
  }, [])
  const commitCrossZoneDrop = useCallback((preview: DragPreview) => {
    const source = layoutsRef.current.get(preview.sourceZone)
    const target = layoutsRef.current.get(preview.targetZone)
    if (!source || !target?.element) return new Map<number, GridSlot>()
    const moving = new Set(preview.indices)
    const movedCards = preview.indices.map(index => source.cards.find(card => card.index === index)!)
    const remaining = source.cards.filter(card => !moving.has(card.index))
    const sourceSlots = new Map<number, GridSlot>()
    for (let col = 0; col < source.columns; ++col) {
      remaining
        .filter(card => source.slots.get(card.index)?.col === col)
        .sort((a, b) => source.slots.get(a.index)!.row - source.slots.get(b.index)!.row)
        .forEach((card, row) => sourceSlots.set(card.index, { col, row }))
    }
    const targetSlots = incomingSlots(target, preview)
    const sourceKeys = copyKeys(remaining)
    // Incoming copies follow the existing copies of each catalog ID so their
    // keys survive the host's regrouping and reindexing after persistence.
    const targetCards = [
      ...target.cards,
      ...movedCards.map((card, index) => ({ ...card, index: -index - 1 })),
    ]
    const targetKeys = copyKeys(targetCards)
    setPlacements(previous => ({
      ...previous,
      [preview.sourceZone]: {
        cardsKey: cardsKey(remaining), sortMode, collapsed: source.collapsed,
        slots: new Map(remaining.map(card => [sourceKeys.get(card.index)!, sourceSlots.get(card.index)!])),
      },
      [preview.targetZone]: {
        cardsKey: cardsKey(targetCards), sortMode, collapsed: target.collapsed,
        slots: new Map(targetCards.map(card => [targetKeys.get(card.index)!, targetSlots.get(card.index)!])),
      },
    }))
    return new Map(preview.indices.map((index, offset) => [index, targetSlots.get(-offset - 1)!]))
  }, [sortMode])

  const [internalSideboardCollapsed, setInternalSideboardCollapsed] = useState(false)
  const isSideboardCollapsed = controlledSideboardCollapsed ?? internalSideboardCollapsed

  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleGutterPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.defaultPrevented) return
    const target = event.target as HTMLElement
    if (target.closest('[data-deck-zone], [data-deck-scrollbar]')) return

    const board = containerRef.current
    if (!board) return
    const bounds = board.getBoundingClientRect()
    if (event.clientY < bounds.top || event.clientY > bounds.bottom) return

    let nearestZone: DeckZone | null = null
    let nearestDistance = Infinity
    for (const viewport of board.querySelectorAll<HTMLElement>('[data-deck-zone]')) {
      const rect = viewport.getBoundingClientRect()
      const distance = Math.max(rect.left - event.clientX, event.clientX - rect.right, 0)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestZone = viewport.dataset.deckZone as DeckZone
      }
    }
    if (nearestZone) selectionStartsRef.current.get(nearestZone)?.(event)
  }, [])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateContainerWidth = () => {
      const nextWidth = container.clientWidth
      setContainerWidth(current => current === nextWidth ? current : nextWidth)
    }

    updateContainerWidth()
    const observer = new ResizeObserver(updateContainerWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handleSortModeChange = useCallback(
    (mode: DeckSortMode) => {
      if (controlledSortMode === undefined) setInternalSortMode(mode)
      onSortModeChange?.(mode)
    },
    [controlledSortMode, onSortModeChange],
  )

  const toggleSideboard = useCallback(() => {
    const nextCollapsed = !isSideboardCollapsed
    if (controlledSideboardCollapsed === undefined) setInternalSideboardCollapsed(nextCollapsed)
    onSideboardCollapsedChange?.(nextCollapsed)
  }, [controlledSideboardCollapsed, isSideboardCollapsed, onSideboardCollapsedChange])

  const mainboardCards = useMemo(
    () => cards.filter(c => c.zone === 'Mainboard' || !c.zone),
    [cards],
  )
  const sideboardCards = useMemo(
    () => cards.filter(c => c.zone === 'Sideboard'),
    [cards],
  )

  const effectiveMainCards = useMemo(
    () => getEffectiveCardsForZone(mainboardCards, cards, 'Mainboard', diffMap?.get('Mainboard')),
    [mainboardCards, cards, diffMap],
  )
  const mainUnrolledCards = useMemo(() => unrollCards(effectiveMainCards), [effectiveMainCards])
  const mainActualColumns = useMemo(
    () => getSortModeColumns(sortMode, mainUnrolledCards).length || COLUMNS,
    [sortMode, mainUnrolledCards],
  )
  const mainNaturalWidth = DEFAULT_CARD_WIDTH * mainActualColumns + GAP * (mainActualColumns + 1)

  const effectiveSideCards = useMemo(
    () => getEffectiveCardsForZone(sideboardCards, cards, 'Sideboard', diffMap?.get('Sideboard')),
    [sideboardCards, cards, diffMap],
  )
  const sideUnrolledCards = useMemo(() => unrollCards(effectiveSideCards), [effectiveSideCards])
  const sideActualColumns = useMemo(() => {
    if (isSideboardCollapsed) return 1
    return getSortModeColumns(sortMode, sideUnrolledCards).length || COLUMNS
  }, [isSideboardCollapsed, sortMode, sideUnrolledCards])
  const sideNaturalWidth = DEFAULT_CARD_WIDTH * sideActualColumns + GAP * (sideActualColumns + 1)

  const totalNatural = mainNaturalWidth + sideNaturalWidth
  const sharedScale = useMemo(() => {
    if (containerWidth === 0 || totalNatural === 0) return 1
    return Math.min(1, (containerWidth - 1) / totalNatural)
  }, [containerWidth, totalNatural])

  const sideContainerWidth = sideNaturalWidth * sharedScale + 1
  const hasCards = cards.length > 0

  return (
    <div
      className={cn('flex h-full min-w-0 cursor-default flex-col gap-6 overflow-hidden p-4', className)}
      onPointerDown={handleGutterPointerDown}
      onPointerOver={handleCardPointerOver}
      onPointerLeave={() => setHoveredCardName(null)}
      onPointerDownCapture={() => setHoveredCardName(null)}
      onScrollCapture={() => setHoveredCardName(null)}
    >
      {showDeckStats && hasCards ? (
        <DeckStats mainboard={mainboardCards} sideboard={sideboardCards} />
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-sidebar-border/60">
        {showHeader ? (
          <CardHeader className="flex flex-shrink-0 flex-row items-center gap-3 space-y-0 border-b border-border/50 p-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <LayoutGrid className="h-4 w-4" />
              {editorTitle}
            </CardTitle>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Main</span>
              <span className="font-medium text-foreground">
                {mainboardCards.reduce((a, c) => a + c.quantity, 0)}
              </span>
              {sideboardCards.length > 0 ? (
                <>
                  <span className="opacity-40">/</span>
                  <span>Side</span>
                  <span className="font-medium text-foreground">
                    {sideboardCards.reduce((a, c) => a + c.quantity, 0)}
                  </span>
                </>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <Select
                value={sortMode}
                onValueChange={v => handleSortModeChange(v as DeckSortMode)}
              >
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue placeholder="Sort..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cmc">CMC</SelectItem>
                  <SelectItem value="colors">Colors</SelectItem>
                  <SelectItem value="types">Types</SelectItem>
                  <SelectItem value="rarity">Rarity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}

            {hasCards ? (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleSideboard}>
                {isSideboardCollapsed ? (
                  <PanelRightOpen className="h-4 w-4" />
                ) : (
                  <PanelRightClose className="h-4 w-4" />
                )}
              </Button>
            ) : null}
          </CardHeader>
        ) : null}

        <div ref={containerRef} className="relative flex min-h-0 flex-1">
          {!hasCards && loading ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Rendering deck...</span>
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {!hasCards && !loading ? (
              <div className="flex flex-1 items-center justify-center">
                <span className="text-sm text-muted-foreground">{emptyMessage}</span>
              </div>
            ) : (
              <DeckGrid
                title="Mainboard"
                cards={mainboardCards}
                allCards={cards}
                loading={loading}
                sortMode={sortMode}
                forceScale={sharedScale}
                onSelectionStartChange={registerSelectionStart}
                diffMap={diffMap?.get('Mainboard')}
                onDragEnd={onDragEnd}
                dragPreview={dragPreview}
                onDragPreviewChange={setDragPreview}
                placement={placements.Mainboard}
                onLayoutChange={registerLayout}
                onCrossZoneDrop={commitCrossZoneDrop}
                onReorder={clearPlacement}
                onSelectionChange={onSelectionChange}
                onCardContextMenu={onCardContextMenu}
                highlightedCard={highlightedCard}
                hoveredCardName={dragPreview ? null : activeHoverName}
                emphasizedCardName={activeEmphasisName}
              />
            )}
          </div>

          {hasCards ? (
            <div
              className="flex min-h-0 flex-shrink-0 flex-col border-l border-border/50 transition-[width] duration-300 ease-in-out"
              style={{ width: sideContainerWidth }}
            >
              <DeckGrid
                title="Sideboard"
                tooltipPlacement={sideboardTooltipPlacement}
                cards={sideboardCards}
                allCards={cards}
                loading={loading}
                sortMode={sortMode}
                collapsed={isSideboardCollapsed}
                forceScale={sharedScale}
                onSelectionStartChange={registerSelectionStart}
                diffMap={diffMap?.get('Sideboard')}
                onDragEnd={onDragEnd}
                dragPreview={dragPreview}
                onDragPreviewChange={setDragPreview}
                placement={placements.Sideboard}
                onLayoutChange={registerLayout}
                onCrossZoneDrop={commitCrossZoneDrop}
                onReorder={clearPlacement}
                onSelectionChange={onSelectionChange}
                onCardContextMenu={onCardContextMenu}
                highlightedCard={highlightedCard}
                hoveredCardName={dragPreview ? null : activeHoverName}
                emphasizedCardName={activeEmphasisName}
              />
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
