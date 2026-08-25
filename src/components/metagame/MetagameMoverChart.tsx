/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@videreproject/ui'
import type { CSSProperties, ReactElement, ReactNode } from 'react'

import type {
  DeckMover,
  MetagameMatchupChange,
} from '@/hooks/useMetagameMovers'
import type {
  SideboardingMatchup,
  SideboardingMetric,
  SideboardingRow,
} from '@/hooks/useSideboarding'
import { MIN_COMPARABLE_GAMES } from '@/hooks/useMetagameMovers'
import { WinrateTooltipPlot } from '@/components/metagame/MetagameTooltip'
import { MetagameAxisArrow } from '@/components/metagame/MetagameAxisArrow'
import { MetagameMobileLabelRail } from '@/components/metagame/MetagameMobileLabelRail'
import { useMatchupHover } from '@/components/metagame/useMatchupHover'

interface MetagameMoverChartProps {
  mode?: 'movers'
  movers: DeckMover[]
  columns: string[]
  changes: MetagameMatchupChange[]
  shareMaximum: number
  winrateMinimum: number
  winrateMaximum: number
}

interface SideboardingChartProps {
  mode: 'sideboarding'
  rows: SideboardingRow[]
  columns: string[]
  matchups: SideboardingMatchup[]
}

type ChartProps = MetagameMoverChartProps | SideboardingChartProps

const keyFor = (archetype: string, opponent: string) => `${archetype}\u0000${opponent}`

const parsePercentage = (value: string | undefined): number => {
  const parsed = Number.parseFloat(value?.replace(/[±%]/g, '') ?? '')
  return Number.isFinite(parsed) ? parsed : 0
}

const observedValues = (values: Array<string | undefined>) => values
  .filter((value): value is string => value !== undefined)
  .map(parsePercentage)

const expandMaximum = (limit: number, values: number[]) => Math.max(
  limit,
  Math.ceil(Math.max(...values, limit)),
)

const expandMinimum = (limit: number, values: number[]) => Math.min(
  limit,
  Math.floor(Math.min(...values, limit)),
)

const formatDelta = (value: number | undefined) => value === undefined
  ? 'Unavailable'
  : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

