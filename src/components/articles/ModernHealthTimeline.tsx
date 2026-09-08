/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useState, useId, useMemo, useRef, useCallback, useLayoutEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { MetagameAxisArrow } from '@/components/metagame/MetagameAxisArrow'
import '@/pages/MetagamePage.css'
import './ModernHealthTimeline.css'

import {
  BNR_MILESTONES,
  getTimelineDeckPolarity,
  MODERN_DAILY_SERIES,
  SET_MILESTONES,
  YEAR_MARKERS,
} from '@/data/articles/polarity/modern-health-timeline'
import type {
  BnRMilestone,
  SetMilestone,
  TimelineDataPoint,
} from '@/data/articles/polarity/types'

const START_MS = new Date('2023-05-25').getTime()
const END_MS = new Date('2026-08-27').getTime()
const TOTAL_SPAN_MS = END_MS - START_MS

// Reactive measurement hook: measures the DOM elements directly to detect whether the label fits inside the bar
function useBarFit(widthPercent: number, minPercentThreshold = 44) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLElement | null>(null)
  const [fitsInside, setFitsInside] = useState<boolean>(false)

  useLayoutEffect(() => {
    const checkFit = () => {
      // Require a minimum percentage threshold to prevent character-count edge-case flipping
      if (widthPercent < minPercentThreshold) {
        setFitsInside(false)
        return
      }
      const track = trackRef.current
      const label = labelRef.current
      if (!track || !label) return
      const trackWidth = track.clientWidth
      if (trackWidth === 0) return
      const labelWidth = label.offsetWidth
      const barWidthPx = (widthPercent / 100) * trackWidth
      // Bar must fit the text width plus at least 14px (7px buffer on each side)
      setFitsInside(barWidthPx >= labelWidth + 14)
    }

    checkFit()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(checkFit)
    if (trackRef.current) observer.observe(trackRef.current)
    if (labelRef.current) observer.observe(labelRef.current)
    return () => observer.disconnect()
  }, [widthPercent, minPercentThreshold])

  return { trackRef, labelRef, fitsInside }
}

// Generates accessible background colors and text contrast flags for win rates
function getWinrateColor(winrate: number): { background: string; isLight: boolean } {
  if (winrate >= 56) return { background: '#15803d', isLight: true } // Rich green -> white text
  if (winrate >= 52) return { background: '#16a34a', isLight: true } // Green -> white text
  if (winrate >= 50.5) return { background: '#65a30d', isLight: true } // Lime -> white text
  if (winrate >= 49.5) return { background: '#ca8a04', isLight: false } // Gold -> dark text
  if (winrate >= 48) return { background: '#d97706', isLight: true } // Amber -> white text
  if (winrate >= 45) return { background: '#ea580c', isLight: true } // Orange -> white text
  return { background: '#dc2626', isLight: true } // Red -> white text
}

// Generates accessible background colors and text contrast flags for matchup polarity
function getPolarityColor(polarity: number): { background: string; isLight: boolean } {
  if (polarity >= 26) return { background: '#b91c1c', isLight: true } // Dark red -> white text
  if (polarity >= 22) return { background: '#c2410c', isLight: true } // Deep orange -> white text
  if (polarity >= 18) return { background: '#d97706', isLight: true } // Amber -> white text
  if (polarity >= 13) return { background: '#ca8a04', isLight: false } // Olive gold -> dark text
  if (polarity >= 10.5) return { background: '#65a30d', isLight: true } // Lime -> white text
  return { background: '#15803d', isLight: true } // Healthy green -> white text
}

