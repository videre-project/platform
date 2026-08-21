/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { MetagameData } from '@/hooks/useMetagame'
import type { SideboardingData } from '@/hooks/useSideboarding'
import { MetagameChartSkeleton } from './MetagameChartSkeleton'
import { MetagameMoverChart } from './MetagameMoverChart'
import './MetagameInsights.css'

interface SideboardingPerformanceProps {
  data: SideboardingData | null
  metagame: MetagameData | null
  loading: boolean
  error: string | null
}

const SIDEBOARDING_DESCRIPTION = 'Compare pre-board and post-board performance across the top 16 archetypes.'

function SideboardingLoading() {
  return (
    <section className="metagame-insight-section metagame-sideboarding" aria-label="Loading sideboarding performance" aria-busy="true">
      <div className="metagame-insight-heading">
        <div>
          <div className="metagame-mover-skeleton metagame-mover-skeleton-title" />
          <div className="metagame-mover-skeleton metagame-mover-skeleton-copy" />
        </div>
      </div>
      <MetagameChartSkeleton variant="sideboarding" />
    </section>
  )
}

export function SideboardingPerformance({ data, metagame, loading, error }: SideboardingPerformanceProps) {
  if (loading) return <SideboardingLoading />

  if (error && !data) {
    return (
      <section className="metagame-insight-section metagame-sideboarding" aria-labelledby="sideboarding-heading">
        <div className="metagame-insight-heading">
          <div>
            <h2 id="sideboarding-heading">Sideboarding performance</h2>
            <p>{SIDEBOARDING_DESCRIPTION}</p>
          </div>
        </div>
        <p className="metagame-sideboarding-error">We couldn&apos;t load sideboarding data. {error}.</p>
      </section>
    )
  }

  if (!data) return null

  const rowsByArchetype = new Map(data.rows.map(row => [row.archetype, row]))
  const archetypeOrder = metagame?.archetypes ?? data.rows
  const metagameRank = new Map(archetypeOrder.map((archetype, index) => [archetype.archetype, index]))
  const rankedRows = archetypeOrder
    .slice(0, 16)
    .map(archetype => rowsByArchetype.get(archetype.archetype))
    .filter((row): row is NonNullable<typeof row> => row !== undefined && row.postboard !== null)
    .sort((left, right) => {
      const leftDelta = left.postboard!.winrate - left.gameOne.winrate
      const rightDelta = right.postboard!.winrate - right.gameOne.winrate
      return rightDelta - leftDelta || left.archetype.localeCompare(right.archetype)
    })
  const selectedRows = rankedRows.length <= 10
    ? rankedRows
    : [...rankedRows.slice(0, 5), ...rankedRows.slice(-5)]
  const rows = [...selectedRows].sort((left, right) => (
    (metagameRank.get(left.archetype) ?? Number.MAX_SAFE_INTEGER) -
    (metagameRank.get(right.archetype) ?? Number.MAX_SAFE_INTEGER)
  ))
  const columns = (metagame?.archetypes ?? [])
    .slice(0, 16)
    .map(archetype => archetype.archetype)

  return (
    <section className="metagame-insight-section metagame-sideboarding" aria-labelledby="sideboarding-heading">
      <div className="metagame-insight-heading">
        <div>
          <h2 id="sideboarding-heading">Sideboarding performance</h2>
          <p>{SIDEBOARDING_DESCRIPTION}</p>
        </div>
      </div>
      <MetagameMoverChart
        mode="sideboarding"
        rows={rows}
        columns={columns}
        matchups={data.matchups}
      />
    </section>
  )
}
