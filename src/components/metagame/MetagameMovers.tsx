/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { getManaSymbolSvgPath, useCardMedia, useCardTooltipHover } from '@videreproject/ui'

import type { CardMover, MetagameMoversData } from '@/hooks/useMetagameMovers'
import { MetagameAxisArrow } from './MetagameAxisArrow'
import { MetagameChartSkeleton } from './MetagameChartSkeleton'
import { DifferenceBar, MetagameMoverChart } from './MetagameMoverChart'
import './MetagameInsights.css'

interface MetagameMoversProps {
  data: MetagameMoversData | null
  loading: boolean
  error: string | null
}

interface CardTrendsProps extends MetagameMoversProps {
  loading: boolean
  error: string | null
}

const formatPercentage = (value: number) => `${value.toFixed(1)}%`
const formatCopies = (value: number) => value.toFixed(1)
const formatAxisValue = (value: number) => Number.isInteger(value) ? `${value}` : value.toFixed(1)
const formatCopiesDelta = (value: number | undefined) => value === undefined
  ? 'Unavailable'
  : `${value > 0 ? '+' : ''}${value.toFixed(1)}`
function ManaCost({ costs }: { costs: string[] }) {
  if (costs.length === 0) {
    return <span className="metagame-card-mana-cost is-empty">—</span>
  }

  return (
    <span className="metagame-card-mana-cost" aria-label={`Mana cost ${costs.join(' or ')}`}>
      {costs.map((cost, costIndex) => {
        const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map(match => match[1])
        return (
          <span className="metagame-card-mana-cost-face" key={`${cost}-${costIndex}`}>
            {symbols.length > 0 ? symbols.map((symbol, symbolIndex) => {
              const path = getManaSymbolSvgPath(symbol)
              return path ? (
                <img
                  key={`${symbol}-${symbolIndex}`}
                  src={path}
                  alt=""
                  aria-hidden="true"
                />
              ) : (
                <span key={`${symbol}-${symbolIndex}`}>{`{${symbol}}`}</span>
              )
            }) : cost}
          </span>
        )
      })}
    </span>
  )
}

function CardMoverRow({ mover, shareMaximum, copiesMaximum }: {
  mover: CardMover
  shareMaximum: number
  copiesMaximum: number
}) {
  const cardTooltipHandlers = useCardTooltipHover({
    catalogId: mover.catalogId,
    name: mover.card,
  })

  return (
    <div className="metagame-mover-row metagame-card-mover-row">
      <div className="metagame-mover-main">
        <strong className="metagame-card-mover-name" {...cardTooltipHandlers}>{mover.card}</strong>
        <ManaCost costs={mover.manaCosts} />
      </div>
      <div className="metagame-card-mover-bar">
        <DifferenceBar
          value={mover.change}
          previousValue={mover.previousPercentage}
          currentValue={mover.currentPercentage}
          minimum={0}
          maximum={shareMaximum}
          label="Lists (%)"
          current={formatPercentage(mover.currentPercentage)}
          previous={formatPercentage(mover.previousPercentage)}
        />
      </div>
      <div className="metagame-card-mover-bar">
        <DifferenceBar
          value={mover.currentAverage - mover.previousAverage}
          previousValue={mover.previousAverage}
          currentValue={mover.currentAverage}
          minimum={0}
          maximum={copiesMaximum}
          label="Avg. copies"
          current={formatCopies(mover.currentAverage)}
          previous={formatCopies(mover.previousAverage)}
          formatDifference={formatCopiesDelta}
        />
      </div>
    </div>
  )
}

function CardMoverAxis({ maximum }: { maximum: number }) {
  return (
    <div className="metagame-card-mover-axis" aria-hidden="true">
      <span>0</span>
      <span>{formatAxisValue(maximum / 2)}</span>
      <span>{formatAxisValue(maximum)}</span>
    </div>
  )
}

