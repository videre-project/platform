/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { CSSProperties } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@videreproject/ui'

import type { ArchetypePolarityMetric } from '@/utils/polarity'
import { DifferenceBar } from './MetagameMoverChart'
import { WinrateBarVisual } from './MetagameWinrateBar'

const POLARITY_HEAT_MAXIMUM = 50

const formatPolarity = (value: number | null) =>
  value === null ? '—' : `${value.toFixed(1)}%`

const formatDifference = (value: number | undefined) =>
  value === undefined ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`

export function PolarityLabelRow({ row }: { row: ArchetypePolarityMetric }) {
  return (
    <div className="metagame-chart-row polarity-label-row">
      <span className="metagame-archetype-name" title={row.archetype}>
        {row.archetype}
      </span>
    </div>
  )
}

export function PolarityConcentrationRow({
  row,
  maximum,
}: {
  row: ArchetypePolarityMetric
  maximum: number
}) {
  const value = row.concentrationIndex
  const threshold = 50
  const totalWidth = maximum > 0 ? Math.min(100, Math.max(0, (value / maximum) * 100)) : 0
  const thresholdWidth = maximum > 0 ? Math.min(100, Math.max(0, (threshold / maximum) * 100)) : 66.67
  const baseWidth = Math.min(totalWidth, thresholdWidth)
  const overflowWidth = Math.max(0, totalWidth - thresholdWidth)
  const inline = totalWidth >= 36
  const display = `${value.toFixed(1)}%`

  const tooltipRows = [
    { label: 'Metagame Share', value: `${row.percentage.toFixed(1)}%` },
    { label: 'Homogeneity', value: `${value.toFixed(1)}% of H` },
  ]

  return (
    <div className="metagame-chart-row metagame-share-row polarity-concentration-row">
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <div
            className="metagame-share-track polarity-concentration-track"
            role="button"
            tabIndex={0}
            aria-label={`${row.archetype} format homogeneity: ${display}`}
            style={{ '--concentration-threshold': `${thresholdWidth}%` } as CSSProperties}
          >
            {baseWidth > 0 && (
              <span
                className="polarity-concentration-fill"
                style={{ width: `${baseWidth}%` }}
              />
            )}
            {overflowWidth > 0 && (
              <span
                className="polarity-concentration-overflow"
                style={{
                  left: `${baseWidth}%`,
                  width: `${overflowWidth}%`,
                }}
              />
            )}
            <strong
              className={`metagame-share-label${inline ? ' is-inline' : ''} has-light-text`}
              style={{ left: `${totalWidth}%` }}
            >
              {display}
            </strong>
          </div>
        </TooltipTrigger>
        <TooltipContent className="metagame-tooltip-content">
          <strong className="metagame-tooltip-heading">{row.archetype}</strong>
          <dl>
            {tooltipRows.map(({ label, value: itemValue }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{itemValue}</dd>
              </div>
            ))}
          </dl>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function PolarityDifferenceBar({
  value,
  base,
  label,
  tooltipHeading,
  minimum,
  maximum,
}: {
  value: number | null
  base: number
  label: string
  tooltipHeading: string
  minimum: number
  maximum: number
}) {
  if (value === null) {
    return (
      <div
        className="metagame-sideboarding-performance-bar polarity-difference-bar"
        role="img"
        aria-label={`${label}: no data`}
      >
        <div className="metagame-difference-track">
          <strong
            className="metagame-difference-label is-unavailable"
            style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            —
          </strong>
        </div>
      </div>
    )
  }

  const delta = value - base

  return (
    <div
      className="metagame-sideboarding-performance-bar polarity-difference-bar"
      role="img"
      aria-label={`${label}: ${value.toFixed(1)}%, ${formatDifference(delta)} versus ${base.toFixed(1)}% overall polarity`}
    >
      <DifferenceBar
        value={delta}
        previousValue={base}
        currentValue={value}
        minimum={minimum}
        maximum={maximum}
        label={label}
        tooltipHeading={tooltipHeading}
        current={`${value.toFixed(1)}%`}
        previous={`${base.toFixed(1)}% overall`}
        comparisonLabel="Overall"
        formatDifference={formatDifference}
      />
    </div>
  )
}

export function PolaritySegmentRow({
  row,
  value,
  label,
  minimum,
  maximum,
}: {
  row: ArchetypePolarityMetric
  value: number | null
  label: string
  minimum: number
  maximum: number
}) {
  return (
    <div className="metagame-chart-row metagame-winrate-row polarity-segment-row">
      <PolarityDifferenceBar
        value={value}
        base={row.polarity}
        minimum={minimum}
        maximum={maximum}
        label={`${row.archetype} · ${label}`}
        tooltipHeading={row.archetype}
      />
    </div>
  )
}

export function PolarityValueRow({
  row,
  minimum,
  maximum,
}: {
  row: ArchetypePolarityMetric
  minimum: number
  maximum: number
}) {
  return (
    <div className="metagame-chart-row metagame-winrate-row polarity-value-row">
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <WinrateBarVisual
            winrate={row.polarity}
            confidenceInterval={row.polarityConfidenceInterval}
            minimum={minimum}
            maximum={maximum}
            heatMinimum={0}
            heatMaximum={POLARITY_HEAT_MAXIMUM}
            reverseHeat
            keepLabelInside
            className="polarity-winrate-bar"
            aria-label={`${row.archetype}: ${formatPolarity(row.polarity)} overall polarity ±${row.polarityConfidenceInterval.toFixed(1)}% bootstrap CI`}
          />
        </TooltipTrigger>
        <TooltipContent className="metagame-tooltip-content">
          <strong className="metagame-tooltip-heading">{row.archetype}</strong>
          <dl>
            <div>
              <dt>Polarity</dt>
              <dd>{formatPolarity(row.polarity)}</dd>
            </div>
            <div>
              <dt>95% CI</dt>
              <dd>±{row.polarityConfidenceInterval.toFixed(1)}%</dd>
            </div>
          </dl>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
