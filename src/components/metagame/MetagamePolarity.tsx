/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import type { MetagameData } from '@/hooks/useMetagame'
import type { SideboardingData } from '@/hooks/useSideboarding'
import {
  computeArchetypePolarities,
  type MetagamePolarityData,
} from '@/utils/polarity'
import { MetagameAxisArrow } from './MetagameAxisArrow'
import { MetagameChartSkeleton } from './MetagameChartSkeleton'
import { MetagameHealthKPIs } from './MetagameHealthKPIs'
import { MetagameMobileLabelRail } from './MetagameMobileLabelRail'
import {
  PolarityConcentrationRow,
  PolarityLabelRow,
  PolaritySegmentRow,
  PolarityValueRow,
} from './MetagamePolarityRows'
import './MetagameInsights.css'

interface MetagamePolarityProps {
  metagame: MetagameData | null
  sideboarding: SideboardingData | null
  loading: boolean
  sideboardingError: string | null
  visible: boolean
  controls: ReactNode
}

const formatAxisTick = (value: number) => Math.round(value).toString()

export function MetagamePolarity({
  metagame,
  sideboarding,
  loading,
  sideboardingError,
  visible,
  controls,
}: MetagamePolarityProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollEdgeFrameRef = useRef<number | null>(null)

  const syncScrollEdges = useCallback(() => {
    const element = scrollRef.current
    if (!element) return

    const left = element.scrollLeft
    const maximum = Math.max(0, element.scrollWidth - element.clientWidth)
    element.classList.toggle('has-left-overflow', left > 1)
    element.classList.toggle('has-right-overflow', left < maximum - 1)
  }, [])

  const scheduleScrollEdgeSync = useCallback(() => {
    if (scrollEdgeFrameRef.current !== null) return
    scrollEdgeFrameRef.current = requestAnimationFrame(() => {
      scrollEdgeFrameRef.current = null
      syncScrollEdges()
    })
  }, [syncScrollEdges])

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !visible) return

    syncScrollEdges()
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleScrollEdgeSync)
    observer?.observe(element)
    if (element.firstElementChild) observer?.observe(element.firstElementChild)
    window.addEventListener('resize', scheduleScrollEdgeSync)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', scheduleScrollEdgeSync)
      if (scrollEdgeFrameRef.current !== null) {
        cancelAnimationFrame(scrollEdgeFrameRef.current)
        scrollEdgeFrameRef.current = null
      }
    }
  }, [scheduleScrollEdgeSync, syncScrollEdges, metagame, sideboarding, loading, visible])

  const polarityData: MetagamePolarityData | null = useMemo(
    () => computeArchetypePolarities(metagame, sideboarding),
    [metagame, sideboarding],
  )

  useEffect(() => {
    if (scrollRef.current && visible) {
      scrollRef.current.scrollLeft = 0
      scheduleScrollEdgeSync()
    }
  }, [metagame, scheduleScrollEdgeSync, visible])

  if (loading || !metagame) {
    return <MetagameChartSkeleton variant="main" controls={controls} />
  }

  if (sideboardingError && !polarityData) {
    return (
      <section
        className="metagame-chart-section metagame-polarity metagame-polarity-section has-controls"
        aria-label="Metagame health and polarity"
      >
        <div className="metagame-chart-controls">{controls}</div>
        <p className="metagame-sideboarding-error">We couldn&apos;t load polarity data. {sideboardingError}.</p>
      </section>
    )
  }

  if (!polarityData || polarityData.rows.length === 0) return null

  const unavailableSideboardingError = sideboardingError && !sideboarding ? sideboardingError : null

  // Keep the row order identical to the main metagame chart: largest share first.
  const rows = [...polarityData.rows].sort((left, right) => right.percentage - left.percentage)
  const concentrationMaximum = Math.max(
    75,
    Math.ceil(Math.max(...rows.map(row => row.concentrationIndex)) / 25) * 25,
  )

  // Compute unified min and max across all three polarity columns (Overall, Game 1, and Games 2–3)
  const observedPolarities = rows.flatMap(row => [
    row.polarity,
    ...(row.polarityConfidenceInterval > 0
      ? [
          Math.max(0, row.polarity - row.polarityConfidenceInterval),
          row.polarity + row.polarityConfidenceInterval,
        ]
      : []),
    ...(row.gameOnePolarity !== null ? [row.gameOnePolarity] : []),
    ...(row.postboardPolarity !== null ? [row.postboardPolarity] : []),
  ])
  if (polarityData.overallPolarity > 0) observedPolarities.push(polarityData.overallPolarity)
  if (polarityData.gameOneMeanPolarity !== null && polarityData.gameOneMeanPolarity > 0) {
    observedPolarities.push(polarityData.gameOneMeanPolarity)
  }
  if (polarityData.postboardMeanPolarity !== null && polarityData.postboardMeanPolarity > 0) {
    observedPolarities.push(polarityData.postboardMeanPolarity)
  }

  const rawMin = Math.min(...observedPolarities, 0)
  const rawMax = Math.max(...observedPolarities, 1)
  const polarityMinimum = Math.max(0, Math.floor(rawMin / 5) * 5)
  const polarityMaximum = Math.max(
    polarityMinimum + 5,
    Math.ceil(rawMax / 5) * 5,
  )

  const polarityAxisStyle = (average: number) => ({
    '--polarity-axis-average-position': `${Math.min(100, Math.max(0, ((average - polarityMinimum) / (polarityMaximum - polarityMinimum)) * 100))}%`,
  }) as CSSProperties
  const polarityBaselineStyle = (average: number) => {
    const ratio = Math.min(1, Math.max(0, (average - polarityMinimum) / (polarityMaximum - polarityMinimum)))
    return {
      '--winrate-baseline': `${ratio * 100}%`,
      '--winrate-baseline-offset': `${0.4 - (0.8 * ratio)}rem`,
    } as CSSProperties
  }

  return (
    <section
      className="metagame-chart-section metagame-polarity metagame-polarity-section has-controls"
      aria-label="Metagame health and polarity"
    >
      <div className="metagame-chart-controls">
        {controls}
        <MetagameHealthKPIs data={polarityData} loading={loading} />
      </div>
      {unavailableSideboardingError && (
        <p className="metagame-sideboarding-error" role="alert">
          Game 1 and post-board polarity data is unavailable. {unavailableSideboardingError}.
        </p>
      )}

      <div
        ref={scrollRef}
        className="metagame-chart-scroll polarity-chart-scroll"
        onScroll={scheduleScrollEdgeSync}
      >
        <MetagameMobileLabelRail
          heading={<><MetagameAxisArrow direction="up" /> Top 16 Archetypes</>}
          labels={rows.map(row => ({ key: row.archetype, content: row.archetype }))}
        />
        <div
          className="metagame-chart polarity-metagame-chart"
          style={{
            '--metagame-columns': rows.length,
            '--polarity-concentration-width': `${(128 * concentrationMaximum) / 50}px`,
          } as CSSProperties}
        >
          <section className="polarity-label-panel" aria-label="Top 16 Archetypes">
            <header className="metagame-panel-header">
              <span><MetagameAxisArrow direction="up" /> Top 16 Archetypes</span>
            </header>
            {rows.map(row => <PolarityLabelRow key={row.archetype} row={row} />)}
            <footer className="metagame-axis" />
          </section>

          <section className="polarity-concentration-panel" aria-label="Format homogeneity share (%)">
            <header className="metagame-panel-header is-right">
              <span>Homogeneity (%) <MetagameAxisArrow direction="right" /></span>
            </header>
            {rows.map(row => (
              <PolarityConcentrationRow
                key={row.archetype}
                row={row}
                maximum={concentrationMaximum}
              />
            ))}
            <footer className="metagame-axis polarity-concentration-axis">
              <span style={{ left: '0%' }}>0</span>
              <span style={{ left: `${(25 / concentrationMaximum) * 100}%` }}>25</span>
              <span style={{ left: `${(50 / concentrationMaximum) * 100}%` }}>50</span>
            </footer>
          </section>

          <section className="metagame-winrate-panel polarity-value-panel" aria-label="Overall polarity">
            <span
              className="metagame-winrate-baseline"
              aria-hidden="true"
              style={polarityBaselineStyle(polarityData.overallPolarity)}
            />
            <header className="metagame-panel-header is-right">
              <span>Polarity (%) <MetagameAxisArrow direction="right" /></span>
            </header>
            {rows.map(row => (
              <PolarityValueRow
                key={row.archetype}
                row={row}
                minimum={polarityMinimum}
                maximum={polarityMaximum}
              />
            ))}
            <footer className="metagame-axis polarity-axis polarity-value-axis" style={polarityAxisStyle(polarityData.overallPolarity)}>
              <span>{formatAxisTick(polarityMinimum)}</span><span>{polarityData.overallPolarity.toFixed(1)} avg</span><span>{formatAxisTick(polarityMaximum)}</span>
            </footer>
          </section>

          <section className="metagame-winrate-panel polarity-difference-panel" aria-label="Game 1 pre-board polarity">
            <span
              className="metagame-winrate-baseline"
              aria-hidden="true"
              style={polarityBaselineStyle(polarityData.gameOneMeanPolarity ?? polarityData.overallPolarity)}
            />
            <header className="metagame-panel-header is-right">
              <span>Game 1 <MetagameAxisArrow direction="right" /></span>
            </header>
            {rows.map(row => (
              <PolaritySegmentRow
                key={row.archetype}
                row={row}
                value={row.gameOnePolarity}
                label="Game 1 Polarity"
                minimum={polarityMinimum}
                maximum={polarityMaximum}
              />
            ))}
            <footer className="metagame-axis polarity-axis" style={polarityAxisStyle(polarityData.gameOneMeanPolarity ?? polarityData.overallPolarity)}>
              <span>{formatAxisTick(polarityMinimum)}</span><span>{polarityData.gameOneMeanPolarity?.toFixed(1) ?? '—'} avg</span><span>{formatAxisTick(polarityMaximum)}</span>
            </footer>
          </section>

          <section className="metagame-winrate-panel polarity-difference-panel" aria-label="Games 2–3 post-board polarity">
            <span
              className="metagame-winrate-baseline"
              aria-hidden="true"
              style={polarityBaselineStyle(polarityData.postboardMeanPolarity ?? polarityData.overallPolarity)}
            />
            <header className="metagame-panel-header is-right">
              <span>Games 2–3 <MetagameAxisArrow direction="right" /></span>
            </header>
            {rows.map(row => (
              <PolaritySegmentRow
                key={row.archetype}
                row={row}
                value={row.postboardPolarity}
                label="Post-board Polarity"
                minimum={polarityMinimum}
                maximum={polarityMaximum}
              />
            ))}
            <footer className="metagame-axis polarity-axis" style={polarityAxisStyle(polarityData.postboardMeanPolarity ?? polarityData.overallPolarity)}>
              <span>{formatAxisTick(polarityMinimum)}</span><span>{polarityData.postboardMeanPolarity?.toFixed(1) ?? '—'} avg</span><span>{formatAxisTick(polarityMaximum)}</span>
            </footer>
          </section>
        </div>
      </div>
    </section>
  )
}
