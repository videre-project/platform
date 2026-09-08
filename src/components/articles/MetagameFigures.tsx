/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import { MetagameAxisArrow } from '@/components/metagame/MetagameAxisArrow'
import { FORMAT_HEALTH_DATA } from '@/data/articles/polarity/metagame-figures'
import { MODERN_DAILY_SERIES } from '@/data/articles/polarity/modern-health-timeline'
import type { FormatHealthPoint, TimelineDataPoint } from '@/data/articles/polarity/types'
import '@/pages/MetagamePage.css'
import './MetagameFigures.css'




function getTooltipTransform(xPercent: number, yPercent: number, yThreshold = 30) {
  const xAlign = xPercent < 18 ? '0%' : xPercent > 82 ? '-100%' : '-50%'
  const yAlign = yPercent < yThreshold ? '14px' : 'calc(-100% - 12px)'
  return `translate(${xAlign}, ${yAlign})`
}

export function MetagameTaxonomyFigure() {
  const [hoveredPoint, setHoveredPoint] = useState<FormatHealthPoint | null>(null)

  // Coordinate transforms: viewBox 762 x 350
  // Outset margin: 42px on left (matching ModernHealthTimeline)
  // Plot area: X from 46 to 746 (width 700)
  // Plot area: Y from 30 to 308 (height 278)
  const plotLeft = 46
  const plotWidth = 700
  const plotTop = 30
  const plotBottom = 308
  const plotHeight = 278

  const getX = (p: number) => plotLeft + ((p - 5) / 30) * plotWidth
  const getY = (n: number) => plotBottom - ((n - 2) / 14) * plotHeight

  const splitX = getX(20.0) // 396
  const splitY = getY(10.0) // ~149.1

  const trajectory2026 = (() => {
    // The line connects the three paper events. Weekly MTGO observations set
    // the tangent at each anchor, so the curve reflects the online trend while
    // still passing through the measured paper snapshots.
    const points2026 = MODERN_DAILY_SERIES.filter(
      (d): d is TimelineDataPoint & { pMeta: number } => d.date >= '2026-05-18' && d.pMeta !== undefined,
    )
    const paperAnchors = [
      { id: 'pt-marvel', date: '2026-07-17' },
      { id: 'destination-rcqs-august', date: '2026-08-22' },
      { id: 'spotlight-hobbit', date: '2026-08-28' },
    ].map(({ id, date }) => {
      const point = FORMAT_HEALTH_DATA.find((candidate) => candidate.id === id)
      if (!point) return null
      return { x: getX(point.pMeta), y: getY(point.nEff), date }
    }).filter((point): point is { x: number; y: number; date: string } => point !== null)

    if (paperAnchors.length < 2) return null

    const tangentAt = (date: string) => {
      const timestamp = Date.parse(`${date}T00:00:00Z`)
      let nearestIndex = 0
      let nearestDistance = Number.POSITIVE_INFINITY
      points2026.forEach((point, index) => {
        const distance = Math.abs(Date.parse(`${point.date}T00:00:00Z`) - timestamp)
        if (distance < nearestDistance) {
          nearestIndex = index
          nearestDistance = distance
        }
      })
      const before = points2026[Math.max(0, nearestIndex - 1)]
      const after = points2026[Math.min(points2026.length - 1, nearestIndex + 1)]
      const x = getX(after.pMeta) - getX(before.pMeta)
      const y = getY(after.nEff) - getY(before.nEff)
      const magnitude = Math.hypot(x, y)
      return magnitude > 0 ? { x: x / magnitude, y: y / magnitude } : { x: 0, y: 0 }
    }

    // One path per anchor-to-anchor segment, so the older phase (PT Marvel ->
    // destination RCQs) can be dimmed relative to the more recent one.
    const segments: string[] = []
    for (let i = 0; i < paperAnchors.length - 1; i++) {
      const p1 = paperAnchors[i]
      const p2 = paperAnchors[i + 1]
      const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y)
      const tangent1 = tangentAt(p1.date)
      const tangent2 = tangentAt(p2.date)
      const cp1x = p1.x + tangent1.x * distance / 3
      const cp1y = p1.y + tangent1.y * distance / 3
      const cp2x = p2.x - tangent2.x * distance / 3
      const cp2y = p2.y - tangent2.y * distance / 3

      segments.push(
        `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
      )
    }

    // Directional arrows along the two major development phases:
    // 1. Post-ban combo surge (May -> Jun)
    // 2. Format re-stabilization (Jun -> Aug)
    const arrowIdx1 = 0
    const arrowIdx2 = 1

    const getArrow = (idx: number) => {
      const p1 = paperAnchors[idx]
      const p2 = paperAnchors[idx + 1]
      const midX = (p1.x + p2.x) / 2
      const midY = (p1.y + p2.y) / 2
      const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI
      return { x: midX, y: midY, angle }
    }

    return {
      segments,
      arrows: [getArrow(arrowIdx1), getArrow(arrowIdx2)],
    }
  })()

  return (
    <figure className="modern-taxonomy-figure" aria-label="Modern Metagame Taxonomy and Historical Events">
      {/* Header matching ModernHealthTimeline */}
      <header className="modern-taxonomy-header">
        <h3 className="modern-taxonomy-title">Modern Metagame Taxonomy & Historical Events</h3>
        <span className="modern-taxonomy-hud">
          {hoveredPoint ? (
            <>
              <span className="hud-metric"><em>N</em><sub>eff</sub> = {hoveredPoint.nEff.toFixed(1)}</span>, <span className="hud-metric"><em>P</em><sub>meta</sub> = {hoveredPoint.pMeta.toFixed(1)}%</span>
            </>
          ) : (
            <span className="hud-hint">Hover an event to inspect details</span>
          )}
        </span>
      </header>

      {/* SVG Canvas Area with Outset Axis */}
      <div className="modern-taxonomy-chart-wrap">
        <svg
          viewBox="0 0 762 350"
          className="modern-taxonomy-svg outset-axis"
          role="img"
          aria-label="Scatter plot of Effective Decks (N_eff) vs Matchup Polarity (P_meta)"
        >
          {/* Quadrant background zones */}
          <rect
            x={plotLeft}
            y={plotTop}
            width={splitX - plotLeft}
            height={splitY - plotTop}
            className="taxonomy-zone-rect zone-green"
          />
          <rect
            x={splitX}
            y={plotTop}
            width={plotLeft + plotWidth - splitX}
            height={splitY - plotTop}
            className="taxonomy-zone-rect zone-yellow"
          />
          <rect
            x={plotLeft}
            y={splitY}
            width={splitX - plotLeft}
            height={plotBottom - splitY}
            className="taxonomy-zone-rect zone-purple"
          />
          <rect
            x={splitX}
            y={splitY}
            width={plotLeft + plotWidth - splitX}
            height={plotBottom - splitY}
            className="taxonomy-zone-rect zone-red"
          />

          {/* Quadrant Zone Labels */}
          <text x={plotLeft + 12} y={plotTop + 18} className="taxonomy-zone-label">
            MORE DECKS, CLOSER MATCHUPS
          </text>
          <text x={plotLeft + plotWidth - 12} y={plotTop + 18} textAnchor="end" className="taxonomy-zone-label">
            MORE DECKS, WIDER MATCHUPS
          </text>
          <text x={plotLeft + 12} y={splitY + 18} className="taxonomy-zone-label">
            FEWER DECKS, CLOSER MATCHUPS
          </text>
          <text x={plotLeft + plotWidth - 12} y={splitY + 18} textAnchor="end" className="taxonomy-zone-label">
            FEWER DECKS, WIDER MATCHUPS
          </text>

          {/* Horizontal Grid lines */}
          <line x1={plotLeft} y1={getY(4)} x2={plotLeft + plotWidth} y2={getY(4)} className="taxonomy-grid-line" />
          <line x1={plotLeft} y1={getY(8)} x2={plotLeft + plotWidth} y2={getY(8)} className="taxonomy-grid-line" />
          <line x1={plotLeft} y1={getY(12)} x2={plotLeft + plotWidth} y2={getY(12)} className="taxonomy-grid-line" />
          <line x1={plotLeft} y1={getY(16)} x2={plotLeft + plotWidth} y2={getY(16)} className="taxonomy-grid-line" />

          {/* Vertical Grid lines */}
          <line x1={getX(10)} y1={plotTop} x2={getX(10)} y2={plotBottom} className="taxonomy-grid-line" />
          <line x1={getX(20)} y1={plotTop} x2={getX(20)} y2={plotBottom} className="taxonomy-grid-line" />
          <line x1={getX(30)} y1={plotTop} x2={getX(30)} y2={plotBottom} className="taxonomy-grid-line" />

          {/* Reference Threshold Lines */}
          <line x1={splitX} y1={plotTop} x2={splitX} y2={plotBottom} className="taxonomy-threshold-line-v" />
          <line x1={plotLeft} y1={splitY} x2={plotLeft + plotWidth} y2={splitY} className="taxonomy-threshold-line-h" />

          {/* Threshold Badges */}
          <text x={splitX + 8} y={plotTop + 36} className="taxonomy-threshold-badge">
            P_meta = 20%
          </text>
          <text x={plotLeft + 12} y={splitY - 8} className="taxonomy-threshold-badge">
            N_eff = 10.0
          </text>

          {/* Weekly MTGO trajectory; paper events appear as independent points. */}
          {trajectory2026 && (
            <g className="taxonomy-trajectory-group" aria-label="Weekly 2026 Magic Online metagame trajectory">
              {/* Soft background lines; the older phase renders dimmer */}
              {trajectory2026.segments.map((segment, idx) => (
                <path
                  key={`traj-glow-${idx}`}
                  d={segment}
                  className={`taxonomy-trajectory-glow${idx === 0 ? ' taxonomy-trajectory-muted' : ''}`}
                  fill="none"
                />
              ))}
              {/* Primary crisp dashed trajectory lines; the older phase renders dimmer */}
              {trajectory2026.segments.map((segment, idx) => (
                <path
                  key={`traj-line-${idx}`}
                  d={segment}
                  className={`taxonomy-trajectory-line${idx === 0 ? ' taxonomy-trajectory-muted' : ''}`}
                  fill="none"
                />
              ))}
              {/* Directional flow chevrons */}
              {trajectory2026.arrows.map((arrow, idx) => (
                <path
                  key={`traj-arrow-${idx}`}
                  d="M -4 -3.5 L 3.5 0 L -4 3.5 Z"
                  transform={`translate(${arrow.x.toFixed(1)}, ${arrow.y.toFixed(1)}) rotate(${arrow.angle.toFixed(1)})`}
                  className={`taxonomy-trajectory-arrow${idx === 0 ? ' taxonomy-trajectory-muted' : ''}`}
                />
              ))}
            </g>
          )}

          {/* Outset Y-Axis Line and Ticks */}
          <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} className="taxonomy-axis-line" />
          {[4, 8, 12, 16].map((val) => (
            <g key={`y-tick-${val}`}>
              <line x1={plotLeft - 5} y1={getY(val)} x2={plotLeft} y2={getY(val)} className="taxonomy-axis-tick" />
              <text x={plotLeft - 9} y={getY(val) + 4} textAnchor="end" className="taxonomy-axis-num">
                {val}
              </text>
            </g>
          ))}

          {/* Outset X-Axis Line and Ticks */}
          <line x1={plotLeft} y1={plotBottom} x2={plotLeft + plotWidth} y2={plotBottom} className="taxonomy-axis-line" />
          {[10, 20, 30].map((val) => (
            <g key={`x-tick-${val}`}>
              <line x1={getX(val)} y1={plotBottom} x2={getX(val)} y2={plotBottom + 5} className="taxonomy-axis-tick" />
              <text x={getX(val)} y={plotBottom + 18} textAnchor="middle" className="taxonomy-axis-num">
                {val}%
              </text>
            </g>
          ))}

          {/* Data Points */}
          {FORMAT_HEALTH_DATA.map((pt) => {
            const cx = getX(pt.pMeta)
            const cy = getY(pt.nEff)
            const isHovered = hoveredPoint?.id === pt.id
            const isCurrent = pt.id === 'spotlight-hobbit'
            const dx = pt.dx ?? (pt.pMeta > 26 ? -10 : 10)
            const dy = pt.dy ?? 4
            const textAnchor = pt.textAnchor ?? (pt.pMeta > 26 ? 'end' : 'start')
            const hitX = textAnchor === 'end' ? cx + dx - 120 : cx - 16
            const hitWidth = 140

            return (
              <g
                key={pt.id}
                className={`taxonomy-point ${isHovered ? 'is-active' : ''} ${isCurrent ? 'is-current' : ''}`}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint((current) => (current?.id === pt.id ? null : current))}
                onFocus={() => setHoveredPoint(pt)}
                onBlur={() => setHoveredPoint(null)}
                tabIndex={0}
                role="button"
                aria-label={`${pt.name}: Polarity ${pt.pMeta}%, field diversity ${pt.nEff}`}
              >
                {/* Stable fixed rectangular hit zone covering dot and text label */}
                <rect
                  x={hitX}
                  y={cy - 16}
                  width={hitWidth}
                  height={32}
                  fill="transparent"
                  stroke="transparent"
                  style={{ pointerEvents: 'all' }}
                />

                {/* Outer Glow Halo on Hover */}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="12"
                    fill={pt.color}
                    opacity="0.25"
                    className="taxonomy-point-halo"
                    style={{ pointerEvents: 'none' }}
                  />
                )}

                {/* Main Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7 : 5}
                  fill={pt.color}
                  stroke="#ffffff"
                  strokeWidth="1.75"
                  className="taxonomy-point-dot"
                  style={{ pointerEvents: 'none' }}
                />

                {/* Point Label */}
                <text
                  x={cx + dx}
                  y={cy + dy}
                  textAnchor={textAnchor}
                  className="taxonomy-point-label"
                  style={{ pointerEvents: 'none' }}
                >
                  {pt.name}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Axis Header Titles (HTML overlay so the arrows match the metagame tables) */}
        <div className="modern-taxonomy-axis-title modern-taxonomy-axis-title-y">
          <span>Field Diversity (N_eff)</span>
          <MetagameAxisArrow direction="up" />
        </div>
        <div className="modern-taxonomy-axis-title modern-taxonomy-axis-title-x">
          <span>Matchup Polarity (P_meta)</span>
          <MetagameAxisArrow direction="right" />
        </div>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="figure-tooltip"
            style={{
              left: `${(getX(hoveredPoint.pMeta) / 762) * 100}%`,
              top: `${(getY(hoveredPoint.nEff) / 350) * 100}%`,
              transform: getTooltipTransform(
                (getX(hoveredPoint.pMeta) / 762) * 100,
                (getY(hoveredPoint.nEff) / 350) * 100,
                30,
              ),
            }}
          >
            <div className="figure-tooltip-header">
              <span className="figure-tooltip-title">{hoveredPoint.name}</span>
              <span className="figure-tooltip-subtitle">{hoveredPoint.era}</span>
            </div>
            <div className="figure-tooltip-metrics">
              <span><em>N</em><sub>eff</sub> = <strong>{hoveredPoint.nEff.toFixed(1)}</strong></span>
              <span>&bull;</span>
              <span><em>P</em><sub>meta</sub> = <strong>{hoveredPoint.pMeta.toFixed(1)}%</strong></span>
            </div>
          </div>
        )}
      </div>

      <figcaption className="modern-figure-caption">
        <strong>Figure 1.</strong> Field diversity and format polarity across benchmark Modern events and paper tournaments. The dashed line connects Pro Tour Marvel, the August destination RCQs, and Magic Spotlight: The Hobbit; weekly MTGO results inform the direction of the curves between them. Moving upward reflects broader diversity (<em>N</em><sub>eff</sub>), while moving leftward reflects closer matchups (<em>P</em><sub>meta</sub>). Hover over any event to inspect its metrics.
      </figcaption>
    </figure>
  )
}
