/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  GripVertical,
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

interface Position {
  x: number
  y: number
}

interface GridSlot {
  col: number
  row: number
}

function SheetCard({
  index,
  catalogId,
  cardWidth,
  cardHeight,
  position,
  onDragStart,
  isDragging,
  isAnyDragging,
  zIndex,
  diffDelta,
  suppressBottomBorder,
  suppressTopBorder,
}: {
  index: number
  catalogId: number
  cardWidth: number
  cardHeight: number
  position: Position
  onDragStart: (index: number, e: ReactMouseEvent | ReactTouchEvent) => void
  isDragging: boolean
  isAnyDragging?: boolean
  zIndex: number
  diffDelta?: number
  suppressBottomBorder?: boolean
  suppressTopBorder?: boolean
}) {
  const dragTransform = 'translateZ(0) scale(1.05)'
  const isAdded = diffDelta != null && diffDelta > 0

  const tooltipHandlers = useCardTooltipHover({
    catalogId,
    enabled: !isDragging && !isAnyDragging,
  })

  return (
    <div
      {...tooltipHandlers}
      className={cn(
        'absolute cursor-grab select-none overflow-hidden rounded-lg',
        isDragging ? 'cursor-grabbing shadow-xl ring-2 ring-primary/50' : 'hover:ring-1 hover:ring-primary/30',
      )}
      style={{
        left: position.x,
        top: position.y,
        width: cardWidth,
        height: cardHeight,
        zIndex: isDragging ? 1000 : zIndex,
        willChange: isDragging ? 'transform' : 'auto',
        transform: isDragging ? dragTransform : 'none',
        transition: isDragging
          ? 'transform 0.1s ease, box-shadow 0.2s ease'
          : 'left 0.15s ease-out, top 0.15s ease-out, box-shadow 0.2s ease',
      }}
      onMouseDown={e => onDragStart(index, e)}
      onTouchStart={e => onDragStart(index, e)}
    >
      <div className="group relative h-full w-full">
        <CardImage
          catalogId={catalogId}
          alt=""
          width={cardWidth}
          height={cardHeight}
          draggable={false}
          style={{ display: 'block', width: cardWidth, height: cardHeight }}
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

        <div className="absolute right-2 top-2 rounded bg-black/40 p-1 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <GripVertical className="h-3 w-3 text-white/70" />
        </div>
      </div>
    </div>
  )
}

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
  diffMap?: Map<number, DeckDiffEntry>,
): DeckEditorCard[] {
  if (!diffMap || diffMap.size === 0) return cards

  const ghostEntries: DeckEditorCard[] = []
  let nextGhostIndex = 900000

  diffMap.forEach((diff, catalogId) => {
    if (diff.delta < 0) {
      const isSide = diff.zone?.toLowerCase().includes('side')
      const isTargetSide = zone === 'Sideboard'
      if (isSide === isTargetSide) {
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
            zone,
          })
        }
      }
    }
  })

  return ghostEntries.length > 0 ? [...cards, ...ghostEntries] : cards
}

