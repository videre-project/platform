/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { CatalogCardImage } from '../cards/CatalogCardImage'
import { useCardTooltipHover } from '../cards/CardTooltip'
import { CollectionProductImage } from './VirtualCollectionGrid'
import { Button } from '../../primitives/Button'
import { GameLogText } from '../../utils/parse-game-log'
import type { CollectionCardEntry, CollectionPriceHistoryPoint, CollectionProductEntry } from '../../types/collection'
import { cn } from '../../lib/cn'
import {
  formatCollectionHistoryPrice,
  formatCollectionPrice,
  formatPriceDelta,
  formatPriceDeltaPercent,
  getCollectionHistoryPrecision,
} from '../../utils/collection'

type ChartPoint = CollectionPriceHistoryPoint & {
  label: string
  delta: number | null
  deltaLabel: string | null
  deltaPercent: number | null
  deltaPercentLabel: string | null
  deltaPositive: boolean | null
}

function ScrollFadeText({
  children,
  className,
  contentClassName,
  watchKey,
  ariaLabel,
}: {
  children: ReactNode
  className?: string
  contentClassName?: string
  watchKey: string
  ariaLabel: string
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [showFade, setShowFade] = useState(false)

  const updateFade = useCallback(() => {
    const element = scrollRef.current
    if (!element) return

    const hasOverflow = element.scrollHeight > element.clientHeight + 1
    const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1
    setShowFade(hasOverflow && !atBottom)
  }, [])

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    element.scrollTop = 0
    const frame = window.requestAnimationFrame(updateFade)
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateFade)

    resizeObserver?.observe(element)
    Array.from(element.children).forEach(child => resizeObserver?.observe(child))

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
    }
  }, [updateFade, watchKey])

  return (
    <div className={cn('relative mt-2 overflow-hidden', className)}>
      <div
        ref={scrollRef}
        tabIndex={0}
        aria-label={ariaLabel}
        onScroll={updateFade}
        className={cn('overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words pr-1', contentClassName)}
      >
        {children}
      </div>
      {showFade ? (
        <div
          data-testid="collection-text-scroll-fade"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-5"
          style={{ background: 'linear-gradient(to top, hsl(var(--card)), transparent)' }}
        />
      ) : null}
    </div>
  )
}