function ShareRow({
  name,
  percentage,
  maximum,
  isBanned = false,
}: {
  name: string
  percentage: number
  maximum: number
  isBanned?: boolean
}) {
  const width = Math.min(100, Math.max(0, (percentage / maximum) * 100))
  const { trackRef, labelRef, fitsInside } = useBarFit(width)

  return (
    <div className={`metagame-chart-row metagame-share-row ${isBanned ? 'is-banned-row' : ''}`}>
      <span className={`metagame-archetype-name ${isBanned ? 'is-banned' : ''}`} title={name}>
        {name}
      </span>
      <div ref={trackRef} className="metagame-share-track">
        <span
          className={`metagame-share-fill ${isBanned ? 'timeline-bar-fill-banned' : ''}`}
          style={{ width: `${width}%` }}
        />
        <strong
          ref={labelRef}
          className={`timeline-bar-label ${
            fitsInside
              ? isBanned
                ? 'is-inside is-white-inside'
                : 'is-inside is-dark-inside'
              : 'is-outside'
          }`}
          style={{ left: `${width}%` }}
        >
          {percentage.toFixed(1)}%
        </strong>
      </div>
    </div>
  )
}

function WinrateRow({
  winrate,
  minimum,
  maximum,
  isBanned = false,
}: {
  winrate?: number
  minimum: number
  maximum: number
  isBanned?: boolean
}) {
  const width = winrate === undefined
    ? 0
    : Math.min(100, Math.max(0, ((winrate - minimum) / (maximum - minimum)) * 100))
  const { trackRef, labelRef, fitsInside } = useBarFit(width)

  if (winrate === undefined) {
    return (
      <div className={`metagame-chart-row metagame-winrate-row ${isBanned ? 'is-banned-row' : ''}`}>
        <div className="metagame-winrate-track">
          <strong className="timeline-bar-label is-outside" style={{ left: 0 }}>—</strong>
        </div>
      </div>
    )
  }

  const { background, isLight } = getWinrateColor(winrate)

  return (
    <div className={`metagame-chart-row metagame-winrate-row ${isBanned ? 'is-banned-row' : ''}`}>
      <div ref={trackRef} className="metagame-winrate-track">
        <span
          className={`metagame-winrate-fill ${isBanned ? 'timeline-bar-fill-banned' : ''}`}
          style={{ width: `${width}%`, background: isBanned ? undefined : background }}
        />
        <strong
          ref={labelRef}
          className={`timeline-bar-label ${
            fitsInside
              ? isBanned || isLight
                ? 'is-inside is-white-inside'
                : 'is-inside is-dark-inside'
              : 'is-outside'
          }`}
          style={{ left: `${width}%` }}
        >
          {winrate.toFixed(1)}%
        </strong>
      </div>
    </div>
  )
}

function HomogeneityRow({
  homogeneity,
  maximum,
  isBanned = false,
}: {
  homogeneity: number
  maximum: number
  isBanned?: boolean
}) {
  const threshold = 50
  const totalWidth = maximum > 0 ? Math.min(100, Math.max(0, (homogeneity / maximum) * 100)) : 0
  const thresholdWidth = maximum > 0 ? Math.min(100, Math.max(0, (threshold / maximum) * 100)) : 100
  const baseWidth = Math.min(totalWidth, thresholdWidth)
  const overflowWidth = Math.max(0, totalWidth - thresholdWidth)
  const { trackRef, labelRef, fitsInside } = useBarFit(totalWidth)

  return (
    <div className={`metagame-chart-row metagame-share-row polarity-concentration-row ${isBanned ? 'is-banned-row' : ''}`}>
      <div
        ref={trackRef}
        className="metagame-share-track polarity-concentration-track"
        style={{ '--concentration-threshold': `${thresholdWidth}%` } as React.CSSProperties}
      >
        {baseWidth > 0 && (
          <span
            className={`polarity-concentration-fill ${isBanned ? 'timeline-bar-fill-banned' : ''}`}
            style={{ width: `${baseWidth}%` }}
          />
        )}
        {overflowWidth > 0 && (
          <span
            className={`polarity-concentration-overflow ${isBanned ? 'timeline-bar-fill-banned' : ''}`}
            style={{
              left: `${baseWidth}%`,
              width: `${overflowWidth}%`,
            }}
          />
        )}
        <strong
          ref={labelRef}
          className={`timeline-bar-label ${fitsInside ? 'is-inside is-white-inside' : 'is-outside'}`}
          style={{ left: `${totalWidth}%` }}
        >
          {homogeneity.toFixed(1)}%
        </strong>
      </div>
    </div>
  )
}

