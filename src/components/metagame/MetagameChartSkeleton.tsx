/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { CSSProperties, ReactNode } from 'react'
import { MetagameMobileLabelRail } from './MetagameMobileLabelRail'

type MetagameChartSkeletonVariant = 'main' | 'movers' | 'sideboarding'

interface MetagameChartSkeletonProps {
  variant: MetagameChartSkeletonVariant
  controls?: ReactNode
}

const COLUMN_COUNT = 16

function SkeletonSurface({ className = '' }: { className?: string }) {
  return <span className={`metagame-skeleton-surface ${className}`} aria-hidden="true" />
}

function SkeletonRows({ count }: { count: number }) {
  return <>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="metagame-chart-row metagame-share-row">
        <SkeletonSurface className="metagame-skeleton-archetype" />
        <SkeletonSurface className="metagame-skeleton-bar" />
      </div>
    ))}
    <footer className="metagame-axis" aria-hidden="true" />
  </>
}

function SkeletonWinrateRows({ count }: { count: number }) {
  return <>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="metagame-chart-row metagame-winrate-row">
        <SkeletonSurface className="metagame-skeleton-bar" />
      </div>
    ))}
    <footer className="metagame-axis" aria-hidden="true" />
  </>
}

function SkeletonMatrix({ count }: { count: number }) {
  return (
    <section className="metagame-matrix-panel" aria-hidden="true">
      <div className="metagame-matrix-header-scroll">
        <header className="metagame-matrix-header">
          {Array.from({ length: COLUMN_COUNT }, (_, index) => (
            <span key={index}>
              <SkeletonSurface className="metagame-skeleton-matrix-label" />
            </span>
          ))}
        </header>
      </div>
      <div className="metagame-matrix-viewport">
        <div className="metagame-matrix-scroll">
          <div className="metagame-matrix-content">
            <div className="metagame-matrix-grid">
              {Array.from({ length: count * COLUMN_COUNT }, (_, index) => (
                <SkeletonSurface key={index} className="metagame-skeleton-matrix-cell" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <footer className="metagame-matrix-note">
        <SkeletonSurface className="metagame-skeleton-note" />
      </footer>
    </section>
  )
}

export function MetagameChartSkeleton({ variant, controls }: MetagameChartSkeletonProps) {
  const rowCount = variant === 'main' ? COLUMN_COUNT : 10
  const isMain = variant === 'main'
  const chartClass = [
    'metagame-chart',
    !isMain && 'metagame-mover-chart',
    'metagame-chart-skeleton',
  ].filter(Boolean).join(' ')

  return (
    <section
      className={`metagame-chart-section metagame-chart-skeleton-section is-${variant}`}
      aria-label={isMain ? 'Loading metagame chart' : `Loading ${variant} chart`}
      aria-busy="true"
    >
      {isMain && (
        <div className="metagame-chart-titlebar" aria-hidden="true">
          <SkeletonSurface className="metagame-skeleton-title" />
          <SkeletonSurface className="metagame-skeleton-subtitle" />
        </div>
      )}
      {controls && <div className="metagame-chart-controls">{controls}</div>}
      <div className="metagame-chart-scroll">
        <MetagameMobileLabelRail
          heading={<SkeletonSurface className="metagame-skeleton-header-label" />}
          labels={Array.from({ length: rowCount }, (_, index) => ({
            key: String(index),
            content: <SkeletonSurface className="metagame-skeleton-archetype" />,
          }))}
        />
        <div
          className={chartClass}
          style={{ '--metagame-columns': COLUMN_COUNT } as CSSProperties}
        >
          <section className="metagame-share-panel" aria-hidden="true">
            <header className="metagame-panel-header">
              <SkeletonSurface className="metagame-skeleton-header-label" />
              <SkeletonSurface className="metagame-skeleton-header-label" />
            </header>
            <SkeletonRows count={rowCount} />
          </section>
          <section className="metagame-winrate-panel" aria-hidden="true">
            <header className="metagame-panel-header is-right">
              <SkeletonSurface className="metagame-skeleton-header-label" />
            </header>
            <SkeletonWinrateRows count={rowCount} />
          </section>
          <SkeletonMatrix count={rowCount} />
        </div>
      </div>
    </section>
  )
}