function CardMoverList({ title, movers, shareMaximum, copiesMaximum }: {
  title: string
  movers: CardMover[]
  shareMaximum: number
  copiesMaximum: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollEdgeFrameRef = useRef<number | null>(null)
  const orderedMovers = [...movers].sort((left, right) => right.currentPercentage - left.currentPercentage)

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
    if (!element) return

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
      if (scrollEdgeFrameRef.current !== null) cancelAnimationFrame(scrollEdgeFrameRef.current)
      scrollEdgeFrameRef.current = null
    }
  }, [orderedMovers.length, scheduleScrollEdgeSync, syncScrollEdges])

  return (
    <div
      ref={scrollRef}
      className="metagame-mover-list metagame-card-mover-list"
      onScroll={syncScrollEdges}
    >
      <h3>
        <span className="metagame-mover-list-title">{title}</span>
        <span className="metagame-card-mover-metric-heading" aria-hidden="true">
          Lists (%) <MetagameAxisArrow direction="right" />
        </span>
        <span className="metagame-card-mover-metric-heading" aria-hidden="true">
          Avg. copies <MetagameAxisArrow direction="right" />
        </span>
      </h3>
      {orderedMovers.length > 0 ? orderedMovers.map(mover => (
        <CardMoverRow
          key={`${mover.zone}-${mover.card}`}
          mover={mover}
          shareMaximum={shareMaximum}
          copiesMaximum={copiesMaximum}
        />
      )) : (
        <p className="metagame-mover-empty">No meaningful movement in this period.</p>
      )}
      <div className="metagame-card-mover-axes">
        <span aria-hidden="true" />
        <CardMoverAxis maximum={shareMaximum} />
        <CardMoverAxis maximum={copiesMaximum} />
      </div>
    </div>
  )
}

function CardMoverSection({
  zone,
  movers,
}: {
  zone: 'mainboard' | 'sideboard'
  movers: CardMover[]
}) {
  const label = zone === 'mainboard' ? 'Mainboard' : 'Sideboard'
  const orderedMovers = [...movers].sort((left, right) => right.currentPercentage - left.currentPercentage)
  const shareMaximum = Math.max(
    10,
    Math.ceil(Math.max(
      ...orderedMovers.flatMap(mover => [mover.previousPercentage, mover.currentPercentage]),
      0,
    ) / 5) * 5,
  )
  const copiesMaximum = 4
  return (
    <section className="metagame-card-mover-section" aria-label={`${label} card trends`}>
      <CardMoverList
        title={label}
        movers={orderedMovers}
        shareMaximum={shareMaximum}
        copiesMaximum={copiesMaximum}
      />
    </section>
  )
}

function MoversLoading() {
  return (
    <section className="metagame-movers" aria-label="Loading metagame shifts" aria-busy="true">
      <div className="metagame-insight-heading">
        <div>
          <div className="metagame-mover-skeleton metagame-mover-skeleton-title" />
          <div className="metagame-mover-skeleton metagame-mover-skeleton-copy" />
        </div>
      </div>
      <MetagameChartSkeleton variant="movers" />
    </section>
  )
}

export function MetagameMovers({ data, loading, error }: MetagameMoversProps) {
  if (loading) return <MoversLoading />
  if (error && !data) {
    return (
      <section className="metagame-movers metagame-movers-error" aria-label="Metagame shifts">
        <h2>Metagame shifts</h2>
        <p>We couldn&apos;t compare this period with the previous one. {error}.</p>
      </section>
    )
  }
  if (!data) return null

  return (
    <div className="metagame-movers">
      <section className="metagame-insight-section metagame-deck-movers" aria-labelledby="metagame-shifts-heading">
        <div className="metagame-insight-heading">
          <div>
            <h2 id="metagame-shifts-heading">Metagame shifts</h2>
            <p>The biggest shifts in metagame share, winrate, and matchups between periods.</p>
          </div>
        </div>
        <MetagameMoverChart
          movers={data.topDeckMovers}
          columns={data.matchupColumns}
          changes={data.matchupChanges}
          shareMaximum={data.shareMaximum}
          winrateMinimum={data.winrateMinimum}
          winrateMaximum={data.winrateMaximum}
        />
      </section>
    </div>
  )
}

