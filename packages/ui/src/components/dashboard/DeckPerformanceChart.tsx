/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { createContext, memo, useContext } from 'react'
import {
  CartesianGrid, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { DashboardArchetype, DashboardLayoutProps } from '../../types/dashboard'
import { DensityLayer } from './dashboard-visuals'

function resolveArtUrl(
  cardName: string | undefined,
  getArtUrl?: (cardName: string) => string | null | undefined,
  artUrls?: Record<string, string>,
): string | null {
  if (!cardName) return null
  if (getArtUrl) {
    return getArtUrl(cardName) ?? null
  }
  return artUrls?.[cardName] ?? null
}

const DeckPointContext = createContext<
  Pick<DashboardLayoutProps, 'selectedArchetype' | 'getArtUrl' | 'artUrls' | 'renderDeckLink' | 'onDeckClick'>
>({})

function DeckPerformancePoint({
  cx = 0, cy = 0, payload,
}: {
  cx?: number
  cy?: number
  payload?: DashboardArchetype
}) {
  const { selectedArchetype, getArtUrl, artUrls, renderDeckLink, onDeckClick } = useContext(DeckPointContext)
  if (!payload) return null
  const selected = payload.archetype === selectedArchetype
  const url = resolveArtUrl(payload.topCard, getArtUrl, artUrls)
  const point = (
    <g>
      {url ? (
        <image href={url} x={cx - 12} y={cy - 12} width={24} height={24}
          opacity={0.9} preserveAspectRatio="xMidYMid slice" />
      ) : <circle cx={cx} cy={cy} r={10} fill="hsl(var(--muted))" />}
      {selected && <rect x={cx - 14} y={cy - 14} width={28} height={28} rx={4}
        fill="none" stroke="hsl(var(--primary))" strokeOpacity={0.75} strokeWidth={2} />}
    </g>
  )
  if (renderDeckLink) return renderDeckLink({ deckName: payload.archetype, children: point })
  if (!onDeckClick) return point
  return (
    <g role="button" tabIndex={0} aria-label={`Show matchups for ${payload.archetype}`}
      aria-pressed={selected} className="cursor-pointer"
      onClick={() => onDeckClick(payload.archetype)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onDeckClick(payload.archetype)
        }
      }}>
      {point}
    </g>
  )
}

// Keep the shape element stable so selecting a point preserves its keyboard focus.
const deckPointShape = <DeckPerformancePoint />

// Keep selection changes out of Recharts' layout updates, which remount its symbols.
const DeckPerformancePlot = memo(function DeckPerformancePlot({ archetypes, overallWinrate }: {
  archetypes: DashboardArchetype[]
  overallWinrate: number | null
}) {
  const rates = archetypes.map(deck => deck.winrate).filter(Number.isFinite)
  if (overallWinrate != null && Number.isFinite(overallWinrate)) rates.push(overallWinrate)
  const domain: [number, number] = rates.length ? [
    Math.max(0, Math.floor((Math.min(...rates) - 5) / 5) * 5),
    Math.min(100, Math.ceil((Math.max(...rates) + 5) / 5) * 5),
  ] : [0, 100]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 22, right: 20, bottom: 10, left: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          strokeOpacity={0.3}
          fill="hsl(var(--muted))"
          fillOpacity={0.2}
        />
        <XAxis
          type="number"
          dataKey="winrate"
          name="Winrate"
          domain={domain}
          allowDataOverflow
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          height={20}
        />
        <YAxis
          type="number"
          dataKey="matches"
          name="Matches"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <DensityLayer overallWinrate={overallWinrate} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload as {
                archetype?: string
                name?: string
                matches: number
                winrate: number
              }
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="text-xs font-medium">
                    {data.archetype || data.name}
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>{data.matches} matches</span>
                    <span
                      className={
                        data.winrate >= 50 ? 'text-emerald-500' : 'text-rose-500'
                      }
                    >
                      {data.winrate}% WR
                    </span>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Scatter
          activeShape={false}
          isAnimationActive={false}
          data={archetypes}
          shape={deckPointShape}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
})

export function DeckPerformanceChart({
  archetypes, overallWinrate, selectedArchetype, getArtUrl, artUrls, renderDeckLink, onDeckClick,
}: {
  archetypes: DashboardArchetype[]
  overallWinrate: number | null
} & Pick<DashboardLayoutProps, 'selectedArchetype' | 'getArtUrl' | 'artUrls' | 'renderDeckLink' | 'onDeckClick'>) {
  // Art resolvers may read a host cache that changes without changing their identity.
  const pointContext = {
    selectedArchetype, getArtUrl, artUrls, renderDeckLink, onDeckClick,
  }
  return (
    <DeckPointContext.Provider value={pointContext}>
      <DeckPerformancePlot archetypes={archetypes} overallWinrate={overallWinrate} />
    </DeckPointContext.Provider>
  )
}
