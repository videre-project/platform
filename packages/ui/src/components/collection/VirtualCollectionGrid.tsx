/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { CatalogCardImage } from '../cards/CatalogCardImage'
import { useCardTooltipHover } from '../cards/CardTooltip'
import type {
  CollectionCardEntry,
  CollectionGridItem,
  CollectionProductEntry,
  CollectionSelection,
  CollectionViewMode,
} from '../../types/collection'
import { formatCollectionPrice } from '../../utils/collection'

const COLLECTION_GRID_GAP = 10
const COLLECTION_MIN_CARD_WIDTH = 118
const COLLECTION_CARD_RATIO = 5 / 7
const COLLECTION_ROW_OVERSCAN = 3

function useElementSize<T extends HTMLElement>(ref: RefObject<T | null>, enabled: boolean) {
  const [size, setSize] = useState({ width: 0, height: 0, scrollbarWidth: 0 })

  useEffect(() => {
    if (!enabled) return
    const element = ref.current
    if (!element) return

    const updateSize = () => setSize({
      width: element.clientWidth,
      height: element.clientHeight,
      scrollbarWidth: Math.max(0, element.offsetWidth - element.clientWidth),
    })

    updateSize()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, ref])

  return size
}

function CollectionPriceBadge({ price, quantity, top }: { price?: number | null; quantity: number; top: number }) {
  const eachLabel = formatCollectionPrice(price)
  const totalLabel = formatCollectionPrice(
    typeof price === 'number' && Number.isFinite(price) ? price * quantity : null,
  )
  if (!eachLabel || !totalLabel) return null

  return (
    <div
      className="pointer-events-none absolute right-2.5 z-20 min-w-[3.4rem] rounded-sm bg-black/85 px-1.5 py-1 text-white shadow-sm ring-1 ring-white/15"
      style={{ top }}
    >
      <div className="flex items-baseline justify-between gap-1.5 leading-none">
        <span className="text-[8px] font-medium uppercase text-white/55">total</span>
        <span className="text-[12px] font-semibold tabular-nums">{totalLabel}</span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-1.5 border-t border-white/10 pt-0.5 leading-none">
        <span className="text-[8px] font-medium uppercase text-white/45">ea</span>
        <span className="text-[10px] font-medium tabular-nums text-white/75">{eachLabel}</span>
      </div>
    </div>
  )
}

function CollectionCardTile({
  card,
  quantityTop,
  showPrice,
  selected,
  onSelect,
  position,
}: {
  card: CollectionCardEntry
  quantityTop: number
  showPrice: boolean
  selected: boolean
  onSelect: () => void
  position: CSSProperties
}) {
  const tooltipHandlers = useCardTooltipHover({ catalogId: card.catalogId, name: card.name })
  const priceLabel = showPrice ? formatCollectionPrice(card.price) : null
  const totalPriceLabel = showPrice && typeof card.price === 'number' && Number.isFinite(card.price)
    ? formatCollectionPrice(card.price * card.quantity)
    : null

  return (
    <button
      {...tooltipHandlers}
      type="button"
      onClick={onSelect}
      className={`group absolute overflow-hidden rounded-md border bg-muted/20 p-0 text-left shadow-sm transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
        selected
          ? 'border-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.75)]'
          : 'border-sidebar-border/60 hover:border-sidebar-accent/70 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)]'
      }`}
      style={position}
      title={priceLabel && totalPriceLabel
        ? `${card.quantity}x ${card.name} - ${totalPriceLabel} tix total, ${priceLabel} tix each`
        : `${card.quantity}x ${card.name}`}
    >
      <CatalogCardImage
        catalogId={card.catalogId}
        name={card.name}
        imageUrl={card.imageUrl}
        className="h-full w-full object-cover"
        loading="eager"
      />
      <div
        className="pointer-events-none absolute left-2.5 z-20 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
        style={{ top: quantityTop }}
      >
        {card.quantity}
      </div>
      {showPrice ? <CollectionPriceBadge price={card.price} quantity={card.quantity} top={quantityTop} /> : null}
    </button>
  )
}

export function CollectionProductImage({ product }: { product: CollectionProductEntry }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt={product.name} loading="eager" decoding="async" className="h-full w-full object-contain p-1.5" />
  }
  return <div className="flex h-full w-full items-center justify-center bg-muted/70 p-2"><span className="text-center text-[10px] leading-tight text-muted-foreground">{product.name}</span></div>
}

