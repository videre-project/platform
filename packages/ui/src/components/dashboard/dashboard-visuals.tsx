/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useId, type ElementType } from 'react'
import { usePlotArea, useXAxisScale, useYAxisInverseScale, useYAxisScale } from 'recharts'

import { cn } from '../../lib/cn'

export function NoDataState({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in-50">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
        <Icon className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-[200px] text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

type DensityDeck = {
  name: string
  winrate: number
  matches: number
  keyCard?: string
}

/**
 * Approximate sampling spread for decks performing at the overall winrate.
 * These are reference bands, not estimates of an individual deck's true winrate.
 * Binomial standard error: https://www.itl.nist.gov/div898/handbook/eda/section3/eda366i.htm
 */
export function DensityLayer({ data, overallWinrate }: {
  data?: DensityDeck[]
  overallWinrate?: number | null
}) {
  const clipId = `performance-spread-${useId().replaceAll(':', '')}`
  const plot = usePlotArea()
  const xScale = useXAxisScale()
  const yScale = useYAxisScale()
  const yInverse = useYAxisInverseScale()
  const decks = data?.filter(deck => Number.isFinite(deck.matches) && deck.matches > 0
    && Number.isFinite(deck.winrate) && deck.winrate >= 0 && deck.winrate <= 100) ?? []
  const matches = decks.reduce((sum, deck) => sum + deck.matches, 0)
  // Retain support for consumers that only supply deck data.
  const average = overallWinrate === undefined && matches > 0
    ? decks.reduce((sum, deck) => sum + deck.matches * deck.winrate, 0) / matches
    : overallWinrate
  const maxMatches = plot && yInverse ? Number(yInverse(plot.y)) : 0
  if (!plot || !xScale || !yScale || !Number.isFinite(maxMatches) || maxMatches <= 0
    || average == null || !Number.isFinite(average) || average <= 0 || average >= 100) return null

  const p = average / 100
  // Sample beyond the visible axis so contour closures stay outside the plot.
  // Quadratic spacing keeps the wider curves smooth near zero matches.
  const samples = Array.from({ length: 161 }, (_, index) => maxMatches * 1.1 * (index / 160) ** 2)
  const contours = [2, 1.3, 0.65].map(deviations => {
    const edge = (n: number, direction: -1 | 1) => {
      const spread = n === 0 ? Infinity : 100 * Math.sqrt(p * (1 - p) / n)
      const rate = Math.max(0, Math.min(100, average + direction * deviations * spread))
      return `${xScale(rate)},${yScale(n)}`
    }
    return `M${samples.map(n => edge(n, -1)).join(' L')} L${[...samples].reverse().map(n => edge(n, 1)).join(' L')} Z`
  })

  return (
    <g role="img" aria-label={`Expected spread around ${average}% overall winrate; wider with fewer matches`}
      pointerEvents="none">
      <defs>
        <clipPath id={clipId}>
          <rect x={plot.x} y={plot.y} width={plot.width} height={plot.height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {contours.map((path, index) => (
          <path key={index} d={path} fill="hsl(var(--muted-foreground))" fillOpacity={0.035}
            stroke="hsl(var(--muted-foreground))" strokeOpacity={0.12} strokeWidth={0.75} />
        ))}
      </g>
    </g>
  )
}

export function BetaChart({ winrate, matches }: { winrate: number; matches: number }) {
  const width = 100
  const height = 32
  const gradientId = `betaSplitGradient-${useId().replaceAll(':', '')}`
  const wins = Math.round(matches * (winrate / 100))
  const losses = matches - wins
  const alpha = wins + 1
  const beta = losses + 1

  const points: [number, number][] = []
  let maxLogY = -Infinity

  for (let i = 0; i <= 200; i++) {
    const x = i / 200
    if (x <= 0 || x >= 1) continue

    const logY = (alpha - 1) * Math.log(x) + (beta - 1) * Math.log(1 - x)
    if (logY > maxLogY) maxLogY = logY
    points.push([x * 100, logY])
  }

  const pathData = points
    .map(([x, logY]) => {
      const normalizedY = Math.exp(logY - maxLogY)
      return `${x},${height - normalizedY * height}`
    })
    .join(' L ')

  return (
    <svg
      className="absolute -top-[28px] left-0 h-[32px] w-full overflow-visible opacity-30"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path
        d={`M 0,${height} L ${pathData} L ${width},${height} Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        d={`M 0,${height} L ${pathData} L ${width},${height}`}
        stroke={`url(#${gradientId})`}
        strokeWidth="0.5"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export type WinrateConfidenceInterval = {
  start: number
  end: number
}

export type WinrateIntervalPlotProps = {
  winrate: number
  matches: number
  confidenceInterval: WinrateConfidenceInterval
  className?: string
  showDistribution?: boolean
}

/**
 * Compact winrate plot shared by dashboard metrics and contextual tooltips.
 * The interval uses the same red/green split and beta density as the dashboard.
 */
export function WinrateIntervalPlot({
  winrate,
  matches,
  confidenceInterval,
  className,
  showDistribution = true,
}: WinrateIntervalPlotProps) {
  const intervalStart = Math.max(0, Math.min(100, confidenceInterval.start))
  const intervalEnd = Math.max(intervalStart, Math.min(100, confidenceInterval.end))
  const intervalWidth = intervalEnd - intervalStart
  const split = intervalWidth > 0
    ? Math.max(0, Math.min(100, ((50 - intervalStart) / intervalWidth) * 100))
    : 0

  return (
    <div className={cn('relative h-2 w-full', className)}>
      <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-secondary" />
      {matches > 0 && showDistribution && <BetaChart winrate={winrate} matches={matches} />}
      {intervalWidth > 0 && (
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full"
          style={{ left: `${intervalStart}%`, width: `${intervalWidth}%` }}
        >
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(to right, #f43f5e ${split}%, #10b981 ${split}%)`,
            }}
          />
        </div>
      )}
      <div
        className={cn(
          'absolute top-1/2 h-2 w-px -translate-y-1/2',
          intervalStart >= 50 ? 'bg-emerald-500' : 'bg-rose-500',
        )}
        style={{ left: `${intervalStart}%` }}
      />
      <div
        className={cn(
          'absolute top-1/2 h-2 w-px -translate-y-1/2',
          intervalEnd >= 50 ? 'bg-emerald-500' : 'bg-rose-500',
        )}
        style={{ left: `${intervalEnd}%` }}
      />
      <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-muted-foreground/30" />
      {matches > 0 && (
        <div
          className={cn(
            'absolute left-0 top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm',
            winrate >= 50 ? 'bg-emerald-500' : 'bg-rose-500',
          )}
          style={{ left: `${Math.max(0, Math.min(100, winrate))}%` }}
        />
      )}
    </div>
  )
}

export function getBetaCI(winrate: number, matches: number) {
  const wins = Math.round(matches * (winrate / 100))
  const losses = matches - wins
  const alpha = wins + 1
  const beta = losses + 1

  const mean = alpha / (alpha + beta)
  const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1))
  const sd = Math.sqrt(variance)

  // 95% CI approx (Mean +/- 2SD)
  const start = Math.max(0, (mean - 2 * sd) * 100)
  const end = Math.min(100, (mean + 2 * sd) * 100)

  return { start, end }
}
