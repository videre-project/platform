/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ElementType } from 'react'

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

/** Recharts Customized layer: soft density ellipses behind scatter points. */
// Recharts injects axis maps at runtime; preserve unknown additional properties.
export function DensityLayer(props: {
  xAxisMap?: Record<string, { scale: (v: number) => number }>
  yAxisMap?: Record<string, { scale: (v: number) => number }>
  data?: DensityDeck[]
  [key: string]: unknown
}) {
  const { xAxisMap, yAxisMap, data } = props
  if (!xAxisMap || !yAxisMap || !data) return null

  const xScale = (Object.values(xAxisMap)[0] as { scale: (v: number) => number }).scale
  const yScale = (Object.values(yAxisMap)[0] as { scale: (v: number) => number }).scale

  return (
    <g>
      <defs>
        <radialGradient id="densityGradient">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
        </radialGradient>
      </defs>
      {data.map(deck => {
        const x = xScale(deck.winrate)
        const y = yScale(deck.matches)

        const p = deck.winrate / 100
        const n = deck.matches
        const sd = Math.sqrt((p * (1 - p)) / n) * 100

        // 2 sigma width (approx 95% CI)
        const rx = Math.abs(xScale(deck.winrate + sd * 2) - xScale(deck.winrate))
        const ry = 20

        return (
          <ellipse
            key={deck.name}
            cx={x}
            cy={y}
            rx={rx}
            ry={ry}
            fill="url(#densityGradient)"
          />
        )
      })}
    </g>
  )
}

export function BetaChart({ winrate, matches }: { winrate: number; matches: number }) {
  const width = 100
  const height = 32
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
        <linearGradient id="betaSplitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path
        d={`M 0,${height} L ${pathData} L ${width},${height} Z`}
        fill="url(#betaSplitGradient)"
      />
      <path
        d={`M 0,${height} L ${pathData} L ${width},${height}`}
        stroke="url(#betaSplitGradient)"
        strokeWidth="0.5"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
