/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Clock, Dices, Trophy } from 'lucide-react'

import { DeckPerformanceChart } from '../components/dashboard/DeckPerformanceChart'
import { DashboardFilters } from '../components/dashboard/DashboardFilters'
import { MetagameDeckCarousel } from '../components/dashboard/MetagameDeckCarousel'
import {
  NoDataState,
  WinrateIntervalPlot,
  getBetaCI,
} from '../components/dashboard/dashboard-visuals'
import { Button } from '../primitives/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../primitives/Card'
import { Skeleton } from '../primitives/Skeleton'
import { cn } from '../lib/cn'
import type {
  DashboardLayoutProps,
  DashboardStats,
  PerformanceTrendPoint,
} from '../types/dashboard'

const TREND_HEIGHT = 220

function getDurationPercentage(duration: string) {
  const match = duration.match(/(\d+)m\s*(\d+)s/)
  if (!match) return 0
  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  const totalSeconds = minutes * 60 + seconds
  // 25 min clock (1500s) for full bar
  return Math.min(100, (totalSeconds / 1500) * 100)
}

/**
 * Home/dashboard presentation surface.
 * Host owns data hooks, filter state, and card-art/navigation adapters.
 * Chart zoom/range controls are layout-internal.
 */
export function DashboardLayout({
  gameType,
  onGameTypeChange,
  selectedFormat,
  formats,
  onFormatChange,
  dateRange,
  onDateRangeChange,
  stickyFilterOffset = 0,
  stats = null,
  loading = false,
  trend = [],
  archetypes = [],
  archetypesLoading = false,
  selectedArchetype = null,
  metagameDecks = [],
  metagameDecksLoading = false,
  metagameDecksError = null,
  getArtUrl,
  artUrls,
  renderDeckLink,
  onDeckClick,
  onMetagameDeckClick,
  renderSearchMoreMetagameDecks,
  performanceContent,
  className,
}: DashboardLayoutProps) {
  const [chartTimeRange, setChartTimeRange] = useState('14D')
  const [left, setLeft] = useState<string | number>('dataMin')
  const [right, setRight] = useState<string | number>('dataMax')
  const [refAreaLeft, setRefAreaLeft] = useState<string | number | null>(null)
  const [refAreaRight, setRefAreaRight] = useState<string | number | null>(null)
  const [hoverPercent, setHoverPercent] = useState<number | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)

  const trendData = trend as PerformanceTrendPoint[]

  const handleChartRangeChange = (range: string) => {
    setChartTimeRange(range)
    setLeft('dataMin')
    setRight('dataMax')
  }

  useEffect(() => {
    if (trendData.length > 0) {
      setLeft('dataMin')
      setRight('dataMax')
    }
  }, [trendData])

  // Auto-scale chart range if no data in current view
  useEffect(() => {
    const checkDataAvailability = (range: string) => {
      if (!trendData || trendData.length === 0) return false
      if (range === 'ALL') {
        return trendData.some(d => d.matches > 0)
      }

      const days = parseInt(range.replace('D', ''), 10)
      if (isNaN(days)) return false

      const anchorDate = dateRange?.to || dateRange?.from || new Date()
      const cutoff = new Date(anchorDate)
      cutoff.setDate(cutoff.getDate() - days)
      cutoff.setHours(0, 0, 0, 0)

      return trendData.some(d => {
        const date = new Date(d.rawDate)
        return date >= cutoff && date <= anchorDate && d.matches > 0
      })
    }

    if (trendData.length > 0) {
      if (checkDataAvailability(chartTimeRange)) return

      const ranges = ['7D', '14D', '30D', 'ALL']
      const currentIndex = ranges.indexOf(chartTimeRange)

      for (let i = currentIndex + 1; i < ranges.length; i++) {
        const nextRange = ranges[i]
        if (checkDataAvailability(nextRange)) {
          setChartTimeRange(nextRange)
          return
        }
      }

      if (chartTimeRange !== 'ALL') {
        setChartTimeRange('ALL')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trendData, dateRange])

  const zoomedData = useMemo(() => {
    let filteredData = trendData
    if (chartTimeRange !== 'ALL') {
      const days = parseInt(chartTimeRange.replace('D', ''), 10)
      if (!isNaN(days)) {
        const anchorDate = dateRange?.to || dateRange?.from || new Date()
        const cutoff = new Date(anchorDate)
        cutoff.setDate(cutoff.getDate() - days)
        cutoff.setHours(0, 0, 0, 0)

        filteredData = trendData.filter(
          d => new Date(d.rawDate) >= cutoff && new Date(d.rawDate) <= anchorDate,
        )
      }
    }

    if (left === 'dataMin' && right === 'dataMax') return filteredData

    const leftIndex = left === 'dataMin' ? 0 : filteredData.findIndex(d => d.date === left)
    const rightIndex =
      right === 'dataMax' ? filteredData.length - 1 : filteredData.findIndex(d => d.date === right)

    if (leftIndex === -1 || rightIndex === -1) return filteredData

    return filteredData.slice(leftIndex, rightIndex + 1)
  }, [trendData, chartTimeRange, left, right, dateRange])

  const xAxisTicks = useMemo(() => {
    if (zoomedData.length === 0) return []
    if (zoomedData.length <= 14) return zoomedData.map(d => d.date)

    const maxTicks = 14
    const ticks: string[] = []
    const step = Math.ceil((zoomedData.length - 1) / (maxTicks - 1))

    for (let i = 0; i < zoomedData.length - 1; i += step) {
      ticks.push(zoomedData[i].date)
    }

    ticks.push(zoomedData[zoomedData.length - 1].date)
    return ticks
  }, [zoomedData])

  const zoom = () => {
    if (refAreaLeft === refAreaRight || refAreaRight === null || refAreaLeft === null) {
      setRefAreaLeft(null)
      setRefAreaRight(null)
      return
    }

    let l = refAreaLeft
    let r = refAreaRight

    const lIndex = trendData.findIndex(d => d.date === l)
    const rIndex = trendData.findIndex(d => d.date === r)

    if (lIndex === -1 || rIndex === -1) {
      setRefAreaLeft(null)
      setRefAreaRight(null)
      return
    }

    if (lIndex > rIndex) {
      ;[l, r] = [r, l]
    }

    setRefAreaLeft(null)
    setRefAreaRight(null)
    setLeft(l)
    setRight(r)
  }

  const zoomOut = () => {
    setLeft('dataMin')
    setRight('dataMax')
  }

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setHoverPercent(percent)
    setHoverPosition({ x: e.clientX, y: e.clientY })
  }

  const handleMouseLeave = () => {
    setHoverPercent(null)
    setHoverPosition(null)
  }

  const playCI = stats ? getBetaCI(stats.playWinrate, stats.playMatches) : { start: 50, end: 50 }
  const drawCI = stats ? getBetaCI(stats.drawWinrate, stats.drawMatches) : { start: 50, end: 50 }

  const topArchetypes = useMemo(() => archetypes.slice(0, 10), [archetypes])


  return (
    <div
      className={cn('videre-ui flex flex-col gap-4 p-4 pt-0 font-sans', className)}
      data-ui-layout="dashboard"
    >
      <div className="relative grid min-w-0 gap-4 lg:grid-cols-3" data-dashboard-overview>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div role="group" aria-label="Dashboard filters"
            className="sticky z-20 flow-root shrink-0 bg-background" style={{ top: stickyFilterOffset }}>
            <DashboardFilters
              gameType={gameType}
              onGameTypeChange={onGameTypeChange}
              selectedFormat={selectedFormat}
              formats={formats}
              onFormatChange={onFormatChange}
              dateRange={dateRange}
              onDateRangeChange={onDateRangeChange}
            />
            <div aria-hidden="true" className="scroll-fade-top" style={{ top: '100%', height: '1rem' }} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <WinrateCard stats={stats} loading={loading} />
            <PlayDrawCard
              stats={stats}
              loading={loading}
              playCI={playCI}
              drawCI={drawCI}
              hoverPercent={hoverPercent}
              hoverPosition={hoverPosition}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
            <DurationCard stats={stats} loading={loading} />
          </div>

          <Card className="border-sidebar-border/60">
            <CardHeader className="flex flex-row items-center justify-between px-4 py-2">
              <CardTitle className="text-base font-medium">Performance Trend</CardTitle>
              <div className="flex items-center gap-2">
                {left !== 'dataMin' && (
                  <Button variant="outline" size="sm" onClick={zoomOut} className="h-6 px-2 text-xs">
                    Reset
                  </Button>
                )}
                <div className="flex items-center gap-1 rounded-md bg-muted/50 p-0.5">
                  {['7D', '14D', '30D', 'ALL'].map(range => (
                    <Button
                      key={range}
                      variant={chartTimeRange === range ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleChartRangeChange(range)}
                      className={`h-6 px-2 text-xs ${
                        chartTimeRange === range
                          ? 'shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col justify-center p-4 pt-0" style={{ minHeight: TREND_HEIGHT }}>
              {loading ? (
                <Skeleton className="w-full" style={{ height: TREND_HEIGHT }} />
              ) : zoomedData.length === 0 ? (
                <NoDataState
                  icon={Clock}
                  title="No Performance Trend"
                  description="Play matches over time to see your winrate trends."
                />
              ) : (
                <div className="w-full select-none overflow-visible outline-none" style={{ height: TREND_HEIGHT }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={zoomedData}
                      margin={{ top: 10, right: 10, bottom: 0, left: -26 }}
                      onMouseDown={(e: { activeLabel?: string | number } | null | undefined) => {
                        if (e?.activeLabel != null) setRefAreaLeft(e.activeLabel)
                      }}
                      onMouseMove={(e: { activeLabel?: string | number } | null | undefined) => {
                        if (refAreaLeft && e?.activeLabel != null) setRefAreaRight(e.activeLabel)
                      }}
                      onMouseUp={zoom}
                    >
                      <defs>
                        <linearGradient
                          id="splitColorWinrate"
                          x1="0"
                          y1="10"
                          x2="0"
                          y2={TREND_HEIGHT - 30}
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                        <linearGradient
                          id="splitColor95"
                          x1="0"
                          y1="10"
                          x2="0"
                          y2={TREND_HEIGHT - 30}
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                        <linearGradient
                          id="splitColor80"
                          x1="0"
                          y1="10"
                          x2="0"
                          y2={TREND_HEIGHT - 30}
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                        <linearGradient
                          id="splitColor50"
                          x1="0"
                          y1="10"
                          x2="0"
                          y2={TREND_HEIGHT - 30}
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#10b981" />
                          <stop offset="50%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#f43f5e" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                        vertical={false}
                      />
                      <ReferenceLine
                        y={50}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="3 3"
                        opacity={0.5}
                      />
                      <XAxis
                        dataKey="date"
                        height={30}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        ticks={xAxisTicks}
                        interval={0}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const winrateValue = payload.find(p => p.dataKey === 'winrate')?.value
                            const ci95Value = payload.find(p => p.dataKey === 'ci95')?.value as
                              | number[]
                              | null
                            const matchCount = payload[0].payload.matches

                            if (winrateValue === null || matchCount === 0) {
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="text-xs font-medium">{label}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">No matches</div>
                                </div>
                              )
                            }

                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="text-xs font-medium">{label}</div>
                                <div className="mt-1 flex flex-col gap-1">
                                  <span className="text-xs font-medium text-primary">
                                    Winrate: {winrateValue?.toString().slice(0, 4)}%
                                    <span className="ml-2 font-normal text-muted-foreground">
                                      ({matchCount} matches)
                                    </span>
                                  </span>
                                  {ci95Value && (
                                    <span className="text-[10px] text-muted-foreground">
                                      CI: {Math.round(ci95Value[0])}% - {Math.round(ci95Value[1])}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="rollingAvg"
                        stroke="rgba(255, 255, 255, 0.4)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                        animationDuration={150}
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        dataKey="ci95"
                        stroke="none"
                        fill="url(#splitColor95)"
                        fillOpacity={0.05}
                        activeDot={false}
                        animationDuration={150}
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        dataKey="ci80"
                        stroke="none"
                        fill="url(#splitColor80)"
                        fillOpacity={0.1}
                        activeDot={false}
                        animationDuration={150}
                        connectNulls
                      />
                      <Area
                        type="monotone"
                        dataKey="ci50"
                        stroke="none"
                        fill="url(#splitColor50)"
                        fillOpacity={0.15}
                        activeDot={false}
                        animationDuration={150}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="winrate"
                        stroke="url(#splitColorWinrate)"
                        strokeWidth={2}
                        animationDuration={150}
                        connectNulls
                        // Recharts injects chart props; keep the callback type aligned with its API.
                        dot={((props: {
                          cx?: number
                          cy?: number
                          payload?: PerformanceTrendPoint
                        }) => {
                          const { cx, cy, payload } = props
                          if (!payload || payload.winrate == null || payload.matches === 0) {
                            return <g key="empty" />
                          }
                          const color = payload.winrate >= 50 ? '#10b981' : '#f43f5e'
                          return (
                            <circle
                              key={`dot-${payload.date}`}
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill="hsl(var(--background))"
                              stroke={color}
                              strokeWidth={2}
                            />
                          )
                        }) as never}
                        activeDot={((props: {
                          cx?: number
                          cy?: number
                          payload?: PerformanceTrendPoint
                        }) => {
                          const { cx, cy, payload } = props
                          if (!payload || payload.winrate == null || payload.matches === 0) {
                            return <g key="empty-active" />
                          }
                          const color = payload.winrate >= 50 ? '#10b981' : '#f43f5e'
                          return (
                            <circle
                              key={`active-${payload.date}`}
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill={color}
                              stroke="none"
                            />
                          )
                        }) as never}
                      />
                      {refAreaLeft && refAreaRight ? (
                        <ReferenceArea
                          x1={refAreaLeft}
                          x2={refAreaRight}
                          strokeOpacity={0.3}
                          fill="hsl(var(--muted-foreground))"
                          fillOpacity={0.1}
                        />
                      ) : null}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Keep the chart inside the sticky boundary when it stacks on narrow screens. */}
          <Card className="flex h-[400px] min-h-0 min-w-0 flex-col border-sidebar-border/60 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[calc((100%-2rem)/3)]">
            <CardHeader className="flex flex-row items-center justify-between px-4 py-2">
              <CardTitle className="text-base font-medium">Deck Performance</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              {(archetypesLoading || archetypes.length > 0) && (
                <div role="group" aria-label="Deck performance chart" className="relative mx-2 mb-2 h-[320px] min-h-0 flex-1 outline-none lg:h-auto">
                  {archetypesLoading ? (
                    <div className="h-full p-4">
                      <Skeleton className="h-full w-full" />
                    </div>
                  ) : (
                    <DeckPerformanceChart archetypes={topArchetypes}
                      overallWinrate={!loading && stats && stats.totalMatches > 0 ? stats.overallWinrate : null}
                      selectedArchetype={selectedArchetype} getArtUrl={getArtUrl} artUrls={artUrls}
                      renderDeckLink={renderDeckLink} onDeckClick={onDeckClick} />
                  )}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute bottom-8 right-5 text-[10px] font-medium text-muted-foreground">
                      Winrate %
                    </div>
                    <div className="absolute left-10 top-0.5 text-[10px] font-medium text-muted-foreground">
                      Matches
                    </div>
                  </div>
                </div>
              )}

              {!archetypesLoading && archetypes.length === 0 && (
                <div className="flex min-h-[240px] flex-1 items-center justify-center">
                  <NoDataState icon={Trophy} title="No deck data"
                    description="Play some matches to see deck performance statistics." />
                </div>
              )}


            </CardContent>
          </Card>
        </div>
      </div>
      {performanceContent}
      <MetagameDeckCarousel
        decks={metagameDecks}
        loading={metagameDecksLoading}
        error={metagameDecksError}
        onDeckClick={onMetagameDeckClick}
        renderSearchMore={renderSearchMoreMetagameDecks}
      />
    </div>
  )
}

function WinrateCard({
  stats,
  loading,
}: {
  stats: DashboardStats | null
  loading: boolean
}) {
  return (
    <Card className="border-sidebar-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-1.5">
        <CardTitle className="text-sm font-medium text-muted-foreground">Overall Winrate</CardTitle>
        <Trophy className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {!stats || loading ? (
          <>
            <Skeleton className="mb-4 h-9 w-[60px]" />
            <Skeleton className="mb-2 h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-[50px]" />
              <Skeleton className="h-4 w-[50px]" />
            </div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold">
              {stats.totalMatches > 0 ? `${stats.overallWinrate}%` : 'N/A'}
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="relative">
                <div className="absolute bottom-full right-0 mb-2 text-xs font-medium text-muted-foreground">
                  {stats.ties} Ties
                </div>
                <div className="relative flex h-2 w-full overflow-hidden rounded-full transition-all">
                  {stats.totalMatches > 0 ? (
                    <>
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${stats.overallWinrate}%` }}
                      />
                      <div className="h-full flex-1 bg-rose-500" />
                      <div
                        className="h-full bg-muted-foreground/30"
                        style={{ width: `${(stats.ties / stats.totalMatches) * 100}%` }}
                      />
                      <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-background" />
                    </>
                  ) : (
                    <div className="h-full w-full bg-secondary" />
                  )}
                </div>
              </div>
              <div className="flex justify-between text-xs">
                {stats.totalMatches > 0 ? (
                  <>
                    <span className="font-medium text-emerald-500">{stats.wins} Wins</span>
                    <span className="font-medium text-rose-500">{stats.losses} Losses</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No matches recorded</span>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PlayDrawCard({
  stats,
  loading,
  playCI,
  drawCI,
  hoverPercent,
  hoverPosition,
  onMouseMove,
  onMouseLeave,
}: {
  stats: DashboardStats | null
  loading: boolean
  playCI: { start: number; end: number }
  drawCI: { start: number; end: number }
  hoverPercent: number | null
  hoverPosition: { x: number; y: number } | null
  onMouseMove: (e: ReactMouseEvent<HTMLDivElement>) => void
  onMouseLeave: () => void
}) {
  return (
    <Card className="border-sidebar-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pt-3 pb-1.5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Play / Draw Winrate
        </CardTitle>
        <Dices className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {!stats || loading ? (
          <div className="space-y-3 pt-1">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-[70px]" />
                <Skeleton className="h-4 w-[30px]" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-[70px]" />
                <Skeleton className="h-4 w-[30px]" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            <WinrateSlider
              label="On the Play"
              winrate={stats.playWinrate}
              matches={stats.playMatches}
              ci={playCI}
              hoverPercent={hoverPercent}
              hoverPosition={hoverPosition}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
            />
            <WinrateSlider
              label="On the Draw"
              winrate={stats.drawWinrate}
              matches={stats.drawMatches}
              ci={drawCI}
              hoverPercent={hoverPercent}
              hoverPosition={hoverPosition}
              onMouseMove={onMouseMove}
              onMouseLeave={onMouseLeave}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WinrateSlider({
  label,
  winrate,
  matches,
  ci,
  hoverPercent,
  hoverPosition,
  onMouseMove,
  onMouseLeave,
}: {
  label: string
  winrate: number
  matches: number
  ci: { start: number; end: number }
  hoverPercent: number | null
  hoverPosition: { x: number; y: number } | null
  onMouseMove: (e: ReactMouseEvent<HTMLDivElement>) => void
  onMouseLeave: () => void
}) {
  return (
    <div className="space-y-1">
      <div className="relative z-10 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={cn(
            'font-bold',
            matches > 0
              ? winrate >= 50
                ? 'text-emerald-500'
                : 'text-rose-500'
              : 'text-muted-foreground',
          )}
        >
          {matches > 0 ? `${winrate}%` : 'N/A'}
        </span>
      </div>
      <div className="relative h-2 w-full" onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
        <WinrateIntervalPlot
          winrate={winrate}
          matches={matches}
          confidenceInterval={ci}
        />
        {matches > 0 && hoverPercent !== null && hoverPosition && (
          <>
            <div
              className="absolute top-1/2 z-20 h-3 w-px -translate-y-1/2 bg-white shadow-[0_0_4px_rgba(0,0,0,0.5)]"
              style={{ left: `${hoverPercent}%` }}
            />
            <div
              className="pointer-events-none fixed z-50 rounded border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md"
              style={{ left: `${hoverPosition.x + 8}px`, top: `${hoverPosition.y + 8}px` }}
            >
              {hoverPercent.toFixed(1)}%
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function DurationCard({
  stats,
  loading,
}: {
  stats: DashboardStats | null
  loading: boolean
}) {
  return (
    <Card className="border-sidebar-border/60">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 px-4 pt-3 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Avg. Match Clock
          <br />
          (25m)
        </CardTitle>
        <Clock className="mt-1 h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="-mt-6 px-4 pb-3 pt-0">
        {!stats || loading ? (
          <>
            <div className="mt-2 flex justify-end">
              <Skeleton className="h-9 w-[80px]" />
            </div>
            <div className="mt-1 flex flex-col gap-1">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
            </div>
          </>
        ) : (
          <>
            <div className="mt-1 text-right text-2xl font-bold">
              {stats.totalMatches > 0 ? stats.averageDuration : 'N/A'}
            </div>
            <div className="mt-1 flex flex-col gap-1">
              <div className="relative h-5 w-full overflow-hidden rounded-md bg-secondary/50">
                {stats.totalMatches > 0 && (
                  <div
                    className="h-full bg-muted-foreground/20"
                    style={{ width: `${getDurationPercentage(stats.durationTwoGames)}%` }}
                  />
                )}
                <div className="absolute inset-0 grid grid-cols-2">
                  <div className="border-r-[3px] border-background/50" />
                  <div />
                </div>
                <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium">
                  <span className="text-muted-foreground">2 Games</span>
                  <span>{stats.totalMatches > 0 ? stats.durationTwoGames : '-'}</span>
                </div>
              </div>
              <div className="relative h-5 w-full overflow-hidden rounded-md bg-secondary/50">
                {stats.totalMatches > 0 && (
                  <div
                    className="h-full bg-muted-foreground/20"
                    style={{ width: `${getDurationPercentage(stats.durationThreeGames)}%` }}
                  />
                )}
                <div className="absolute inset-0 grid grid-cols-3">
                  <div className="border-r-[3px] border-background/50" />
                  <div className="border-r-[3px] border-background/50" />
                  <div />
                </div>
                <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium">
                  <span className="text-muted-foreground">3 Games</span>
                  <span>{stats.totalMatches > 0 ? stats.durationThreeGames : '-'}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