function CollectionPriceTooltip({ active, payload }: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: ChartPoint }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="min-w-[8.75rem] rounded-md border border-sidebar-border/70 bg-popover/95 px-2.5 py-2 text-xs text-popover-foreground shadow-xl backdrop-blur">
      <div className="text-[10px] font-medium uppercase leading-none text-muted-foreground">{point.date}</div>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <span className="text-muted-foreground">Average</span>
        <span className="flex items-baseline gap-1.5 font-semibold tabular-nums text-foreground">
          <span>{point.label}<span className="ml-1 text-[10px] font-medium text-muted-foreground">tix</span></span>
          {point.deltaLabel ? (
            <span className={`text-[10px] font-medium ${
              point.deltaPositive === null
                ? 'text-muted-foreground'
                : point.deltaPositive ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {point.deltaLabel}
              {point.deltaPercentLabel ? <span className="ml-1 text-current/70">({point.deltaPercentLabel})</span> : null}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  )
}

export type CollectionPriceHistoryPanelProps = {
  onClose?: () => void
  closeDisabled?: boolean
  className?: string
} & (
  | { card: CollectionCardEntry; product?: never }
  | { product: CollectionProductEntry; card?: never }
)

/** Collection detail and market-history panel, with data supplied by the host. */
export function CollectionPriceHistoryPanel({ card, product, onClose, closeDisabled = false, className }: CollectionPriceHistoryPanelProps) {
  const item = card ?? product
  const detailTooltipHandlers = useCardTooltipHover({ catalogId: item.catalogId, name: item.name })
  const gradientId = `collection-price-history-${useId().replace(/:/g, '')}`
  const chartData = useMemo<ChartPoint[]>(() => {
    const points = [...(item.prices ?? [])]
      .filter(point => Number.isFinite(point.price))
      .sort((a, b) => a.date.localeCompare(b.date))

    return points.map((point, index) => {
      const previous = index > 0 ? points[index - 1] : null
      const delta = previous ? point.price - previous.price : null
      const deltaPercent = previous && previous.price !== 0 ? delta! / previous.price * 100 : null
      return {
        ...point,
        label: formatCollectionHistoryPrice(point.price) ?? String(point.price),
        delta,
        deltaLabel: formatPriceDelta(delta),
        deltaPercent,
        deltaPercentLabel: formatPriceDeltaPercent(deltaPercent),
        deltaPositive: delta !== null && Math.abs(delta) >= 0.0005 ? delta > 0 : null,
      }
    })
  }, [item.prices])

  const priceStats = useMemo(() => {
    if (!chartData.length) return null
    const values = chartData.map(point => point.price)
    const latest = chartData.at(-1)!
    const trend = (offset: number) => {
      const baseline = chartData[Math.max(0, chartData.length - 1 - offset)]
      if (!baseline || baseline === latest) return null
      const delta = latest.price - baseline.price
      return { delta, percent: baseline.price ? delta / baseline.price * 100 : null }
    }
    return {
      latest,
      low: Math.min(...values),
      high: Math.max(...values),
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      dailyTrend: trend(1),
      weeklyTrend: trend(7),
    }
  }, [chartData])

  const trendRows = [
    { label: '1D', trend: priceStats?.dailyTrend ?? null },
    { label: '7D', trend: priceStats?.weeklyTrend ?? null },
  ]
  const trendDecimals = getCollectionHistoryPrecision(trendRows.map(row => row.trend?.delta))
  const recentRows = chartData.slice(-7).reverse()
  const recentDecimals = getCollectionHistoryPrecision(recentRows.map(point => point.price))
  const maxRecentPercent = Math.max(0, ...recentRows.map(point => Math.abs(point.deltaPercent ?? 0)))
  const chartDomain = priceStats ? (() => {
    const range = priceStats.high - priceStats.low
    const lowerPadding = range === 0 ? Math.max(priceStats.high * 0.08, 0.001) : Math.max(range * 0.18, 0.001)
    const upperPadding = range === 0 ? Math.max(priceStats.high * 0.16, 0.002) : Math.max(range * 0.35, 0.002)
    return [Math.max(0, priceStats.low - lowerPadding), priceStats.high + upperPadding] as [number, number]
  })() : undefined
  const marketPrice = formatCollectionPrice(priceStats?.latest.price ?? item.price)
  const averagePrice = formatCollectionPrice(priceStats?.average)
  const lowPrice = formatCollectionPrice(priceStats?.low)
  const highPrice = formatCollectionPrice(priceStats?.high)
  const rangePrice = lowPrice && highPrice ? `${lowPrice} - ${highPrice}` : lowPrice ?? highPrice
  const statText = card
    ? card.power && card.toughness ? `${card.power}/${card.toughness}` : card.loyalty ?? card.defense
    : null

  return (
    <aside className={`flex h-full min-h-0 w-96 shrink-0 flex-col overflow-hidden rounded-lg border border-sidebar-border/60 bg-card ${className ?? ''}`}>
      <div className="relative h-[13rem] shrink-0 overflow-hidden border-b border-sidebar-border/60 p-3">
        {card ? <div className="grid h-full grid-cols-[88px_minmax(0,1fr)] gap-x-3">
          <div className="min-w-0">
            <div {...detailTooltipHandlers} className="h-[122px] w-[88px] cursor-pointer overflow-hidden rounded border border-sidebar-border/60 bg-muted/30">
              <CatalogCardImage
                catalogId={card.catalogId}
                name={card.name}
                imageUrl={card.imageUrl}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            <div className="mt-1.5 text-left text-[11px] font-medium leading-none text-muted-foreground">
              {card.quantity.toLocaleString()} owned
            </div>
          </div>
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden pr-1">
            <div className="min-w-0 shrink-0 pr-8 text-base font-semibold leading-5 text-foreground">{card.name}</div>
            <div className="mt-2 flex shrink-0 flex-wrap items-center gap-1.5 text-[10px]">
              {card.manaCost ? (
                <span className="inline-flex h-5 items-center gap-0.5 rounded-sm border border-sidebar-border/60 bg-background/60 px-1.5 leading-none text-foreground/85">
                  <GameLogText
                    text={card.manaCost}
                    manaSymbolClassName="mx-px inline h-3.5 w-3.5 align-text-bottom"
                  />
                </span>
              ) : null}
              {card.setCode ? (
                <span className="inline-flex h-5 items-center gap-1 rounded-sm border border-sidebar-border/70 bg-background/70 px-1.5 font-medium uppercase leading-none text-muted-foreground">
                  <span className="h-2 w-2 rotate-45 rounded-[1px] bg-current opacity-80" />
                  {card.setCode}{card.collectorNumber ? ` #${card.collectorNumber}` : ''}
                </span>
              ) : null}
            </div>
            {card.typeLine ? (
              <div className="mt-2 flex min-w-0 shrink-0 items-start gap-2">
                <div className="min-w-0 flex-1 text-xs font-medium leading-4 text-foreground/85">{card.typeLine}</div>
                {statText ? (
                  <span className="inline-flex shrink-0 items-center rounded-sm bg-background/70 px-1.5 py-0.5 text-[11px] font-medium leading-none text-foreground/85 ring-1 ring-sidebar-border/65">{statText}</span>
                ) : null}
              </div>
            ) : null}
            {card.oracleText ? (
              <ScrollFadeText
                className="min-h-0 flex-1"
                contentClassName="h-full pb-2 text-xs leading-5 text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                watchKey={card.oracleText}
                ariaLabel={`${card.name} rules text`}
              >
                <GameLogText
                  text={card.oracleText}
                  manaSymbolClassName="mx-[1px] inline h-3.5 w-3.5 align-text-bottom"
                />
              </ScrollFadeText>
            ) : null}
          </div>
        </div> : (
          <div className="flex h-full items-start gap-3">
            <div className="min-w-0 shrink-0">
              <div className="h-[122px] w-[88px] overflow-hidden rounded border border-sidebar-border/60 bg-muted/30">
                <CollectionProductImage product={product} />
              </div>
              <div className="mt-1.5 text-left text-[11px] font-medium leading-none text-muted-foreground">
                {product.quantity.toLocaleString()} owned
              </div>
            </div>
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
              <div className="shrink-0 truncate pr-8 text-sm font-semibold text-foreground">{product.name}</div>
              {product.setName || product.setCode ? (
                <div className="mt-1 shrink-0 truncate text-xs text-muted-foreground">{product.setName || product.setCode}</div>
              ) : null}
              {product.description ? (
                <ScrollFadeText
                  className="min-h-0 flex-1"
                  contentClassName="h-full pb-2 text-xs leading-5 text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  watchKey={product.description}
                  ariaLabel={`${product.name} description`}
                >
                  <GameLogText text={product.description} manaSymbolClassName="mx-[1px] inline h-3.5 w-3.5 align-text-bottom" />
                </ScrollFadeText>
              ) : null}
            </div>
          </div>
        )}
        {onClose ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close price history"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-[110px] flex-1 border-b border-sidebar-border/60 px-3 py-3">
        <div className="relative h-full min-h-0 overflow-hidden rounded-md bg-background/20">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 82, right: 12, left: 12, bottom: 6 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis hide dataKey="date" />
                <YAxis hide domain={chartDomain ?? ['dataMin', 'dataMax']} />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--sidebar-foreground) / 0.25)', strokeWidth: 1 }}
                  content={props => (
                    <CollectionPriceTooltip
                      active={props.active}
                      payload={props.payload as ReadonlyArray<{ payload?: ChartPoint }> | undefined}
                    />
                  )}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No price history.</div>
          )}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-x-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase leading-none text-muted-foreground">Market Price</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[1.625rem] font-semibold leading-[1.75rem] tabular-nums text-foreground">{marketPrice ?? '-'}</span>
                <span className="text-xs font-medium text-muted-foreground">tix</span>
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 pt-4 text-[11px] leading-none">
              <div className="flex items-baseline gap-x-1"><span className="text-muted-foreground">Avg</span><span className="font-semibold tabular-nums text-foreground">{averagePrice ?? '-'}</span></div>
              <div className="flex items-baseline gap-x-1"><span className="text-muted-foreground">Range</span><span className="font-semibold tabular-nums text-foreground">{rangePrice ?? '-'}</span></div>
            </div>
            <div className="flex min-w-[7.5rem] flex-col gap-1 pt-4 text-[11px] leading-none">
              {trendRows.map(row => {
                const direction = !row.trend || Math.abs(row.trend.delta) < 0.0005 ? 'flat' : row.trend.delta > 0 ? 'up' : 'down'
                return (
                  <div key={row.label} className="flex items-center gap-x-1 whitespace-nowrap">
                    <span className="w-5 shrink-0 text-right text-muted-foreground">{row.label}</span>
                    <span className={`flex flex-1 items-center gap-1 rounded-sm px-1.5 py-px text-[10px] font-medium leading-none tabular-nums ring-1 ring-white/5 ${
                      direction === 'up' ? 'bg-emerald-500/10 text-emerald-400' : direction === 'down' ? 'bg-red-500/10 text-red-400' : 'bg-muted/55 text-muted-foreground'
                    }`}>
                      {row.trend && direction !== 'flat' ? (
                        <>
                          <span className="flex h-2.5 w-2.5 items-center justify-center">{direction === 'up' ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}</span>
                          <span className="min-w-[2.25rem] text-right">{formatPriceDelta(row.trend.delta, trendDecimals)}</span>
                          <span className="min-w-[3rem] text-current/70">({formatPriceDeltaPercent(row.trend.percent)})</span>
                        </>
                      ) : <span className="flex-1 text-right">-</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-3 pb-0 pt-2.5">
        <div className="mb-1.5 text-[10px] font-medium uppercase text-muted-foreground">Recent Prices</div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-sidebar-border/45 pb-1.5 text-[10px] font-medium uppercase leading-none text-muted-foreground">
          <span>Date</span><span className="min-w-14 text-right">Avg sell</span><span className="min-w-[6.5rem] text-right">1D Δ</span>
        </div>
        {recentRows.map(point => {
          const percentBar = maxRecentPercent > 0 ? Math.min(50, Math.abs(point.deltaPercent ?? 0) / maxRecentPercent * 50) : 0
          return (
            <div key={`${item.catalogId}-${point.date}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-stretch gap-2 border-b border-sidebar-border/35 text-xs last:border-b-0">
              <span className="flex items-center py-1.5 text-muted-foreground">{point.date}</span>
              <span className="flex items-center justify-end py-1.5 font-medium tabular-nums text-foreground">{formatCollectionHistoryPrice(point.price, recentDecimals)}</span>
              <span className={`relative grid min-w-[6.5rem] grid-cols-[2.5rem_3.5rem] items-stretch gap-0.5 self-stretch overflow-hidden rounded-sm whitespace-nowrap text-[11px] tabular-nums ${
                point.deltaPositive === null ? 'text-muted-foreground/45' : point.deltaPositive ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {point.delta !== null ? (
                  <>
                    {percentBar > 0 ? <span className={`absolute inset-y-0 opacity-20 ${point.deltaPositive ? 'left-1/2 bg-emerald-400' : 'right-1/2 bg-red-400'}`} style={{ width: `${percentBar}%` }} /> : null}
                    <span className="relative z-10 flex items-center justify-end text-right">{formatPriceDelta(point.delta)}</span>
                    <span className="relative z-10 flex items-center justify-end px-1 text-right text-current/80">({formatPriceDeltaPercent(point.deltaPercent)})</span>
                  </>
                ) : <span className="col-span-2 text-right">-</span>}
              </span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