export function CardTrends({ data, loading, error }: CardTrendsProps) {
  const { preloadCardImages } = useCardMedia()

  useEffect(() => {
    if (!data) return

    const catalogIds = [...new Set(
      [...data.risingCards, ...data.fallingCards]
        .map(mover => mover.catalogId)
        .filter((catalogId): catalogId is number => catalogId != null && catalogId > 0),
    )]
    let timeoutId: number | undefined
    let idleCallbackId: number | undefined
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }
    const preload = () => preloadCardImages(catalogIds)

    if (idleWindow.requestIdleCallback) {
      idleCallbackId = idleWindow.requestIdleCallback(preload, { timeout: 4000 })
    } else {
      timeoutId = window.setTimeout(preload, 1500)
    }

    return () => {
      if (idleCallbackId !== undefined) idleWindow.cancelIdleCallback?.(idleCallbackId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [data, preloadCardImages])

  if (loading) {
    return (
      <section className="metagame-insight-section metagame-card-trends" aria-label="Loading card trends" aria-busy="true">
        <div className="metagame-insight-heading">
          <div>
            <div className="metagame-mover-skeleton metagame-mover-skeleton-title" />
            <div className="metagame-mover-skeleton metagame-mover-skeleton-copy" />
          </div>
        </div>
        <div className="metagame-card-mover-sections metagame-card-trends-skeleton">
          {['Mainboard', 'Sideboard'].map(title => (
            <div key={title} className="metagame-mover-list metagame-card-mover-list">
              <h3>
                <span className="metagame-mover-list-title"><span className="metagame-skeleton-surface metagame-skeleton-card-heading" /></span>
                <span className="metagame-card-mover-metric-heading"><span className="metagame-skeleton-surface metagame-skeleton-card-metric" /></span>
                <span className="metagame-card-mover-metric-heading"><span className="metagame-skeleton-surface metagame-skeleton-card-metric" /></span>
              </h3>
              {Array.from({ length: 10 }, (_, index) => (
                <div key={index} className="metagame-mover-row metagame-card-mover-row">
                  <div className="metagame-mover-main">
                    <span className="metagame-skeleton-surface metagame-skeleton-card-name" />
                    <span className="metagame-skeleton-surface metagame-skeleton-card-mana" />
                  </div>
                  <span className="metagame-skeleton-surface metagame-skeleton-card-bar" />
                  <span className="metagame-skeleton-surface metagame-skeleton-card-bar" />
                </div>
              ))}
              <div className="metagame-card-mover-axes" aria-hidden="true">
                <span />
                <span className="metagame-skeleton-surface metagame-skeleton-card-axis" />
                <span className="metagame-skeleton-surface metagame-skeleton-card-axis" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error && !data) {
    return (
      <section className="metagame-insight-section metagame-movers-error metagame-card-trends" aria-label="Card trends">
        <h2>Card trends</h2>
        <p>We couldn&apos;t compare card inclusion across periods. {error}.</p>
      </section>
    )
  }

  if (!data) return null

  return (
      <section className="metagame-insight-section metagame-card-trends" aria-labelledby="card-trends-heading">
        <div className="metagame-insight-heading">
          <div>
            <h2 id="card-trends-heading">Card trends</h2>
            <p>Card inclusion changes across the field, adjusted for metagame share.</p>
          </div>
          {/* <span>Share of lists (%)</span> */}
        </div>
        <div className="metagame-card-mover-sections">
            <CardMoverSection
              zone="mainboard"
              movers={[...data.risingCards, ...data.fallingCards].filter(mover => mover.zone === 'mainboard')}
            />
            <CardMoverSection
              zone="sideboard"
              movers={[...data.risingCards, ...data.fallingCards].filter(mover => mover.zone === 'sideboard')}
            />
        </div>
      </section>
  )
}