const formatMatchupDelta = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`

const scaleValue = (value: number | undefined, minimum: number, maximum: number): number => {
  if (value === undefined || maximum <= minimum) return 0
  return Math.min(100, Math.max(0, ((value - minimum) / (maximum - minimum)) * 100))
}

function TooltipRows({ rows }: { rows: Array<{ label: string, value: ReactNode }> }) {
  return (
    <dl>
      {rows.map(row => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

function ComparisonTooltip({ heading, rows, plot, children, open }: {
  heading: ReactNode
  rows: Array<{ label: string, value: ReactNode }>
  plot?: ReactNode
  children: ReactElement
  open?: boolean
}) {
  return (
    <Tooltip disableHoverableContent open={open}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="metagame-tooltip-content">
        <strong className="metagame-tooltip-heading">{heading}</strong>
        {plot}
        <TooltipRows rows={rows} />
      </TooltipContent>
    </Tooltip>
  )
}

export function DifferenceBar({ value, previousValue, currentValue, minimum, maximum, label, tooltipHeading, current, previous, plot, comparisonLabel = 'Previous', formatDifference = formatDelta }: {
  value: number | undefined
  previousValue: number | undefined
  currentValue: number | undefined
  minimum: number
  maximum: number
  label: string
  tooltipHeading?: ReactNode
  current: string
  previous: string
  plot?: ReactNode
  comparisonLabel?: string
  formatDifference?: (value: number | undefined) => string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLElement>(null)
  const [labelWidth, setLabelWidth] = useState<number | undefined>()
  const previousPosition = scaleValue(previousValue, minimum, maximum)
  const currentPosition = scaleValue(currentValue, minimum, maximum)
  const hasReportableChange = value !== undefined
  const positive = value === undefined || value >= 0
  const baseEnd = value === undefined ? Math.max(previousPosition, currentPosition) : positive
    ? previousPosition
    : currentPosition
  const deltaStart = Math.min(previousPosition, currentPosition)
  const deltaEnd = Math.max(previousPosition, currentPosition)
  const deltaWidth = Math.abs(currentPosition - previousPosition)
  useLayoutEffect(() => {
    const track = trackRef.current
    const labelElement = labelRef.current
    if (!track || !labelElement) return

    const updateLabelWidth = () => {
      if (track.clientWidth === 0) return
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
      const labelGap = (Number.isFinite(rootFontSize) ? rootFontSize : 16) * 0.4
      setLabelWidth(((labelElement.offsetWidth + labelGap) / track.clientWidth) * 100)
    }

    updateLabelWidth()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateLabelWidth)
    observer.observe(track)
    observer.observe(labelElement)
    return () => observer.disconnect()
  }, [label, value])

  // Keep the label wholly in a neutral region whenever the change segment is
  // wide enough to make that possible. The measured width includes the CSS
  // gap used between a label and a fill, keeping edge labels inside the track.
  const measuredLabelWidth = labelWidth ?? 35
  const fitsAfterCurrent = 100 - currentPosition >= measuredLabelWidth
  const fitsBeforeCurrent = currentPosition >= measuredLabelWidth
  const labelLeftOfFill = positive && !fitsAfterCurrent && deltaStart >= measuredLabelWidth
  const labelRightOfFill = !positive && !fitsBeforeCurrent && 100 - deltaEnd >= measuredLabelWidth
  const labelAtRightEdge = positive && !fitsAfterCurrent && !labelLeftOfFill
  const labelAtStart = !positive && !fitsBeforeCurrent && !labelRightOfFill
  const labelPosition = labelLeftOfFill ? deltaStart : labelRightOfFill ? deltaEnd : currentPosition
  const rows = [
    ...(plot ? [] : [
      { label: 'Current', value: current },
      { label: comparisonLabel, value: previous },
      { label: 'Change', value: formatDifference(value) },
    ]),
  ]
  return (
    <ComparisonTooltip
      heading={tooltipHeading ?? label}
      plot={plot}
      rows={rows}
    >
      <div
        ref={trackRef}
        className="metagame-difference-track"
      >
        <span
          className="metagame-difference-base"
          style={{ width: `${baseEnd}%` }}
        />
        <span
          className={`metagame-difference-fill ${hasReportableChange ? positive ? 'is-positive' : 'is-negative' : 'is-unavailable'}`}
          style={{ left: `${deltaStart}%`, width: `${deltaWidth}%` }}
        />
        <strong
          ref={labelRef}
          className={`metagame-difference-label ${hasReportableChange ? positive ? 'is-positive' : 'is-negative' : 'is-unavailable'}${labelLeftOfFill ? ' is-left-of-fill' : ''}${labelRightOfFill ? ' is-right-of-fill' : ''}${labelAtRightEdge ? ' is-right-edge' : ''}${labelAtStart ? ' is-near-start' : ''}`}
          style={{ left: `${labelPosition}%` }}
        >
          {value === undefined ? '—' : formatDifference(value)}
        </strong>
      </div>
    </ComparisonTooltip>
  )
}

function getMatchupColor(change: number | undefined, opacity?: number): string | undefined {
  if (change === undefined) return undefined
  const intensity = opacity ?? Math.min(0.86, 0.35 + Math.abs(change) / 24)
  return change >= 0
    ? `hsl(var(--emerald) / ${intensity})`
    : `hsl(var(--rose) / ${intensity})`
}

function getUnknownMatchupColor(change: MetagameMatchupChange): string | undefined {
  if (change.archetype === change.opponent || change.change !== undefined) return undefined
  if (change.currentWinrate === undefined || change.currentGames === undefined) return undefined
  if (change.currentGames <= MIN_COMPARABLE_GAMES) return undefined

  // The delta is unavailable, but a sufficiently large current-period sample
  // still tells us which side of the 50% line the matchup belongs on. Use the
  // same neutral intensity as a rendered +0/-0 cell rather than implying the
  // size of an unreportable change.
  return getMatchupColor(change.currentWinrate >= 50 ? 0 : -Number.MIN_VALUE, 0.2)
}

function MatchupDifferenceCell({ change, isDimmed, isActive, onActivate, onDeactivate }: {
  change: MetagameMatchupChange
  isDimmed: boolean
  isActive: boolean
  onActivate: (row: string, opponent: string) => void
  onDeactivate: () => void
}) {
  const value = change.change
  const isMirror = change.archetype === change.opponent
  const hasInsufficientGames = !isMirror
    && change.currentGames !== undefined
    && change.previousGames !== undefined
    && (change.currentGames < MIN_COMPARABLE_GAMES || change.previousGames < MIN_COMPARABLE_GAMES)
  const display = isMirror ? '–' : value === undefined ? '?' : `${value > 0 ? '+' : ''}${value.toFixed(0)}`
  const color = getMatchupColor(value) ?? getUnknownMatchupColor(change)
  const heading = (
    <span className="metagame-tooltip-matchup-heading">
      <span>{change.archetype}</span>
      <span>vs</span>
      <span>{change.opponent}</span>
    </span>
  )
  const plot = change.currentWinrate !== undefined && change.currentConfidenceInterval !== undefined ? (
    <WinrateTooltipPlot
      winrate={change.currentWinrate}
      confidenceInterval={change.currentConfidenceInterval}
      games={change.currentGames}
      previous={change.previousWinrate !== undefined && change.previousConfidenceInterval !== undefined ? {
        winrate: change.previousWinrate,
        confidenceInterval: change.previousConfidenceInterval,
        games: change.previousGames,
      } : undefined}
    />
  ) : change.previousWinrate !== undefined && change.previousConfidenceInterval !== undefined ? (
    <WinrateTooltipPlot
      winrate={change.previousWinrate}
      confidenceInterval={change.previousConfidenceInterval}
      games={change.previousGames}
      muted
    />
  ) : undefined
  const currentRow = {
    label: 'Current',
    value: change.currentWinrate === undefined
      ? 'Unavailable'
      : `${change.currentWinrate.toFixed(1)}% ±${change.currentConfidenceInterval?.toFixed(1) ?? '—'}% (${change.currentGames ?? '—'} games)`,
  }
  const comparisonRows = isMirror ? [{ label: 'Result', value: 'Mirror match' }] : plot ? [] : (
    change.currentWinrate === undefined && change.previousWinrate === undefined
      ? [{ label: 'Result', value: 'No data' }]
      : [
        currentRow,
        { label: 'Previous', value: change.previousWinrate === undefined
          ? 'Unavailable'
          : `${change.previousWinrate.toFixed(1)}% ±${change.previousConfidenceInterval?.toFixed(1) ?? '—'}% (${change.previousGames ?? '—'} games)` },
        { label: 'Change', value: value === undefined
          ? hasInsufficientGames ? 'Insufficient games to compare' : 'No data in one or both periods'
          : formatMatchupDelta(value) },
      ]
  )

  if (isMirror) {
    return <div
      className="metagame-matchup-cell metagame-mover-matchup-cell is-mirror"
      aria-label={`${change.archetype} versus ${change.opponent}: ${display}`}
    >
      <strong>{display}</strong>
    </div>
  }

  return (
    <ComparisonTooltip
      heading={heading}
      plot={plot}
      rows={comparisonRows}
      open={isActive}
    >
      <div
        className={`metagame-matchup-cell metagame-mover-matchup-cell ${value === undefined ? 'is-unknown' : ''}${isDimmed ? ' is-matchup-dimmed' : ''}`}
        style={color ? { background: color } : undefined}
        aria-label={`${change.archetype} versus ${change.opponent}: ${display}`}
        role="button"
        tabIndex={0}
        onMouseEnter={() => onActivate(change.archetype, change.opponent)}
        onMouseLeave={onDeactivate}
        onFocus={() => onActivate(change.archetype, change.opponent)}
        onBlur={onDeactivate}
      >
        <strong>{display}</strong>
      </div>
    </ComparisonTooltip>
  )
}

function SideboardingPerformanceBar({
  label,
  tooltipHeading,
  metric,
  minimum,
  maximum,
  mean,
}: {
  label: string
  tooltipHeading: string
  metric: SideboardingMetric | null
  minimum: number
  maximum: number
  mean: SideboardingMetric
}) {
  if (!metric) {
    return <span className="metagame-sideboarding-unavailable">—</span>
  }

  return (
    <div className="metagame-sideboarding-performance-bar" role="img" aria-label={`${label}: ${metric.winrate.toFixed(1)}% versus ${mean.winrate.toFixed(1)}% average`}>
      <DifferenceBar
        value={metric.winrate - mean.winrate}
        previousValue={mean.winrate}
        currentValue={metric.winrate}
        minimum={minimum}
        maximum={maximum}
        label={label}
        tooltipHeading={tooltipHeading}
        current={`${metric.winrate.toFixed(1)}% ±${metric.confidenceInterval.toFixed(1)}% (${metric.games} games)`}
        previous={`${mean.winrate.toFixed(1)}% average`}
        comparisonLabel="Average"
        plot={(
          <WinrateTooltipPlot
            winrate={metric.winrate}
            confidenceInterval={metric.confidenceInterval}
            games={metric.games}
            previous={{
              winrate: mean.winrate,
              confidenceInterval: mean.confidenceInterval,
              games: mean.games,
            }}
          />
        )}
      />
    </div>
  )
}

function SideboardingMatchupCell({ change, isDimmed, isActive, onActivate, onDeactivate }: {
  change: SideboardingMatchup | undefined
  isDimmed: boolean
  isActive: boolean
  onActivate: (row: string, opponent: string) => void
  onDeactivate: () => void
}) {
  const isMirror = change?.archetype === change?.opponent
  const hasInsufficientGames = !isMirror
    && change?.postboard !== null
    && change !== undefined
    && (change.gameOne.games < MIN_COMPARABLE_GAMES || change.postboard.games < MIN_COMPARABLE_GAMES)
  const value = !hasInsufficientGames && change?.postboard && change.gameOne
    ? change.postboard.winrate - change.gameOne.winrate
    : undefined
  const display = isMirror ? '–' : value === undefined ? '?' : `${value > 0 ? '+' : ''}${value.toFixed(0)}`
  const color = getMatchupColor(value)
  const heading = change ? (
    <span className="metagame-tooltip-matchup-heading">
      <span>{change.archetype}</span>
      <span>vs</span>
      <span>{change.opponent}</span>
    </span>
  ) : 'Sideboarding performance'
  const plot = change?.postboard ? (
    <WinrateTooltipPlot
      winrate={change.postboard.winrate}
      confidenceInterval={change.postboard.confidenceInterval}
      games={change.postboard.games}
      previous={{
        winrate: change.gameOne.winrate,
        confidenceInterval: change.gameOne.confidenceInterval,
        games: change.gameOne.games,
      }}
    />
  ) : change ? (
    <WinrateTooltipPlot
      winrate={change.gameOne.winrate}
      confidenceInterval={change.gameOne.confidenceInterval}
      games={change.gameOne.games}
    />
  ) : undefined

  if (isMirror) {
    return <div
      className="metagame-matchup-cell metagame-mover-matchup-cell is-mirror"
      aria-label={`${change?.archetype ?? 'Unknown'} versus ${change?.opponent ?? 'Unknown'}: ${display}`}
    >
      <strong>{display}</strong>
    </div>
  }

  return (
    <ComparisonTooltip
      heading={heading}
      plot={plot}
      rows={plot ? [] : change && !isMirror ? [{
        label: 'Change',
        value: value === undefined
          ? hasInsufficientGames ? 'Insufficient games to compare' : 'Games 2–3 unavailable'
          : formatMatchupDelta(value),
      }] : [{ label: 'Result', value: isMirror ? 'Mirror match' : 'No data' }]}
      open={isActive}
    >
      <div
        className={`metagame-matchup-cell metagame-mover-matchup-cell ${value === undefined ? 'is-unknown' : ''}${isDimmed ? ' is-matchup-dimmed' : ''}`}
        style={color ? { background: color } : undefined}
        aria-label={`${change?.archetype ?? 'Unknown'} versus ${change?.opponent ?? 'Unknown'}: ${display}`}
        role="button"
        tabIndex={0}
        onMouseEnter={() => change && onActivate(change.archetype, change.opponent)}
        onMouseLeave={onDeactivate}
        onFocus={() => change && onActivate(change.archetype, change.opponent)}
        onBlur={onDeactivate}
      >
        <strong>{display}</strong>
      </div>
    </ComparisonTooltip>
  )
}

const weightedMean = (rows: SideboardingRow[], selector: (row: SideboardingRow) => SideboardingMetric | null): SideboardingMetric => {
  const values = rows.map(selector).filter((metric): metric is SideboardingMetric => metric !== null)
  const games = values.reduce((sum, metric) => sum + metric.games, 0)
  if (games === 0) {
    return { games: 0, winrate: 50, confidenceInterval: 0 }
  }

  const wins = values.reduce((sum, metric) => sum + (metric.winrate / 100) * metric.games, 0)
  const winrate = (wins / games) * 100
  const standardError = Math.sqrt((winrate / 100) * (1 - winrate / 100) / games)
  return {
    games,
    winrate,
    confidenceInterval: 1.96 * standardError * 100,
  }
}

export function MetagameMoverChart(props: ChartProps) {
  const { columns } = props
  const isSideboarding = props.mode === 'sideboarding'
  const movers = props.mode === 'sideboarding' ? [] : props.movers
  const changes = props.mode === 'sideboarding' ? [] : props.changes
  const sideboardingRows = props.mode === 'sideboarding' ? props.rows : []
  const sideboardingMatchups = props.mode === 'sideboarding' ? props.matchups : []
  const shareMaximum = props.mode === 'sideboarding' ? 0 : props.shareMaximum
  const winrateMinimum = props.mode === 'sideboarding' ? 0 : props.winrateMinimum
  const winrateMaximum = props.mode === 'sideboarding' ? 0 : props.winrateMaximum
  const chartScrollRef = useRef<HTMLDivElement>(null)
  const matrixScrollRef = useRef<HTMLDivElement>(null)
  const matrixHeaderRef = useRef<HTMLElement>(null)
  const matrixHeaderScrollRef = useRef<HTMLDivElement>(null)
  const matrixViewportRef = useRef<HTMLDivElement>(null)
  const matrixHeaderCellRefs = useRef<Array<HTMLSpanElement | null>>([])
  const matrixHeaderLabelRefs = useRef<Array<HTMLSpanElement | null>>([])
  const matrixEdgeFrameRef = useRef<number | null>(null)

  const syncMatrixScroll = useCallback(() => {
    const chartScroll = chartScrollRef.current
    const matrixScroll = matrixScrollRef.current
    const header = matrixHeaderRef.current
    const headerScroll = matrixHeaderScrollRef.current
    const viewport = matrixViewportRef.current
    if (!chartScroll || !matrixScroll || !header || !headerScroll || !viewport) return

    const useOuterScroll = window.matchMedia('(max-width: 820px)').matches
    const scroll = useOuterScroll ? chartScroll : matrixScroll
    const left = scroll.scrollLeft
    const maximum = Math.max(0, scroll.scrollWidth - scroll.clientWidth)
    header.style.setProperty('transform', useOuterScroll ? 'none' : `translateX(-${left}px)`)
    const hasLeftOverflow = left > 1
    const hasRightOverflow = left < maximum - 1
    for (const target of [chartScroll, headerScroll, viewport]) {
      target.classList.toggle('has-left-overflow', hasLeftOverflow)
      target.classList.toggle('has-right-overflow', hasRightOverflow)
    }

    const viewportBounds = scroll.getBoundingClientRect()
    const stickyRail = useOuterScroll
      ? chartScroll.querySelector<HTMLElement>('.metagame-mobile-label-rail')
      : null
    const viewportLeft = Math.max(viewportBounds.left, stickyRail?.getBoundingClientRect().right ?? viewportBounds.left)
    const headerOverhang = 32
    matrixHeaderCellRefs.current.forEach((cell, index) => {
      const label = matrixHeaderLabelRefs.current[index]
      if (!cell || !label) return

      const cellBounds = cell.getBoundingClientRect()
      const labelBounds = label.getBoundingClientRect()
      let edge: 'left' | 'right' | 'hidden-right' | null = null
      if (cellBounds.left >= viewportBounds.right) {
        edge = 'hidden-right'
      } else {
        const labelIsVisible = labelBounds.right > viewportLeft && labelBounds.left < viewportBounds.right + headerOverhang
        if (labelIsVisible) {
          if (cellBounds.left < viewportLeft) edge = 'left'
          else if (cellBounds.right > viewportBounds.right) edge = 'right'
        }
      }

      for (const target of [cell, label]) {
        target.classList.remove('is-edge-hidden-right', 'is-edge-faded-left', 'is-edge-faded-right')
        if (edge === 'hidden-right') target.classList.add('is-edge-hidden-right')
        else if (edge) target.classList.add(`is-edge-faded-${edge}`)
      }
    })
  }, [])

  const scheduleMatrixScroll = useCallback(() => {
    if (matrixEdgeFrameRef.current !== null) return
    matrixEdgeFrameRef.current = requestAnimationFrame(() => {
      matrixEdgeFrameRef.current = null
      syncMatrixScroll()
    })
  }, [syncMatrixScroll])

  useLayoutEffect(() => {
    syncMatrixScroll()
    const chartScroll = chartScrollRef.current
    const matrixScroll = matrixScrollRef.current
    if (!chartScroll || !matrixScroll) return

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMatrixScroll)
    observer?.observe(chartScroll)
    observer?.observe(matrixScroll)
    window.addEventListener('resize', scheduleMatrixScroll)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', scheduleMatrixScroll)
      if (matrixEdgeFrameRef.current !== null) cancelAnimationFrame(matrixEdgeFrameRef.current)
      matrixEdgeFrameRef.current = null
    }
  }, [scheduleMatrixScroll, syncMatrixScroll, columns.length])

  const changesByKey = new Map(changes.map(change => [keyFor(change.archetype, change.opponent), change]))
  const sideboardingMatchupsByKey = new Map(sideboardingMatchups.map(change => [keyFor(change.archetype, change.opponent), change]))
  const shareValues = observedValues(movers.flatMap(mover => [
    mover.current?.percentage,
    mover.previous?.percentage,
  ]))
  const winrateValues = observedValues(movers.flatMap(mover => [
    mover.current?.game_winrate,
    mover.previous?.game_winrate,
  ]))
  // Keep the mover chart on the same scale as the main chart, expanding only
  // the edge needed to contain a mover that falls outside that scale. Values
  // are rounded outward so the bars never terminate beyond their axis.
  const moverShareMaximum = expandMaximum(shareMaximum, shareValues)
  const moverWinrateMinimum = expandMinimum(winrateMinimum, winrateValues)
  const moverWinrateMaximum = expandMaximum(winrateMaximum, winrateValues)
  const sideboardingValues = sideboardingRows.flatMap(row => [
    row.gameOne.winrate,
    row.postboard?.winrate,
  ]).filter((value): value is number => value !== undefined)
  const sideboardingMinimum = expandMinimum(25, sideboardingValues)
  const sideboardingMaximum = expandMaximum(75, sideboardingValues)
  const gameOneMean = weightedMean(sideboardingRows, row => row.gameOne)
  const postboardMean = weightedMean(sideboardingRows, row => row.postboard)
  const {
    activeMatchup,
    activateMatchup,
    deactivateMatchup,
    resetMatchup,
  } = useMatchupHover()
  const activeMatchupResetKey = `${isSideboarding ? 'sideboarding' : 'movers'}:${columns.join('\u0000')}:${(isSideboarding ? sideboardingRows : movers).map(row => row.archetype).join(',')}`

  useEffect(() => {
    resetMatchup()
  }, [activeMatchupResetKey, resetMatchup])

  const activeArchetypes = activeMatchup
    ? new Set([activeMatchup.row, activeMatchup.opponent])
    : null
  const isDimmed = (archetype: string) => Boolean(activeArchetypes && !activeArchetypes.has(archetype))
  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <section className={`metagame-mover-chart-section${activeMatchup ? ' has-active-matchup' : ''}`} aria-label={isSideboarding ? 'Sideboarding performance' : 'Top 10 metagame shifts'}>
        <div ref={chartScrollRef} className="metagame-chart-scroll" onScroll={scheduleMatrixScroll}>
          <MetagameMobileLabelRail
            heading={isSideboarding ? (
              <span className="metagame-sideboarding-rank-label">
                <span><MetagameAxisArrow direction="up" />Top 5</span>
                <span aria-hidden="true">/</span>
                <span><MetagameAxisArrow direction="down" />Bottom 5</span>
              </span>
            ) : <><MetagameAxisArrow direction="up" /> Top 10 Shifts</>}
            labels={(isSideboarding ? sideboardingRows : movers).map(row => ({
              key: row.archetype,
              content: row.archetype,
              dimmed: isDimmed(row.archetype),
            }))}
          />
          <div
            className="metagame-chart metagame-mover-chart"
            style={{ '--metagame-columns': columns.length } as CSSProperties}
          >
            <section className={`metagame-share-panel${isSideboarding ? ' metagame-sideboarding-chart-panel' : ''}`} aria-label={isSideboarding ? 'Game 1 performance' : 'Metagame share change'}>
              <header className="metagame-panel-header">
                <span>{isSideboarding ? (
                  <span className="metagame-sideboarding-rank-label">
                    <span><MetagameAxisArrow direction="up" />Top 5</span>
                    <span aria-hidden="true">/</span>
                    <span><MetagameAxisArrow direction="down" />Bottom 5</span>
                  </span>
                ) : <><MetagameAxisArrow direction="up" /> Top 10 Shifts</>}</span>
                <span>{isSideboarding ? 'Game 1' : 'Metagame (%)'} <MetagameAxisArrow direction="right" /></span>
              </header>
              {isSideboarding ? sideboardingRows.map(row => (
                <div key={row.archetype} className={`metagame-chart-row metagame-share-row metagame-mover-row-label${isDimmed(row.archetype) ? ' is-matchup-dimmed' : ''}`}>
                  <span className="metagame-archetype-name">{row.archetype}</span>
                  <SideboardingPerformanceBar
                    label={`${row.archetype} · Game 1`}
                    tooltipHeading={row.archetype}
                    metric={row.gameOne}
                    minimum={sideboardingMinimum}
                    maximum={sideboardingMaximum}
                    mean={gameOneMean}
                  />
                </div>
              )) : movers.map(mover => (
                <div key={mover.archetype} className={`metagame-chart-row metagame-share-row metagame-mover-row-label${isDimmed(mover.archetype) ? ' is-matchup-dimmed' : ''}`}>
                  <span className="metagame-archetype-name">{mover.archetype}</span>
                  <DifferenceBar
                    value={mover.change}
                    previousValue={mover.previous ? parsePercentage(mover.previous.percentage) : undefined}
                    currentValue={mover.current ? parsePercentage(mover.current.percentage) : undefined}
                    minimum={0}
                    maximum={moverShareMaximum}
                    label={mover.archetype}
                    current={mover.current ? `${parsePercentage(mover.current.percentage).toFixed(1)}%` : 'Unavailable'}
                    previous={mover.previous ? `${parsePercentage(mover.previous.percentage).toFixed(1)}%` : 'Unavailable'}
                  />
                </div>
              ))}
              <footer className="metagame-axis metagame-difference-axis">
                {isSideboarding ? (
                  <><span>{sideboardingMinimum}</span><span>50</span><span>{sideboardingMaximum}</span></>
                ) : (
                  <><span>0</span><span>{moverShareMaximum / 2}</span><span>{moverShareMaximum}</span></>
                )}
              </footer>
            </section>

            <section className={`metagame-winrate-panel${isSideboarding ? ' metagame-sideboarding-chart-panel' : ''}`} aria-label={isSideboarding ? 'Games 2–3 performance' : 'Winrate change'}>
              <header className="metagame-panel-header is-right">
                <span>{isSideboarding ? 'Games 2–3' : 'Winrate (%)'} <MetagameAxisArrow direction="right" /></span>
              </header>
              {isSideboarding ? sideboardingRows.map(row => (
                <div key={row.archetype} className={`metagame-chart-row metagame-winrate-row${isDimmed(row.archetype) ? ' is-matchup-dimmed' : ''}`}>
                  <SideboardingPerformanceBar
                    label={`${row.archetype} · Games 2–3`}
                    tooltipHeading={row.archetype}
                    metric={row.postboard}
                    minimum={sideboardingMinimum}
                    maximum={sideboardingMaximum}
                    mean={postboardMean}
                  />
                </div>
              )) : movers.map(mover => {
                const current = parsePercentage(mover.current?.game_winrate)
                const previous = parsePercentage(mover.previous?.game_winrate)
                const change = mover.current && mover.previous ? current - previous : undefined
                return (
                  <div key={mover.archetype} className={`metagame-chart-row metagame-winrate-row${isDimmed(mover.archetype) ? ' is-matchup-dimmed' : ''}`}>
                    <DifferenceBar
                      value={change}
                      previousValue={mover.previous ? previous : undefined}
                      currentValue={mover.current ? current : undefined}
                      minimum={moverWinrateMinimum}
                      maximum={moverWinrateMaximum}
                      label={mover.archetype}
                      current={mover.current
                        ? `${current.toFixed(1)}% ±${parsePercentage(mover.current.game_ci).toFixed(1)}% (${mover.current.game_count} games)`
                        : 'Unavailable'}
                      previous={mover.previous
                        ? `${previous.toFixed(1)}% ±${parsePercentage(mover.previous.game_ci).toFixed(1)}% (${mover.previous.game_count} games)`
                        : 'Unavailable'}
                      plot={mover.current ? (
                        <WinrateTooltipPlot
                          winrate={current}
                          confidenceInterval={parsePercentage(mover.current.game_ci)}
                          games={mover.current.game_count}
                          previous={mover.previous ? {
                            winrate: previous,
                            confidenceInterval: parsePercentage(mover.previous.game_ci),
                            games: mover.previous.game_count,
                          } : undefined}
                        />
                      ) : mover.previous ? (
                        <WinrateTooltipPlot
                          winrate={previous}
                          confidenceInterval={parsePercentage(mover.previous.game_ci)}
                          games={mover.previous.game_count}
                          muted
                        />
                      ) : undefined}
                    />
                  </div>
                )
              })}
              <footer className="metagame-axis metagame-difference-axis">
                {isSideboarding ? (
                  <><span>{sideboardingMinimum}</span><span>50</span><span>{sideboardingMaximum}</span></>
                ) : (
                  <><span>{moverWinrateMinimum.toFixed(0)}</span><span>50</span><span>{moverWinrateMaximum.toFixed(0)}</span></>
                )}
              </footer>
            </section>

            <section className="metagame-matrix-panel" aria-label={isSideboarding ? 'Sideboarding performance by matchup' : 'Matchup winrate change matrix'}>
              <div ref={matrixHeaderScrollRef} className="metagame-matrix-header-scroll">
          <header ref={matrixHeaderRef} className="metagame-matrix-header">
                  {columns.map((column, index) => (
                    <span
                      key={column}
                      ref={element => { matrixHeaderCellRefs.current[index] = element }}
                    >
                      <span ref={element => { matrixHeaderLabelRefs.current[index] = element }}>{column}</span>
                    </span>
                  ))}
                </header>
              </div>
              <div ref={matrixViewportRef} className="metagame-matrix-viewport">
                <div
                  ref={matrixScrollRef}
                  className="metagame-matrix-scroll"
                  onScroll={scheduleMatrixScroll}
                >
                  <div className="metagame-matrix-content">
                    <div className="metagame-matrix-grid">
                      {isSideboarding ? sideboardingRows.flatMap(row => columns.map(opponent => (
                        <SideboardingMatchupCell
                          key={`${row.archetype}-${opponent}`}
                          change={sideboardingMatchupsByKey.get(keyFor(row.archetype, opponent)) ?? {
                            archetype: row.archetype,
                            opponent,
                            gameOne: row.gameOne,
                            postboard: null,
                          }}
                          isDimmed={isDimmed(row.archetype)}
                          isActive={activeMatchup?.row === row.archetype && activeMatchup.opponent === opponent}
                          onActivate={activateMatchup}
                          onDeactivate={deactivateMatchup}
                        />
                      ))) : movers.flatMap(mover => columns.map(opponent => {
                        const change = changesByKey.get(keyFor(mover.archetype, opponent)) ?? {
                          archetype: mover.archetype,
                          opponent,
                          currentWinrate: undefined,
                          currentConfidenceInterval: undefined,
                          previousWinrate: undefined,
                          previousConfidenceInterval: undefined,
                          currentGames: undefined,
                          previousGames: undefined,
                          change: undefined,
                        }
                        return (
                          <MatchupDifferenceCell
                            key={`${mover.archetype}-${opponent}`}
                            change={change}
                            isDimmed={isDimmed(mover.archetype)}
                            isActive={activeMatchup?.row === mover.archetype && activeMatchup.opponent === opponent}
                            onActivate={activateMatchup}
                            onDeactivate={deactivateMatchup}
                          />
                        )
                      }))}
                    </div>
                  </div>
                </div>
              </div>
              <footer className="metagame-matrix-note">
                <span>{isSideboarding ? 'Sideboarding Δ:' : 'Matchup Δ:'}</span>
                <span>{isSideboarding ? <>Games 2–3 minus Game 1; <span className="metagame-matrix-note-tail">? indicates unavailable postboard data.</span></> : <>positive values improved, negative values worsened; <span className="metagame-matrix-note-tail">? indicates insufficient games or no data.</span></>}</span>
              </footer>
            </section>
          </div>
        </div>
      </section>
    </TooltipProvider>
  )
}
