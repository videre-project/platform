/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useLayoutEffect, useRef, useState } from 'react'
import { WinrateIntervalPlot } from '@videreproject/ui/dashboard-visuals'

interface WinrateDistribution {
  winrate: number
  confidenceInterval: number
  games?: number
}

type WinrateComparison = Omit<WinrateDistribution, 'confidenceInterval'> & {
  confidenceInterval?: number
}

function WinrateValue({ value, isCurrent = false }: { value: number, isCurrent?: boolean }) {
  const [whole, fraction] = value.toFixed(1).split('.')

  return (
    <span className={`metagame-tooltip-winrate-value${isCurrent ? ' is-current' : ''}`} aria-label={`${value.toFixed(1)}%`}>
      <span className="metagame-tooltip-winrate-value-whole">{whole}</span>
      <span className="metagame-tooltip-winrate-value-decimal">.</span>
      <span className="metagame-tooltip-winrate-value-fraction">{fraction}</span>
      <span className="metagame-tooltip-winrate-value-percent">%</span>
    </span>
  )
}

export function WinrateTooltipPlot({
  winrate,
  confidenceInterval,
  games,
  previous,
  muted = false,
}: WinrateDistribution & { previous?: WinrateComparison, muted?: boolean }) {
  const summaryRef = useRef<HTMLDivElement>(null)
  const comparisonRef = useRef<HTMLDivElement>(null)
  const previousWinrate = previous?.winrate
  const alignmentKey = previous
    ? `${winrate}:${previous.winrate}:${confidenceInterval}:${previous.confidenceInterval ?? ''}`
    : ''
  const [alignment, setAlignment] = useState<{ key: string, offset: number } | null>(null)

  useLayoutEffect(() => {
    if (previousWinrate === undefined) {
      setAlignment(null)
      return
    }

    const currentDecimal = summaryRef.current?.querySelector<HTMLElement>('.metagame-tooltip-winrate-value-decimal')
    const previousDecimal = comparisonRef.current?.querySelector<HTMLElement>('.metagame-tooltip-winrate-value-decimal')
    if (!currentDecimal || !previousDecimal) return

    const offset = Math.max(0, currentDecimal.getBoundingClientRect().left - previousDecimal.getBoundingClientRect().left)
    setAlignment(current => current?.key === alignmentKey && current.offset === offset
      ? current
      : { key: alignmentKey, offset })
  }, [alignmentKey, previousWinrate])

  const previousValueOffset = alignment?.key === alignmentKey ? alignment.offset : 0
  const alignmentPending = Boolean(previous && alignment?.key !== alignmentKey)

  return (
    <div className={`metagame-tooltip-winrate${previous ? ' has-previous' : ''}${muted ? ' is-muted' : ''}`}>
      <div className="metagame-tooltip-winrate-plot">
        {previous && (
          <div className="metagame-tooltip-winrate-layer is-previous" aria-hidden="true">
            <WinrateIntervalPlot
              winrate={previous.winrate}
              matches={previous.games ?? 0}
              confidenceInterval={{
                start: previous.winrate - (previous.confidenceInterval ?? 0),
                end: previous.winrate + (previous.confidenceInterval ?? 0),
              }}
            />
          </div>
        )}
        <div className={`metagame-tooltip-winrate-layer is-current${muted ? ' is-muted' : ''}`}>
          <WinrateIntervalPlot
            winrate={winrate}
            matches={games ?? 0}
            confidenceInterval={{
              start: winrate - confidenceInterval,
              end: winrate + confidenceInterval,
            }}
          />
        </div>
      </div>
      <div ref={summaryRef} className="metagame-tooltip-winrate-summary">
        <strong><WinrateValue value={winrate} isCurrent /></strong>
        <span className="metagame-tooltip-winrate-ci">±{confidenceInterval.toFixed(1)}%</span>
        {games !== undefined && (
          <span className="metagame-tooltip-winrate-games">({games} games)</span>
        )}
      </div>
      {previous && (
        <div ref={comparisonRef} className={`metagame-tooltip-winrate-comparison${alignmentPending ? ' is-alignment-pending' : ''}`}>
          <strong style={{ marginLeft: previousValueOffset > 0 ? `${previousValueOffset}px` : undefined }}><WinrateValue value={previous.winrate} /></strong>
          {previous.confidenceInterval !== undefined && (
            <span className="metagame-tooltip-winrate-ci">±{previous.confidenceInterval.toFixed(1)}%</span>
          )}
          <span className="metagame-tooltip-winrate-games">
            {previous.games !== undefined ? ` (${previous.games} games)` : ''}
          </span>
        </div>
      )}
    </div>
  )
}