function DeckGrid({
  title,
  cards,
  allCards,
  loading,
  sortMode,
  collapsed = false,
  forceScale,
  onNaturalWidthChange,
  diffMap,
  onDragEnd,
}: {
  title: string
  cards: DeckEditorCard[]
  allCards?: DeckEditorCard[]
  loading: boolean
  sortMode: DeckSortMode
  collapsed?: boolean
  forceScale?: number
  onNaturalWidthChange?: (width: number) => void
  diffMap?: Map<number, DeckDiffEntry>
  onDragEnd?: (payload: DeckCardDragEndPayload) => void
}) {
  const dragStateRef = useRef<{
    index: number
    startSlot: GridSlot
    startMousePos: Position
    basePos: Position
    catalogId: number
  } | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dragCurrentPos, setDragCurrentPos] = useState<Position>({ x: 0, y: 0 })

  const zone: DeckZone = title.toLowerCase().includes('side') ? 'Sideboard' : 'Mainboard'
  const effectiveCards = useMemo(
    () => getEffectiveCardsForZone(cards, allCards, zone, diffMap),
    [cards, allCards, zone, diffMap],
  )

  const unrolledCards = useMemo(() => {
    const sorted = sortCardsBySortMode(effectiveCards, sortMode)
    return unrollCards(sorted)
  }, [effectiveCards, sortMode])

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

  const cardSlots = draggedSlots || defaultSlots

  const cardsPerColumn = useMemo(() => {
    const counts = new Array(actualColumns).fill(0) as number[]
    if (collapsed) {
      counts[0] = unrolledCards.length
      return counts
    }
    cardSlots.forEach(slot => {
      if (slot.col >= 0 && slot.col < actualColumns) {
        counts[slot.col] = Math.max(counts[slot.col], slot.row + 1)
      }
    })
    return counts
  }, [actualColumns, cardSlots, collapsed, unrolledCards.length])

  const effectiveCardSlots = useMemo(() => {
    if (draggingIndex == null) return cardSlots

    const offsetPerCard = getStackPeekOffset(DEFAULT_CARD_HEIGHT)
    const colWidth = DEFAULT_CARD_WIDTH + GAP
    const hoverCol = Math.max(
      0,
      Math.min(actualColumns - 1, Math.round((dragCurrentPos.x - GAP) / colWidth)),
    )
    const hoverRowRaw = Math.max(
      0,
      Math.round((dragCurrentPos.y - GAP - COLUMN_HEADER_HEIGHT) / offsetPerCard),
    )

    const next = new Map(cardSlots)
    const srcSlot = cardSlots.get(draggingIndex)
    if (!srcSlot) return cardSlots

    const targetColCards = Array.from(cardSlots.entries())
      .filter(([idx, s]) => idx !== draggingIndex && s.col === hoverCol)
      .sort((a, b) => a[1].row - b[1].row)

    const hoverRow = Math.min(hoverRowRaw, targetColCards.length)

    targetColCards.forEach(([idx], rIndex) => {
      const effectiveRow = rIndex >= hoverRow ? rIndex + 1 : rIndex
      next.set(idx, { col: hoverCol, row: effectiveRow })
    })

    if (srcSlot.col !== hoverCol) {
      const srcColCards = Array.from(cardSlots.entries())
        .filter(([idx, s]) => idx !== draggingIndex && s.col === srcSlot.col)
        .sort((a, b) => a[1].row - b[1].row)

      srcColCards.forEach(([idx], rIndex) => {
        next.set(idx, { col: srcSlot.col, row: rIndex })
      })
    }

    return next
  }, [actualColumns, cardSlots, draggingIndex, dragCurrentPos])

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

  const cardInstanceKeys = useMemo(() => {
    const keys = new Map<number, string>()
    const catalogCopyCounts = new Map<number, number>()
    unrolledCards.forEach(card => {
      const count = catalogCopyCounts.get(card.catalogId) ?? 0
      catalogCopyCounts.set(card.catalogId, count + 1)
      keys.set(card.index, `${card.catalogId}-${count}`)
    })
    return keys
  }, [unrolledCards])

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
  const zoneRef = useRef(zone)
  zoneRef.current = zone

  const handleDragStart = useCallback((index: number, e: ReactMouseEvent | ReactTouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const startSlot = cardSlotsRef.current.get(index)
    if (!startSlot) return

    const basePos = cardPositionsRef.current.get(index) || { x: 0, y: 0 }
    const card = cardByIndex.get(index)

    dragStateRef.current = {
      index,
      startSlot,
      startMousePos: { x: clientX, y: clientY },
      basePos,
      catalogId: card?.catalogId ?? 0,
    }
    setDraggingIndex(index)
    setDragCurrentPos(basePos)
  }, [cardByIndex])

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragStateRef.current) return
      const { startMousePos, basePos } = dragStateRef.current
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const s = scaleRef.current
      setDragCurrentPos({
        x: basePos.x + (clientX - startMousePos.x) / s,
        y: basePos.y + (clientY - startMousePos.y) / s,
      })
    }

    const onEnd = () => {
      const ds = dragStateRef.current
      if (!ds) return

      const currentPos = currentPosRef.current
      const cols = actualColumnsRef.current
      const slots = cardSlotsRef.current

      const offsetPerCard = getStackPeekOffset(DEFAULT_CARD_HEIGHT)
      const colWidth = DEFAULT_CARD_WIDTH + GAP
      const targetCol = Math.max(
        0,
        Math.min(cols - 1, Math.round((currentPos.x - GAP) / colWidth)),
      )
      const targetRowRaw = Math.max(
        0,
        Math.round((currentPos.y - GAP - COLUMN_HEADER_HEIGHT) / offsetPerCard),
      )

      const srcSlot = slots.get(ds.index)
      if (!srcSlot) {
        dragStateRef.current = null
        setDraggingIndex(null)
        return
      }

      const next = new Map(slots)
      const targetColCards = Array.from(next.entries())
        .filter(([idx, s]) => idx !== ds.index && s.col === targetCol)
        .sort((a, b) => a[1].row - b[1].row)

      const targetRow = Math.min(targetRowRaw, targetColCards.length)
      targetColCards.splice(targetRow, 0, [ds.index, { col: targetCol, row: targetRow }])

      targetColCards.forEach(([idx], rIndex) => {
        next.set(idx, { col: targetCol, row: rIndex })
      })

      if (srcSlot.col !== targetCol) {
        const srcColCards = Array.from(next.entries())
          .filter(([idx, s]) => idx !== ds.index && s.col === srcSlot.col)
          .sort((a, b) => a[1].row - b[1].row)

        srcColCards.forEach(([idx], rIndex) => {
          next.set(idx, { col: srcSlot.col, row: rIndex })
        })
      }

      const finalSlot = next.get(ds.index) ?? ds.startSlot
      setDraggedSlots(next)

      if (finalSlot.col !== ds.startSlot.col || finalSlot.row !== ds.startSlot.row) {
        onDragEndRef.current?.({
          zone: zoneRef.current,
          cardIndex: ds.index,
          catalogId: ds.catalogId,
          from: ds.startSlot,
          to: finalSlot,
        })
      }

      dragStateRef.current = null
      setDraggingIndex(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove)
    window.addEventListener('touchend', onEnd)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [])

  if (!loading && cards.length === 0) return null

  const manaColorSet = new Set<string>(CARD_COLORS)

  return (
    <div
      className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-scroll bg-muted/30"
      tabIndex={0}
      aria-label="Deck board"
    >
      <div style={{ height: scaledHeight, position: 'relative' }}>
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: scaledWidth,
            height: scaledHeight,
            touchAction: draggingIndex != null ? 'none' : 'auto',
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
              {cardsPerColumn.map((count, col) => {
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
            const slot = cardSlots.get(cardIndex)
            const zIndex = slot?.row ?? 0
            const rawPos =
              draggingIndex === cardIndex
                ? dragCurrentPos
                : (cardPositions.get(cardIndex) ?? { x: 0, y: 0 })
            const pos = {
              x: scaleToPixel(rawPos.x),
              y: scaleToPixel(rawPos.y),
            }

            if (card) {
              const diff = diffMap?.get(card.catalogId)
              let suppressBottomBorder = false
              let suppressTopBorder = false

              if (slot && diff?.delta) {
                const belowIdx = slotToCardIndex.get(slotKey(slot.col, slot.row + 1))
                if (belowIdx != null) {
                  const cardBelowDiff = diffMap?.get(cardByIndex.get(belowIdx)?.catalogId ?? -1)
                  if (
                    cardBelowDiff?.delta != null &&
                    Math.sign(cardBelowDiff.delta) === Math.sign(diff.delta)
                  ) {
                    suppressBottomBorder = true
                  }
                }

                const aboveIdx = slotToCardIndex.get(slotKey(slot.col, slot.row - 1))
                if (aboveIdx != null) {
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

              return (
                <SheetCard
                  key={instanceKey}
                  index={cardIndex}
                  catalogId={card.catalogId}
                  cardWidth={scaledCardWidth}
                  cardHeight={scaledCardHeight}
                  position={pos}
                  onDragStart={handleDragStart}
                  isDragging={draggingIndex === cardIndex}
                  isAnyDragging={draggingIndex !== null}
                  zIndex={zIndex}
                  diffDelta={diff?.delta}
                  suppressBottomBorder={suppressBottomBorder}
                  suppressTopBorder={suppressTopBorder}
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
        </div>
      </div>
    </div>
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
  diffMap,
  onDragEnd,
  showDeckStats = false,
  showHeader = false,
  editorTitle = 'Deck',
  emptyMessage = 'No cards to display',
  className,
}: DeckBoardProps) {
  const [internalSortMode, setInternalSortMode] = useState<DeckSortMode>('cmc')
  const sortMode = controlledSortMode ?? internalSortMode

  const [internalSideboardCollapsed, setInternalSideboardCollapsed] = useState(false)
  const isSideboardCollapsed = controlledSideboardCollapsed ?? internalSideboardCollapsed

  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (!containerRef.current) return
        setContainerWidth(containerRef.current.clientWidth)
      })
    })
    observer.observe(containerRef.current)
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
    () => getEffectiveCardsForZone(mainboardCards, cards, 'Mainboard', diffMap),
    [mainboardCards, cards, diffMap],
  )
  const mainUnrolledCards = useMemo(() => unrollCards(effectiveMainCards), [effectiveMainCards])
  const mainActualColumns = useMemo(
    () => getSortModeColumns(sortMode, mainUnrolledCards).length || COLUMNS,
    [sortMode, mainUnrolledCards],
  )
  const mainNaturalWidth = DEFAULT_CARD_WIDTH * mainActualColumns + GAP * (mainActualColumns + 1)

  const effectiveSideCards = useMemo(
    () => getEffectiveCardsForZone(sideboardCards, cards, 'Sideboard', diffMap),
    [sideboardCards, cards, diffMap],
  )
  const sideUnrolledCards = useMemo(() => unrollCards(effectiveSideCards), [effectiveSideCards])
  const sideActualColumns = useMemo(() => {
    if (isSideboardCollapsed) return 1
    return getSortModeColumns(sortMode, sideUnrolledCards).length || COLUMNS
  }, [isSideboardCollapsed, sortMode, sideUnrolledCards])
  const sideNaturalWidth =
    sideboardCards.length > 0
      ? DEFAULT_CARD_WIDTH * sideActualColumns + GAP * (sideActualColumns + 1)
      : 0

  const totalNatural = mainNaturalWidth + sideNaturalWidth
  const sharedScale = useMemo(() => {
    if (containerWidth === 0 || totalNatural === 0) return 1
    return Math.min(1, containerWidth / totalNatural)
  }, [containerWidth, totalNatural])

  const sideContainerWidth = sideboardCards.length > 0 ? sideNaturalWidth * sharedScale : 0
  const hasCards = cards.length > 0

  return (
    <div className={cn('flex h-full min-w-0 flex-col gap-6 overflow-hidden p-4', className)}>
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

            {sideboardCards.length > 0 ? (
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
                diffMap={diffMap}
                onDragEnd={onDragEnd}
              />
            )}
          </div>

          {sideboardCards.length > 0 ? (
            <div
              className="flex min-h-0 flex-shrink-0 flex-col border-l border-border/50 transition-[width] duration-300 ease-in-out"
              style={{ width: sideContainerWidth }}
            >
              <DeckGrid
                title="Sideboard"
                cards={sideboardCards}
                allCards={cards}
                loading={loading}
                sortMode={sortMode}
                collapsed={isSideboardCollapsed}
                forceScale={sharedScale}
                diffMap={diffMap}
                onDragEnd={onDragEnd}
              />
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  )
}