function PolarityRow({
  polarity,
  minimum = 0,
  maximum = 35,
  isBanned = false,
}: {
  polarity: number
  minimum?: number
  maximum?: number
  isBanned?: boolean
}) {
  const width = Math.min(100, Math.max(0, ((polarity - minimum) / (maximum - minimum)) * 100))
  const { trackRef, labelRef, fitsInside } = useBarFit(width)
  const { background, isLight } = getPolarityColor(polarity)

  return (
    <div className={`metagame-chart-row metagame-winrate-row polarity-value-row ${isBanned ? 'is-banned-row' : ''}`}>
      <div ref={trackRef} className="metagame-winrate-track">
        <span
          className={`metagame-winrate-fill ${isBanned ? 'timeline-bar-fill-banned' : ''}`}
          style={{ width: `${width}%`, background: isBanned ? undefined : background }}
        />
        <strong
          ref={labelRef}
          className={`timeline-bar-label ${
            fitsInside
              ? isBanned || isLight
                ? 'is-inside is-white-inside'
                : 'is-inside is-dark-inside'
              : 'is-outside'
          }`}
          style={{ left: `${width}%` }}
        >
          {polarity.toFixed(1)}%
        </strong>
      </div>
    </div>
  )
}

export interface MetagameBreakdownDeck {
  name: string
  share: number
  winRate?: number
  homogeneity: number
  polarity: number
}

export interface MetagameBreakdownProps {
  decks: MetagameBreakdownDeck[]
  bannedArchetypes?: string[]
}

export function MetagameBreakdown({
  decks,
  bannedArchetypes = [],
}: MetagameBreakdownProps) {
  const isBanned = (name: string) => bannedArchetypes.includes(name)

  return (
    <div className="modern-timeline-breakdown">
      <div
        className="metagame-chart modern-timeline-metagame-chart"
        style={{
          '--metagame-row-height': '28px',
          '--metagame-header-height': '24px',
        } as React.CSSProperties}
      >
        <section className="metagame-share-panel" aria-label="Metagame share">
          <header className="metagame-panel-header">
            <span>
              <MetagameAxisArrow direction="up" /> Top {decks.length} Archetypes
            </span>
            <span>
              Metagame (%) <MetagameAxisArrow direction="right" />
            </span>
          </header>
          {decks.map((deck) => (
            <ShareRow
              key={deck.name}
              name={deck.name}
              percentage={deck.share}
              maximum={30}
              isBanned={isBanned(deck.name)}
            />
          ))}
          <footer className="metagame-axis">
            <span>0</span>
            <span>15</span>
            <span>30</span>
          </footer>
        </section>

        <section className="metagame-winrate-panel" aria-label="Overall win rate">
          <header className="metagame-panel-header is-right">
            <span>
              Winrate (%) <MetagameAxisArrow direction="right" />
            </span>
          </header>
          {decks.map((deck) => (
            <WinrateRow
              key={deck.name}
              winrate={deck.winRate}
              minimum={40}
              maximum={65}
              isBanned={isBanned(deck.name)}
            />
          ))}
          <footer className="metagame-axis">
            <span>40</span>
            <span>50</span>
            <span>65</span>
          </footer>
        </section>

        <section
          className="polarity-concentration-panel"
          aria-label="Homogeneity share in the full 16-archetype comparison (%)"
        >
          <header className="metagame-panel-header is-right">
            <span>
              Homogeneity <MetagameAxisArrow direction="right" />
            </span>
          </header>
          {decks.map((deck) => (
            <HomogeneityRow
              key={deck.name}
              homogeneity={deck.homogeneity}
              maximum={50}
              isBanned={isBanned(deck.name)}
            />
          ))}
          <footer className="metagame-axis polarity-concentration-axis">
            <span style={{ left: '0%' }}>0</span>
            <span style={{ left: '50%' }}>25</span>
            <span style={{ left: '100%' }}>50</span>
          </footer>
        </section>

        <section className="metagame-winrate-panel polarity-value-panel" aria-label="Overall polarity">
          <header className="metagame-panel-header is-right">
            <span>
              Polarity (%) <MetagameAxisArrow direction="right" />
            </span>
          </header>
          {decks.map((deck) => (
            <PolarityRow
              key={deck.name}
              polarity={deck.polarity}
              minimum={0}
              maximum={35}
              isBanned={isBanned(deck.name)}
            />
          ))}
          <footer className="metagame-axis">
            <span>0</span>
            <span>17.5</span>
            <span>35</span>
          </footer>
        </section>
      </div>
    </div>
  )
}

