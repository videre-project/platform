/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { cloneElement, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@videreproject/ui'
import type { CSSProperties, ReactElement, ReactNode, Ref } from 'react'

import type {
  MetagameArchetype,
  MetagameData,
  MetagameMatchup,
} from '@/hooks/useMetagame'
import { WinrateTooltipPlot } from '@/components/metagame/MetagameTooltip'
import { MetagameAxisArrow } from '@/components/metagame/MetagameAxisArrow'
import { MetagameChartSkeleton } from '@/components/metagame/MetagameChartSkeleton'
import { MetagameMobileLabelRail } from '@/components/metagame/MetagameMobileLabelRail'
import { useMatchupHover } from '@/components/metagame/useMatchupHover'
import {
  getHeatColorRgb,
  getTextToneClass,
  MUTED_TRACK_RGB,
  SHARE_FILL_RGB,
  WinrateBarVisual,
} from '@/components/metagame/MetagameWinrateBar'

interface MetagameChartProps {
  data: MetagameData | null
  format: string
  from: Date
  to: Date
  loading?: boolean
  chartRef?: Ref<HTMLElement>
  controls?: ReactNode
  staticRender?: boolean
}

const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', {
  month: 'numeric',
  day: 'numeric',
  year: '2-digit',
}).format(date)

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

// Archetype ids are not globally unique: the API can return the same id for
// distinct inferred archetypes. Include the display name so React does not
// reuse one row for another during chart updates.
const archetypeKey = (archetype: MetagameArchetype) =>
  `${archetype.id}:${archetype.archetype}`

function confidenceDots(confidenceInterval: number): string {
  if (confidenceInterval <= 5) return '•••'
  if (confidenceInterval <= 10) return '••'
  if (confidenceInterval <= 15) return '•'
  return ''
}

interface ChartTooltipRow {
  label: string
  value: ReactNode
}