function CollectionProductTile({ product, quantityTop, showPrice, selected, onSelect, position }: {
  product: CollectionProductEntry
  quantityTop: number
  showPrice: boolean
  selected: boolean
  onSelect: () => void
  position: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group absolute overflow-hidden rounded-md border bg-muted/20 p-0 text-left shadow-sm transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${selected ? 'border-primary/70 shadow-[0_0_0_1px_hsl(var(--primary)/0.75)]' : 'border-sidebar-border/60 hover:border-sidebar-accent/70'}`}
      style={position}
      title={`${product.quantity}x ${product.name}`}
    >
      <CollectionProductImage product={product} />
      <div className="pointer-events-none absolute left-2.5 z-20 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white" style={{ top: quantityTop }}>{product.quantity}</div>
      {showPrice ? <CollectionPriceBadge price={product.price} quantity={product.quantity} top={quantityTop} /> : null}
    </button>
  )
}

export interface VirtualCollectionGridProps {
  items: CollectionGridItem[]
  viewMode?: CollectionViewMode
  selectedCatalogId: number | null
  onSelectItem: (selection: CollectionSelection) => void
  scrollable?: boolean
  loading?: boolean
  showPrice?: boolean
}

/** Virtualized collection-card grid without fetching or tooltip registration. */
export function VirtualCollectionGrid({
  items,
  viewMode = 'cards',
  selectedCatalogId,
  onSelectItem,
  scrollable = true,
  loading = false,
  showPrice = true,
}: VirtualCollectionGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { width, height, scrollbarWidth } = useElementSize(scrollRef, items.length > 0)
  const [scrollTop, setScrollTop] = useState(0)
  const layoutWidth = width + scrollbarWidth

  const columns = Math.max(
    1,
    Math.floor((layoutWidth + COLLECTION_GRID_GAP) / (COLLECTION_MIN_CARD_WIDTH + COLLECTION_GRID_GAP)),
  )
  const itemWidth = Math.max(
    96,
    Math.floor((layoutWidth - COLLECTION_GRID_GAP * (columns + 1)) / columns),
  )
  const itemHeight = Math.round(itemWidth / COLLECTION_CARD_RATIO)
  const quantityTop = Math.round(itemHeight * 0.12)
  const rowHeight = itemHeight + COLLECTION_GRID_GAP
  const totalRows = Math.ceil(items.length / columns)
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - COLLECTION_ROW_OVERSCAN)
  const endRow = Math.min(totalRows, Math.ceil((scrollTop + height) / rowHeight) + COLLECTION_ROW_OVERSCAN)
  const startIndex = startRow * columns
  const endIndex = Math.min(items.length, endRow * columns)
  const visibleItems = items.slice(startIndex, endIndex)
  const totalHeight = totalRows * rowHeight + COLLECTION_GRID_GAP

  const handleScroll = useCallback(() => setScrollTop(scrollRef.current?.scrollTop ?? 0), [])

  useEffect(() => setScrollTop(scrollRef.current?.scrollTop ?? 0), [items.length, viewMode])

  if (loading && items.length === 0) return <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">Loading collection…</div>
  if (!loading && items.length === 0) return <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">No {viewMode} match the current collection filters.</div>

  return (
    <div
      ref={scrollRef}
      onScroll={scrollable ? handleScroll : undefined}
      className={`min-h-0 flex-1 overflow-x-hidden bg-muted/10 p-0 ${scrollable ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
    >
      <div className="relative" style={{ height: Math.max(totalHeight, height), width: layoutWidth }}>
        {visibleItems.map((item, visibleIndex) => {
          const index = startIndex + visibleIndex
          const row = Math.floor(index / columns)
          const column = index % columns
          const position = {
            left: COLLECTION_GRID_GAP + column * (itemWidth + COLLECTION_GRID_GAP),
            top: COLLECTION_GRID_GAP + row * rowHeight,
            width: itemWidth,
            height: itemHeight,
          }
          return viewMode === 'products' ? (
            <CollectionProductTile
              key={`product-${item.catalogId}-${index}`}
              product={item as CollectionProductEntry}
              quantityTop={quantityTop}
              showPrice={showPrice}
              selected={selectedCatalogId === item.catalogId}
              onSelect={() => onSelectItem({ item, viewMode })}
              position={position}
            />
          ) : (
            <CollectionCardTile
              key={`card-${item.catalogId}-${index}`}
              card={item as CollectionCardEntry}
              quantityTop={quantityTop}
              showPrice={showPrice}
              selected={selectedCatalogId === item.catalogId}
              onSelect={() => onSelectItem({ item, viewMode })}
              position={position}
            />
          )
        })}
      </div>
    </div>
  )
}