export function ModernHealthTimeline() {
  const [hoveredPoint, setHoveredPoint] = useState<TimelineDataPoint | null>(null)
  const [hoveredSet, setHoveredSet] = useState<SetMilestone | null>(null)
  const [hoveredBnR, setHoveredBnR] = useState<BnRMilestone | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const titleId = useId()

  const plotWidth = 720
  const yAxisGutter = 42
  const viewBoxWidth = plotWidth + yAxisGutter // 762
  const svgHeight = 240

  const trackHeight = 62
  const trackGap = 30

  // Track 1: Diversity (N_eff)
  const track1Top = 20
  const track1Bottom = track1Top + trackHeight // 82

  // Track 2: Polarity (P_meta)
  const track2Top = track1Bottom + trackGap // 112
  const track2Bottom = track2Top + trackHeight // 174

  // Row 3: Set Milestone Strip & Year Markers
  const setIconY = track2Bottom + 14 // 188
  const dateAxisY = setIconY + 36 // 224

  // Default active point to the latest point when not scrubbing
  const latestPoint = MODERN_DAILY_SERIES[MODERN_DAILY_SERIES.length - 1]
  const activePoint = hoveredPoint ?? latestPoint
  const activePmeta = activePoint.pMeta

  // Calculate dynamic snapshot Homogeneity (C_i) and Polarity metrics
  const enrichedDecks = useMemo(() => {
    // The displayed rows are only the eight leading archetypes. Their shares
    // are already normalized to the full 16-archetype comparison used for
    // field diversity, so use N_eff to recover that comparison's HHI rather
    // than renormalizing the visible rows as if they were the whole field.
    const formatHHI = activePoint.nEff > 0 ? 1 / activePoint.nEff : 0

    return activePoint.topDecks.map((deck) => {
      const s = deck.share / 100
      const computedHomogeneity = formatHHI > 0 ? ((s * s) / formatHHI) * 100 : 0
      const polarity = getTimelineDeckPolarity(activePoint, deck)

      return {
        ...deck,
        homogeneity: deck.homogeneity ?? computedHomogeneity,
        polarity,
      }
    })
  }, [activePoint])

  // Render authentic LaTeX spans with KaTeX
  const neffKaTeX = useMemo(() => {
    try {
      return katex.renderToString('N_{\\text{eff}}', { displayMode: false, throwOnError: false })
    } catch {
      return '<i>N</i><sub>eff</sub>'
    }
  }, [])

  const pmetaKaTeX = useMemo(() => {
    try {
      return katex.renderToString('P_{\\text{meta}}', { displayMode: false, throwOnError: false })
    } catch {
      return '<i>P</i><sub>meta</sub>'
    }
  }, [])

  // Exact 14-day width in pixel coordinates
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
  const twoWeeksWidth = Math.max(10, (fourteenDaysMs / TOTAL_SPAN_MS) * plotWidth)

  // Map dates strictly within the [0, plotWidth] coordinate range (FLUSH with content)
  const getXFromDate = useCallback((dateStr: string) => {
    const ms = new Date(dateStr).getTime()
    const normalized = Math.max(0, Math.min(1, (ms - START_MS) / TOTAL_SPAN_MS))
    return normalized * plotWidth
  }, [plotWidth])

  // Track 1: N_eff mapping: 3 to 16
  const getNeffY = useCallback(
    (val: number) => {
      const minVal = 3
      const maxVal = 16
      const normalized = (val - minVal) / (maxVal - minVal)
      return track1Top + (1 - normalized) * trackHeight
    },
    [track1Top, trackHeight]
  )

  // Track 2: P_meta mapping: 5% to 35%
  const getPmetaY = useCallback(
    (val: number) => {
      const minVal = 5
      const maxVal = 35
      const normalized = (val - minVal) / (maxVal - minVal)
      return track2Top + (1 - normalized) * trackHeight
    },
    [track2Top, trackHeight]
  )

  const neffPath = useMemo(() => {
    return MODERN_DAILY_SERIES.map((pt, i) => {
      const x = getXFromDate(pt.date)
      const y = getNeffY(pt.nEff)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
  }, [getXFromDate, getNeffY])

  const pmetaPath = useMemo(() => {
    let segmentStarted = false
    return MODERN_DAILY_SERIES.map((pt) => {
      if (pt.pMeta === undefined) {
        segmentStarted = false
        return ''
      }
      const x = getXFromDate(pt.date)
      const y = getPmetaY(pt.pMeta)
      const command = segmentStarted ? 'L' : 'M'
      segmentStarted = true
      return `${command} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).filter(Boolean).join(' ')
  }, [getXFromDate, getPmetaY])

  const isolatedPmetaPoints = useMemo(() => {
    return MODERN_DAILY_SERIES.filter((point, index) => {
      if (point.pMeta === undefined) return false
      const previous = MODERN_DAILY_SERIES[index - 1]
      const next = MODERN_DAILY_SERIES[index + 1]
      return previous?.pMeta === undefined && next?.pMeta === undefined
    })
  }, [])

  // Spatial cursor dispatch: completely isolates Set and B&R Milestones while updating Dynamic HUD
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top
      const svgX = -yAxisGutter + (clientX / rect.width) * viewBoxWidth
      const svgY = (clientY / rect.height) * svgHeight

      // 1. Check if hovering Row 3 Set Milestones Strip (y >= track2Bottom + 6)
      if (svgY >= track2Bottom + 6) {
        let closestSet: SetMilestone | null = null
        let minSetDist = 16

        for (const set of SET_MILESTONES) {
          const sx = getXFromDate(set.date)
          const dist = Math.abs(sx - svgX)
          if (dist < minSetDist) {
            minSetDist = dist
            closestSet = set
          }
        }

        if (closestSet) {
          setHoveredSet(closestSet)
          setHoveredBnR(null)
          const setPoint = [...MODERN_DAILY_SERIES]
            .filter((pt) => pt.date <= closestSet.date)
            .pop() ?? MODERN_DAILY_SERIES[0]
          setHoveredPoint(setPoint)
          return
        }
      }

      setHoveredSet(null)

      // 2. Check if hovering inside any 2-week B&R buffer window (x in [bnrX - 2, bnrX + twoWeeksWidth + 2])
      let activeBnR: null | BnRMilestone = null
      for (const bnr of BNR_MILESTONES) {
        const bnrX = getXFromDate(bnr.date)
        if (svgX >= bnrX - 2 && svgX <= bnrX + twoWeeksWidth + 2) {
          activeBnR = bnr
          break
        }
      }

      if (activeBnR) {
        setHoveredBnR(activeBnR)
        // Stick to the pre-B&R snapshot point (the point on or immediately before the B&R date)
        const preBnrPoint = [...MODERN_DAILY_SERIES]
          .filter((pt) => pt.date <= activeBnR.date)
          .pop() ?? MODERN_DAILY_SERIES[0]
        setHoveredPoint(preBnrPoint)
        return
      }

      setHoveredBnR(null)

      // 3. Scrub standard format metrics point on curves (Updates Dynamic HUD & Breakdown Table)
      let closestPoint = MODERN_DAILY_SERIES[0]
      let minDistance = Infinity

      for (const pt of MODERN_DAILY_SERIES) {
        const x = getXFromDate(pt.date)
        const dist = Math.abs(x - svgX)
        if (dist < minDistance) {
          minDistance = dist
          closestPoint = pt
        }
      }

      setHoveredPoint(closestPoint)
    },
    [getXFromDate, viewBoxWidth, yAxisGutter, svgHeight, track2Bottom, twoWeeksWidth]
  )

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null)
    setHoveredSet(null)
    setHoveredBnR(null)
  }, [])

  const hoveredX = hoveredPoint ? getXFromDate(hoveredPoint.date) : null

  return (
    <figure className="modern-timeline-figure" aria-labelledby={titleId}>
      {/* Figure Header */}
      <div className="modern-timeline-header">
        <h3 id={titleId} className="modern-timeline-title">
          Modern Format Health Timeline (2023 – 2026)
        </h3>
        <span className="modern-timeline-date-display">
          {activePoint.displayDate}
        </span>
      </div>

      {/* Stacked Full-Width Timeline SVG Canvas */}
      <div className="modern-timeline-chart-wrap">
        <svg
          ref={svgRef}
          viewBox={`-${yAxisGutter} 0 ${viewBoxWidth} ${svgHeight}`}
          className="modern-timeline-svg stacked outset-axis"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-label="Stacked Modern Format Health Timeline Chart"
        >
          {/* ================= TRACK 1: FIELD DIVERSITY (N_eff, Purple) ================= */}
          <foreignObject
            x={0}
            y={track1Top - 18}
            width={plotWidth}
            height={16}
            className="timeline-foreign-title"
          >
            <div className="timeline-track-title-html">
              <div className="timeline-track-title-left">
                <span className="timeline-track-title-text">Field Diversity</span>
                <span
                  className="timeline-track-title-math"
                  dangerouslySetInnerHTML={{ __html: `(${neffKaTeX})` }}
                />
              </div>
              <div className="timeline-track-hud-val">
                <span
                  className="timeline-hud-label"
                  dangerouslySetInnerHTML={{ __html: `${neffKaTeX} =` }}
                />
                <strong className="timeline-hud-num">{activePoint.nEff.toFixed(1)}</strong>
              </div>
            </div>
          </foreignObject>

          <g className="timeline-track track-1">
            {/* Track 1 Background Grid (x = 0 to plotWidth) */}
            <line
              x1={0}
              y1={track1Top}
              x2={plotWidth}
              y2={track1Top}
              className="timeline-grid-line"
            />
            <line
              x1={0}
              y1={track1Top + trackHeight * 0.5}
              x2={plotWidth}
              y2={track1Top + trackHeight * 0.5}
              className="timeline-grid-line"
            />
            <line
              x1={0}
              y1={track1Bottom}
              x2={plotWidth}
              y2={track1Bottom}
              className="timeline-axis-line"
            />

            {/* Left Vertical Boundary Line (Flush with x = 0) */}
            <line
              x1={0}
              y1={track1Top}
              x2={0}
              y2={track1Bottom}
              className="timeline-axis-line"
            />

            {/* Track 1 Y-Ticks (Positioned in the negative left gutter) */}
            <text x={-6} y={getNeffY(14) + 4} textAnchor="end" className="timeline-y-tick neff">14</text>
            <text x={-6} y={getNeffY(9.5) + 4} textAnchor="end" className="timeline-y-tick neff">9.5</text>
            <text x={-6} y={getNeffY(5) + 4} textAnchor="end" className="timeline-y-tick neff">5</text>

            {/* 2-Week B&R Shaded Bands & Lines Strictly inside Track 1 */}
            {BNR_MILESTONES.map((bnr) => {
              const x = getXFromDate(bnr.date)
              return (
                <g key={`bnr-track1-${bnr.id}`} className="timeline-bnr-group">
                  {!bnr.noAction && (
                    <rect
                      x={x}
                      y={track1Top}
                      width={twoWeeksWidth}
                      height={trackHeight}
                      className="timeline-bnr-band"
                    />
                  )}
                  <line
                    x1={x}
                    y1={track1Top}
                    x2={x}
                    y2={track1Bottom}
                    className={bnr.noAction ? 'timeline-bnr-line no-action' : 'timeline-bnr-line'}
                  />
                </g>
              )
            })}

            {/* Diversity Curve (Purple) */}
            <path d={neffPath} className="timeline-line neff" />
          </g>

          {/* ================= TRACK 2: MATCHUP POLARITY (P_meta, Orange) ================= */}
          <foreignObject
            x={0}
            y={track2Top - 18}
            width={plotWidth}
            height={16}
            className="timeline-foreign-title"
          >
            <div className="timeline-track-title-html">
              <div className="timeline-track-title-left">
                <span className="timeline-track-title-text">Matchup Polarity</span>
                <span
                  className="timeline-track-title-math"
                  dangerouslySetInnerHTML={{ __html: `(${pmetaKaTeX})` }}
                />
              </div>
              <div className="timeline-track-hud-val">
                <span
                  className="timeline-hud-label"
                  dangerouslySetInnerHTML={{ __html: `${pmetaKaTeX} =` }}
                />
                <strong className="timeline-hud-num">
                  {activePmeta === undefined ? '—' : `${activePmeta.toFixed(1)}%`}
                </strong>
              </div>
            </div>
          </foreignObject>

          <g className="timeline-track track-2">
            {/* Track 2 Background Grid (x = 0 to plotWidth) */}
            <line
              x1={0}
              y1={track2Top}
              x2={plotWidth}
              y2={track2Top}
              className="timeline-grid-line"
            />
            <line
              x1={0}
              y1={track2Top + trackHeight * 0.5}
              x2={plotWidth}
              y2={track2Top + trackHeight * 0.5}
              className="timeline-grid-line"
            />
            <line
              x1={0}
              y1={track2Bottom}
              x2={plotWidth}
              y2={track2Bottom}
              className="timeline-axis-line"
            />

            {/* Left Vertical Boundary Line (Flush with x = 0) */}
            <line
              x1={0}
              y1={track2Top}
              x2={0}
              y2={track2Bottom}
              className="timeline-axis-line"
            />

            {/* Track 2 Y-Ticks (Positioned in the negative left gutter) */}
            <text x={-6} y={getPmetaY(30) + 4} textAnchor="end" className="timeline-y-tick pmeta">30%</text>
            <text x={-6} y={getPmetaY(20) + 4} textAnchor="end" className="timeline-y-tick pmeta">20%</text>
            <text x={-6} y={getPmetaY(10) + 4} textAnchor="end" className="timeline-y-tick pmeta">10%</text>

            {/* 2-Week B&R Shaded Bands & Lines Strictly inside Track 2 */}
            {BNR_MILESTONES.map((bnr) => {
              const x = getXFromDate(bnr.date)
              return (
                <g key={`bnr-track2-${bnr.id}`} className="timeline-bnr-group">
                  {!bnr.noAction && (
                    <rect
                      x={x}
                      y={track2Top}
                      width={twoWeeksWidth}
                      height={trackHeight}
                      className="timeline-bnr-band"
                    />
                  )}
                  <line
                    x1={x}
                    y1={track2Top}
                    x2={x}
                    y2={track2Bottom}
                    className={bnr.noAction ? 'timeline-bnr-line no-action' : 'timeline-bnr-line'}
                  />
                </g>
              )
            })}

            {/* Polarity Curve (Orange) */}
            <path d={pmetaPath} className="timeline-line pmeta" />
            {isolatedPmetaPoints.map((point) => (
              <circle
                key={`pmeta-observation-${point.id}`}
                cx={getXFromDate(point.date)}
                cy={getPmetaY(point.pMeta as number)}
                r="3"
                className="timeline-active-dot pmeta"
              />
            ))}
          </g>

          {/* ================= ROW 3: SET MILESTONE STRIP WITH FLUSH YEAR BARS ================= */}
          <g className="timeline-milestone-strip">
            {/* Horizontal Rail Line (x = 0 to plotWidth) */}
            <line
              x1={0}
              y1={setIconY + 8}
              x2={plotWidth}
              y2={setIconY + 8}
              className="timeline-rail-line"
            />

            {/* Set Release Glyphs */}
            {SET_MILESTONES.map((set) => {
              const x = getXFromDate(set.date)
              const isHovered = hoveredSet?.code === set.code
              return (
                <g
                  key={`set-${set.code}`}
                  className={`timeline-set-glyph ${isHovered ? 'is-active' : ''}`}
                >
                  <circle cx={x} cy={setIconY + 8} r="14" fill="transparent" />
                  <line
                    x1={x}
                    y1={track2Bottom}
                    x2={x}
                    y2={setIconY + 8}
                    className="timeline-set-peg"
                  />
                  <circle
                    cx={x}
                    cy={setIconY + 8}
                    r={isHovered ? '9.5' : '8'}
                    className="timeline-set-circle"
                  />
                  <image
                    href={`https://r2.videreproject.com/set-symbols/${set.code}-common.png`}
                    x={x - 6}
                    y={setIconY + 2}
                    width="12"
                    height="12"
                    className="timeline-set-chart-img"
                  />
                </g>
              )
            })}

            {/* Crisp Solid Black Vertical Milestone Bars for New Years (Flush from track2Bottom down) */}
            {YEAR_MARKERS.map((marker) => {
              const x = getXFromDate(marker.date)
              return (
                <g key={`year-marker-${marker.year}`} className="timeline-year-group">
                  <line
                    x1={x}
                    y1={track2Bottom + 0.625}
                    x2={x}
                    y2={setIconY + 22}
                    className="timeline-year-bar"
                  />
                  <text
                    x={x}
                    y={dateAxisY}
                    textAnchor="middle"
                    className="timeline-axis-text is-year"
                  >
                    {marker.year}
                  </text>
                </g>
              )
            })}
          </g>

          {/* ================= UNIFIED HOVER CROSSHAIR ================= */}
          {hoveredPoint && hoveredX !== null && (
            <line
              x1={hoveredX}
              y1={track1Top}
              x2={hoveredX}
              y2={setIconY + 24}
              className="timeline-crosshair"
            />
          )}

          {/* Active Highlight Points on Both Curves */}
          {hoveredPoint && hoveredX !== null && (
            <g className="timeline-active-points">
              <circle
                cx={hoveredX}
                cy={getNeffY(hoveredPoint.nEff)}
                r="5"
                className="timeline-active-dot neff"
              />
              {activePmeta !== undefined && (
                <circle
                  cx={hoveredX}
                  cy={getPmetaY(activePmeta)}
                  r="5"
                  className="timeline-active-dot pmeta"
                />
              )}
            </g>
          )}
        </svg>

        {/* 1. Dedicated Set Milestone Tooltip (Anchored right above Set Pin) */}
        {hoveredSet && (
          <div
            className="timeline-tooltip set-milestone"
            style={{
              left: `${(getXFromDate(hoveredSet.date) / plotWidth) * 100}%`,
              top: `${((setIconY - 6) / svgHeight) * 100}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="set-tooltip-content">
              <img
                src={`https://r2.videreproject.com/set-symbols/${hoveredSet.code}-common.png`}
                alt={hoveredSet.code}
                className="set-tooltip-img"
              />
              <div className="set-tooltip-info">
                <strong className="set-tooltip-name">{hoveredSet.name}</strong>
                <span className="set-tooltip-date">{hoveredSet.displayDate}</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Dedicated B&R Milestone Tooltip (Anchored over B&R Buffer Window) */}
        {hoveredBnR && (
          <div
            className="timeline-tooltip bnr-milestone"
            style={{
              left: `${(getXFromDate(hoveredBnR.date) / plotWidth) * 100}%`,
              top: '25%',
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="bnr-tooltip-header">{hoveredBnR.displayDate} B&R</div>
            <div className="bnr-tooltip-card-list">
              {hoveredBnR.bannedCards.length === 0 && hoveredBnR.unbannedCards.length === 0 && (
                <div className="bnr-tooltip-no-cards">No card changes</div>
              )}
              {hoveredBnR.bannedCards.map((card) => (
                <div key={`ban-${card}`} className="bnr-tooltip-card-item ban">
                  <span className="bnr-tooltip-sign">−</span>
                  <span className="bnr-tooltip-card-name">{card}</span>
                </div>
              ))}
              {hoveredBnR.unbannedCards.map((card) => (
                <div key={`unban-${card}`} className="bnr-tooltip-card-item unban">
                  <span className="bnr-tooltip-sign">+</span>
                  <span className="bnr-tooltip-card-name">{card}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= CANONICAL VIDERE METAGAME BREAKDOWN (Share, Winrate, Homogeneity & Polarity) ================= */}
      <MetagameBreakdown
        decks={enrichedDecks}
        bannedArchetypes={hoveredBnR?.affectedArchetypes}
      />
    </figure>
  )
}
