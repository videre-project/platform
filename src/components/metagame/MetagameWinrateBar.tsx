/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { forwardRef } from 'react'
import type { CSSProperties, HTMLAttributes } from 'react'

export type RGB = readonly [number, number, number]

export const MUTED_TRACK_RGB = [30, 41, 59] as const
export const SHARE_FILL_RGB = [9, 141, 170] as const

const RDYLGN = [
  [165, 0, 38],
  [215, 48, 39],
  [244, 109, 67],
  [253, 174, 97],
  [254, 224, 139],
  [255, 255, 191],
  [217, 239, 139],
  [166, 217, 106],
  [102, 189, 99],
  [26, 152, 80],
  [0, 104, 55],
] as const

const DARK_PLOT_RGB = [41, 42, 43] as const
const DARK_TEXT_RGB = [2, 8, 23] as const
const LIGHT_TEXT_RGB = [255, 255, 255] as const

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

function getRelativeLuminance([red, green, blue]: RGB): number {
  const linearize = (channel: number) => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return (0.2126 * linearize(red)) +
    (0.7152 * linearize(green)) +
    (0.0722 * linearize(blue))
}

function getContrastRatio(background: RGB, foreground: RGB): number {
  const backgroundLuminance = getRelativeLuminance(background)
  const foregroundLuminance = getRelativeLuminance(foreground)
  const lighter = Math.max(backgroundLuminance, foregroundLuminance)
  const darker = Math.min(backgroundLuminance, foregroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

export function getHeatColorRgb(winrate: number, minimum: number, maximum: number): RGB {
  const normalized = clamp((winrate - minimum) / (maximum - minimum), 0, 1)
  const position = normalized * (RDYLGN.length - 1)
  const lowerIndex = Math.floor(position)
  const upperIndex = Math.min(RDYLGN.length - 1, lowerIndex + 1)
  const ratio = position - lowerIndex
  const color = RDYLGN[lowerIndex].map((channel, index) =>
    Math.round(channel + (RDYLGN[upperIndex][index] - channel) * ratio),
  )

  return [
    Math.abs(color[0] - DARK_PLOT_RGB[0]),
    Math.abs(color[1] - DARK_PLOT_RGB[1]),
    Math.abs(color[2] - DARK_PLOT_RGB[2]),
  ]
}

export function getTextToneClass(background: RGB): string {
  return getContrastRatio(background, LIGHT_TEXT_RGB) > getContrastRatio(background, DARK_TEXT_RGB)
    ? 'has-light-text'
    : 'has-dark-text'
}

interface WinrateBarVisualProps extends HTMLAttributes<HTMLDivElement> {
  winrate: number
  confidenceInterval: number
  minimum: number
  maximum: number
  heatMinimum: number
  heatMaximum: number
  mean?: number
  compact?: boolean
  renderTarget?: 'browser' | 'takumi'
}

export const WinrateBarVisual = forwardRef<HTMLDivElement, WinrateBarVisualProps>(function WinrateBarVisual({
  winrate,
  confidenceInterval,
  minimum,
  maximum,
  heatMinimum,
  heatMaximum,
  mean,
  compact = false,
  renderTarget = 'browser',
  className,
  ...props
}, ref) {
  const scale = (value: number) => clamp(((value - minimum) / (maximum - minimum)) * 100, 0, 100)
  const position = scale(winrate)
  const confidenceStart = scale(winrate - confidenceInterval)
  const confidenceEnd = scale(winrate + confidenceInterval)
  const hasRightOverhang = confidenceEnd > position
  const winrateRgb = getHeatColorRgb(winrate, heatMinimum, heatMaximum)
  const winrateColor = `rgb(${winrateRgb.join(' ')})`
  const unpaddedSpread = (maximum - minimum) / 2 / 1.2
  const useRightLabel = (compact && winrate < 50) || (
    (winrate - confidenceInterval - (50 - unpaddedSpread)) /
    (unpaddedSpread * 2)
  ) <= 0.2
  const labelPosition = useRightLabel ? confidenceEnd : confidenceStart
  const labelBackground = useRightLabel ? MUTED_TRACK_RGB : winrateRgb

  return (
    <div
      {...props}
      ref={ref}
      className={`metagame-winrate-track${className ? ` ${className}` : ''}`}
    >
      <span
        className="metagame-winrate-fill"
        style={{
          width: `${position}%`,
          background: winrateColor,
        }}
      />
      {mean !== undefined && (
        <span
          className="metagame-sideboarding-performance-mean"
          style={{ left: `${scale(mean)}%` }}
          aria-hidden="true"
        />
      )}
      <svg
        className="metagame-confidence-graphic"
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g>
          {hasRightOverhang && (
            <>
              <line
                className="metagame-confidence-range"
                x1={position}
                x2={confidenceEnd}
                y1="12"
                y2="12"
                stroke={winrateColor}
                strokeWidth="2"
                strokeLinecap="butt"
                vectorEffect="non-scaling-stroke"
              />
              <line
                className="metagame-confidence-endpoint"
                x1={confidenceEnd}
                x2={confidenceEnd}
                y1="7.5"
                y2="17.5"
                stroke={winrateColor}
                strokeWidth={renderTarget === 'takumi' ? '1' : '2'}
                strokeLinecap="butt"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
          <line
            className="metagame-confidence-range"
            x1={confidenceStart}
            x2={hasRightOverhang ? position : confidenceEnd}
            y1="12"
            y2="12"
            stroke="black"
            strokeWidth="2"
            strokeLinecap="butt"
            vectorEffect="non-scaling-stroke"
          />
          <line
            className="metagame-confidence-endpoint"
            x1={confidenceStart}
            x2={confidenceStart}
            y1="8"
            y2="17"
            stroke="black"
            strokeWidth={renderTarget === 'takumi' ? '1' : '2'}
            strokeLinecap="butt"
            vectorEffect="non-scaling-stroke"
          />
          {!hasRightOverhang && (
            <line
              className="metagame-confidence-endpoint"
              x1={confidenceEnd}
              x2={confidenceEnd}
              y1="8"
              y2="17"
              stroke="black"
              strokeWidth={renderTarget === 'takumi' ? '1' : '2'}
              strokeLinecap="butt"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>
      </svg>
      <strong
        className={`metagame-winrate-label ${useRightLabel ? 'is-right' : 'is-left'} ${getTextToneClass(labelBackground)}`}
        style={{ left: `${labelPosition}%` } as CSSProperties}
      >
        {winrate.toFixed(1)}%
      </strong>
    </div>
  )
})