function ChartTooltip({
  children,
  heading,
  rows,
  plot,
  ariaLabel,
  open,
}: {
  children: ReactElement<{ 'aria-label'?: string; tabIndex?: number }>
  heading: ReactNode
  rows?: ChartTooltipRow[]
  plot?: ReactNode
  ariaLabel?: string
  open?: boolean
}) {
  return (
    <Tooltip disableHoverableContent open={open}>
      <TooltipTrigger asChild>
        {cloneElement(children, {
          'aria-label': ariaLabel ?? (typeof heading === 'string' ? heading : undefined),
          tabIndex: 0,
        })}
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="metagame-tooltip-content">
        <strong className="metagame-tooltip-heading">{heading}</strong>
        {plot}
        {rows && (
          <dl>
            {rows.map(row => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function ShareRow({ archetype, maximum, isDimmed }: {
  archetype: MetagameArchetype
  maximum: number
  isDimmed: boolean
}) {
  const width = clamp((archetype.percentage / maximum) * 100, 0, 100)
  const inline = width >= 36
  const labelBackground = inline ? SHARE_FILL_RGB : MUTED_TRACK_RGB

  return (
    <div className={`metagame-chart-row metagame-share-row${isDimmed ? ' is-matchup-dimmed' : ''}`}>
      <span className="metagame-archetype-name">
        {archetype.archetype}
      </span>
      <ChartTooltip
        heading={archetype.archetype}
        rows={[
          { label: 'Percentage', value: `${archetype.percentage.toFixed(1)}%` },
          { label: 'Count', value: archetype.count },
        ]}
      >
        <div className="metagame-share-track">
          <span className="metagame-share-fill" style={{ width: `${width}%` }} />
          <strong
            className={`metagame-share-label${inline ? ' is-inline' : ''} ${getTextToneClass(labelBackground)}`}
            style={{ left: `${width}%` }}
          >
            {archetype.percentage.toFixed(1)}%
          </strong>
        </div>
      </ChartTooltip>
    </div>
  )
}

function WinrateRow({ archetype, minimum, maximum, heatMinimum, heatMaximum, isDimmed }: {
  archetype: MetagameArchetype
  minimum: number
  maximum: number
  heatMinimum: number
  heatMaximum: number
  isDimmed: boolean
}) {
  return (
    <div className={`metagame-chart-row metagame-winrate-row${isDimmed ? ' is-matchup-dimmed' : ''}`}>
      <ChartTooltip
        heading={archetype.archetype}
        plot={(
          <WinrateTooltipPlot
            winrate={archetype.winrate}
            confidenceInterval={archetype.confidenceInterval}
            games={archetype.games}
          />
        )}
      >
        <WinrateBarVisual
          winrate={archetype.winrate}
          confidenceInterval={archetype.confidenceInterval}
          minimum={minimum}
          maximum={maximum}
          heatMinimum={heatMinimum}
          heatMaximum={heatMaximum}
        />
      </ChartTooltip>
    </div>
  )
}

function MatchupCell({ row, opponent, matchup, heatMinimum, heatMaximum, isDimmed, isActive, onActivate, onDeactivate }: {
  row: string
  opponent: string
  matchup: MetagameMatchup | undefined
  heatMinimum: number
  heatMaximum: number
  isDimmed: boolean
  isActive: boolean
  onActivate: (row: string, opponent: string) => void
  onDeactivate: () => void
}) {
  const cellClassName = (className = '') => (
    `metagame-matchup-cell${className ? ` ${className}` : ''}${isDimmed ? ' is-matchup-dimmed' : ''}`
  )
  const cellInteraction = {
    onMouseEnter: () => onActivate(row, opponent),
    onMouseLeave: onDeactivate,
    onFocus: () => onActivate(row, opponent),
    onBlur: onDeactivate,
  }

  if (row === opponent) {
    return <div
      className="metagame-matchup-cell is-mirror"
      aria-label={`${row} vs ${opponent}`}
    >–</div>
  }

  if (!matchup) {
    return (
      <ChartTooltip
        heading={(
          <span className="metagame-tooltip-matchup-heading">
            <span>{row}</span>
            <span>vs</span>
            <span>{opponent}</span>
          </span>
        )}
        ariaLabel={`${row} vs ${opponent}`}
        open={isActive}
        rows={[{ label: 'Result', value: 'No data' }]}
      >
        <div className={cellClassName('is-unknown')} {...cellInteraction}>?</div>
      </ChartTooltip>
    )
  }

  const hasInsufficientGames = matchup.games < 10
  const matchupRgb = getHeatColorRgb(matchup.winrate, heatMinimum, heatMaximum)
  const matchupColor = `rgb(${matchupRgb.join(' ')})`
  return (
    <ChartTooltip
      heading={(
        <span className="metagame-tooltip-matchup-heading">
          <span>{row}</span>
          <span>vs</span>
          <span>{opponent}</span>
        </span>
      )}
      ariaLabel={`${row} vs ${opponent}`}
      open={isActive}
      plot={(
        <WinrateTooltipPlot
          winrate={matchup.winrate}
          confidenceInterval={matchup.confidenceInterval}
          games={matchup.games}
        />
      )}
      >
      <div
        className={`${cellClassName(hasInsufficientGames ? 'is-unknown' : '')}${hasInsufficientGames ? '' : ` ${getTextToneClass(matchupRgb)}`}`}
        style={hasInsufficientGames ? undefined : { background: matchupColor }}
        {...cellInteraction}
      >
        <strong>{hasInsufficientGames ? '?' : matchup.winrate.toFixed(0)}</strong>
        {!hasInsufficientGames && <span>{confidenceDots(matchup.confidenceInterval)}</span>}
      </div>
    </ChartTooltip>
  )
}

export function MetagameChart({
  data,
  format,
  from,
  to,
  loading = false,
  chartRef,
  controls,
  staticRender = false,
}: MetagameChartProps) {
  const chartScrollRef = useRef<HTMLDivElement>(null)
  const matrixScrollRef = useRef<HTMLDivElement>(null)
  const matrixHeaderRef = useRef<HTMLElement>(null)
  const matrixHeaderScrollRef = useRef<HTMLDivElement>(null)
  const matrixViewportRef = useRef<HTMLDivElement>(null)
  const matrixHeaderCellRefs = useRef<Array<HTMLSpanElement | null>>([])
  const matrixHeaderLabelRefs = useRef<Array<HTMLSpanElement | null>>([])
  const matrixEdgeFrameRef = useRef<number | null>(null)

  const syncMatrixScrollVisuals = useCallback(() => {
    const chartScroll = chartScrollRef.current
    const matrixScroll = matrixScrollRef.current
    const header = matrixHeaderRef.current
    const headerScroll = matrixHeaderScrollRef.current
    const viewportElement = matrixViewportRef.current
    if (!chartScroll || !matrixScroll || !header || !headerScroll || !viewportElement) return

    const useOuterScroll = window.matchMedia('(max-width: 820px)').matches
    const element = useOuterScroll ? chartScroll : matrixScroll
    const left = element.scrollLeft
    const maximum = Math.max(0, element.scrollWidth - element.clientWidth)
    header.style.setProperty('transform', useOuterScroll ? 'none' : `translateX(-${left}px)`)

    const hasLeftOverflow = left > 1
    const hasRightOverflow = left < maximum - 1
    for (const target of [chartScroll, headerScroll, viewportElement]) {
      target.classList.toggle('has-left-overflow', hasLeftOverflow)
      target.classList.toggle('has-right-overflow', hasRightOverflow)
    }

    const viewport = element.getBoundingClientRect()
    const stickyRail = useOuterScroll
      ? chartScroll.querySelector<HTMLElement>('.metagame-mobile-label-rail')
      : null
    const viewportLeft = Math.max(viewport.left, stickyRail?.getBoundingClientRect().right ?? viewport.left)
    const headerOverhang = 32
    matrixHeaderCellRefs.current.forEach((cell, index) => {
      const label = matrixHeaderLabelRefs.current[index]
      if (!cell || !label) return

      const cellBounds = cell.getBoundingClientRect()
      const labelBounds = label.getBoundingClientRect()
      let edge: 'left' | 'right' | 'hidden-right' | null = null
      if (cellBounds.left >= viewport.right) {
        edge = 'hidden-right'
      } else {
        const labelIsVisible = labelBounds.right > viewportLeft && labelBounds.left < viewport.right + headerOverhang
        if (labelIsVisible) {
          if (cellBounds.left < viewportLeft) edge = 'left'
          else if (cellBounds.right > viewport.right) edge = 'right'
        }
      }

      for (const target of [cell, label]) {
        target.classList.remove('is-edge-hidden-right', 'is-edge-faded-left', 'is-edge-faded-right')
        if (edge === 'hidden-right') target.classList.add('is-edge-hidden-right')
        else if (edge) target.classList.add(`is-edge-faded-${edge}`)
      }
    })
  }, [])

  const scheduleMatrixScrollVisuals = useCallback(() => {
    if (matrixEdgeFrameRef.current !== null) return
    matrixEdgeFrameRef.current = requestAnimationFrame(() => {
      matrixEdgeFrameRef.current = null
      syncMatrixScrollVisuals()
    })
  }, [syncMatrixScrollVisuals])

  useLayoutEffect(() => {
    const chartScroll = chartScrollRef.current
    const matrixScroll = matrixScrollRef.current
    if (!chartScroll || !matrixScroll) return

    syncMatrixScrollVisuals()
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleMatrixScrollVisuals)
    resizeObserver?.observe(chartScroll)
    resizeObserver?.observe(matrixScroll)
    if (matrixScroll.firstElementChild) resizeObserver?.observe(matrixScroll.firstElementChild)
    window.addEventListener('resize', scheduleMatrixScrollVisuals)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleMatrixScrollVisuals)
      if (matrixEdgeFrameRef.current !== null) {
        cancelAnimationFrame(matrixEdgeFrameRef.current)
        matrixEdgeFrameRef.current = null
      }
    }
  }, [data, scheduleMatrixScrollVisuals, syncMatrixScrollVisuals])

  const {
    activeMatchup,
    activateMatchup,
    deactivateMatchup,
    resetMatchup,
  } = useMatchupHover()

  useEffect(() => {
    resetMatchup()
  }, [data, resetMatchup])

  if (loading || !data) return <MetagameChartSkeleton variant="main" controls={controls} />

  const shareMaximum = Math.max(5, Math.ceil(
    Math.max(...data.archetypes.map(archetype => archetype.percentage), 0) / 5,
  ) * 5)
  const spread = Math.max(
    10,
    ...data.archetypes.map(archetype => Math.abs(archetype.winrate - 50) + archetype.confidenceInterval),
  ) * 1.2
  const winrateMinimum = Math.max(0, 50 - spread)
  const winrateMaximum = Math.min(100, 50 + spread)
  const matchupLookup = new Map(
    data.matchups.map(matchup => [`${matchup.archetype}\u0000${matchup.opponent}`, matchup]),
  )
  const measuredMatchups = data.matchups.filter(matchup => matchup.games >= 10)
  const heatSpread = Math.max(
    10,
    ...measuredMatchups.map(matchup => Math.abs(matchup.winrate - 50)),
  )
  const heatMinimum = 50 - heatSpread
  const heatMaximum = 50 + heatSpread
  const activeArchetypes = activeMatchup
    ? new Set([activeMatchup.row, activeMatchup.opponent])
    : null
  const isDimmed = (archetype: string) => Boolean(activeArchetypes && !activeArchetypes.has(archetype))

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <section
        ref={chartRef}
        className={`metagame-chart-section${activeMatchup ? ' has-active-matchup' : ''}${staticRender ? ' is-static-render' : ''}`}
        style={{ '--metagame-columns': data.archetypes.length } as CSSProperties}
      >
      <div className="metagame-chart-titlebar">
        <h2>{format} Metagame Breakdown</h2>
        <p>
          All MTGO events between {formatDate(from)} and {formatDate(to)}
          <span aria-hidden="true"> · </span>
          Data from <a href="https://api.videreproject.com">api.videreproject.com</a>
        </p>
      </div>

      {controls && <div className="metagame-chart-controls">{controls}</div>}

      <div ref={chartScrollRef} className="metagame-chart-scroll" onScroll={scheduleMatrixScrollVisuals}>
        <MetagameMobileLabelRail
          heading={<><MetagameAxisArrow direction="up" /> Top {data.archetypes.length} Archetypes</>}
          labels={data.archetypes.map(archetype => ({
            key: archetypeKey(archetype),
            content: archetype.archetype,
            dimmed: isDimmed(archetype.archetype),
          }))}
        />
        <div className="metagame-chart">
          <section className="metagame-share-panel" aria-label="Metagame share">
            <header className="metagame-panel-header">
              <span><MetagameAxisArrow direction="up" /> Top {data.archetypes.length} Archetypes</span>
              <span>Metagame (%) <MetagameAxisArrow direction="right" /></span>
            </header>
            {data.archetypes.map(archetype => (
              <ShareRow
                key={archetypeKey(archetype)}
                archetype={archetype}
                maximum={shareMaximum}
                isDimmed={isDimmed(archetype.archetype)}
              />
            ))}
            <footer className="metagame-axis">
              <span>0</span><span>{shareMaximum / 2}</span><span>{shareMaximum}</span>
            </footer>
          </section>

          <section className="metagame-winrate-panel" aria-label="Overall win rate">
            <span
              className="metagame-winrate-baseline"
              aria-hidden="true"
              style={{
                '--winrate-baseline': `${((50 - winrateMinimum) / (winrateMaximum - winrateMinimum)) * 100}%`,
                '--winrate-baseline-offset': `${0.4 - (0.8 * ((50 - winrateMinimum) / (winrateMaximum - winrateMinimum)))}rem`,
              } as CSSProperties}
            />
            <header className="metagame-panel-header is-right">
              <span>Winrate (%) <MetagameAxisArrow direction="right" /></span>
            </header>
            {data.archetypes.map(archetype => (
              <WinrateRow
                key={archetypeKey(archetype)}
                archetype={archetype}
                minimum={winrateMinimum}
                maximum={winrateMaximum}
                heatMinimum={heatMinimum}
                heatMaximum={heatMaximum}
                isDimmed={isDimmed(archetype.archetype)}
              />
            ))}
            <footer className="metagame-axis">
              <span>{winrateMinimum.toFixed(0)}</span>
              <span>50</span>
              <span>{winrateMaximum.toFixed(0)}</span>
            </footer>
          </section>

          <section className="metagame-matrix-panel" aria-label="Archetype matchup matrix">
            <div ref={matrixHeaderScrollRef} className="metagame-matrix-header-scroll">
              <header
                ref={matrixHeaderRef}
                className="metagame-matrix-header"
              >
                {data.archetypes.map((archetype, index) => (
                  <span
                    key={archetypeKey(archetype)}
                    ref={element => { matrixHeaderCellRefs.current[index] = element }}
                  >
                    <span
                      ref={element => { matrixHeaderLabelRefs.current[index] = element }}
                    >
                      {archetype.archetype}
                    </span>
                  </span>
                ))}
              </header>
            </div>
            <div ref={matrixViewportRef} className="metagame-matrix-viewport">
              <div
                ref={matrixScrollRef}
                className="metagame-matrix-scroll"
                onScroll={scheduleMatrixScrollVisuals}
              >
                <div className="metagame-matrix-content">
                  <div className="metagame-matrix-grid">
                    {data.archetypes.flatMap(archetype => data.archetypes.map(opponent => (
                      <MatchupCell
                        key={`${archetypeKey(archetype)}-${archetypeKey(opponent)}`}
                        row={archetype.archetype}
                        opponent={opponent.archetype}
                        matchup={matchupLookup.get(`${archetype.archetype}\u0000${opponent.archetype}`)}
                        heatMinimum={heatMinimum}
                        heatMaximum={heatMaximum}
                        isDimmed={isDimmed(archetype.archetype)}
                        isActive={activeMatchup?.row === archetype.archetype && activeMatchup.opponent === opponent.archetype}
                        onActivate={activateMatchup}
                        onDeactivate={deactivateMatchup}
                      />
                    )))}
                  </div>
                </div>
              </div>
            </div>
            <footer className="metagame-matrix-note">
              <span>Dots indicate 95% CI:</span>
              <span>
                ±5% (3 dots), ±10% (2 dots),{' '}
                <span className="metagame-matrix-note-tail">±15% (1 dot), and ≥±20%.</span>
              </span>
            </footer>
          </section>
        </div>
      </div>
      </section>
    </TooltipProvider>
  )
}
