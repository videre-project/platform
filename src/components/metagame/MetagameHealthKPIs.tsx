/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Tooltip, TooltipContent, TooltipTrigger } from '@videreproject/ui'
import type { MetagamePolarityData } from '@/utils/polarity'
import './MetagameInsights.css'

interface MetagameHealthKPIsProps {
  data: MetagamePolarityData | null
  loading?: boolean
}

export function MetagameHealthKPIs({ data, loading }: MetagameHealthKPIsProps) {
  if (loading || !data) {
    return (
      <div className="metagame-health-kpis is-loading" aria-hidden="true">
        <div className="metagame-health-kpi-item is-skeleton" />
        <div className="metagame-health-kpi-item is-skeleton" />
        <div className="metagame-health-kpi-item is-skeleton" />
      </div>
    )
  }

  const polarity = data.overallPolarity
  const effectiveDecks = data.effectiveDecks
  const archetypeCount = data.archetypeCount

  const g1 = data.gameOneMeanPolarity
  const g23 = data.postboardMeanPolarity
  const hasSideboardData = g1 !== null && g23 !== null && Number.isFinite(g1) && Number.isFinite(g23)
  const sideboardDelta = hasSideboardData ? g23 - g1 : null

  return (
    <div className="metagame-health-kpis" role="region" aria-label="Format health KPIs">
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <div className="metagame-health-kpi-item" tabIndex={0} role="group" aria-label={`Format Polarity: ${polarity.toFixed(1)}%`}>
            <span className="metagame-health-kpi-label">Format Polarity</span>
            <strong className="metagame-health-kpi-value">{polarity.toFixed(1)}%</strong>
          </div>
        </TooltipTrigger>
        <TooltipContent className="metagame-tooltip-content">
          <strong className="metagame-tooltip-heading">Format Polarity (P_meta)</strong>
          <p className="metagame-health-tooltip-text">
            Weighted average matchup disparity across non-mirror pairings. Low values (&lt;12%) indicate balanced, uniform matchups; higher values (&ge;18%) indicate sharp rock-paper-scissors dynamics.
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <div className="metagame-health-kpi-item" tabIndex={0} role="group" aria-label={`Effective Decks: ${effectiveDecks.toFixed(1)} of ${archetypeCount}`}>
            <span className="metagame-health-kpi-label">Effective Decks</span>
            <strong className="metagame-health-kpi-value">
              {effectiveDecks.toFixed(1)}
              <span className="metagame-health-kpi-sub">/{archetypeCount}</span>
            </strong>
          </div>
        </TooltipTrigger>
        <TooltipContent className="metagame-tooltip-content">
          <strong className="metagame-tooltip-heading">Effective Decks (N_eff)</strong>
          <p className="metagame-health-tooltip-text">
            Inverse Simpson concentration index measuring how many equally-represented archetypes the format functionally behaves as ({data.effectiveDiversityRatio.toFixed(0)}% diversity capacity).
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <div className="metagame-health-kpi-item" tabIndex={0} role="group" aria-label={`Sideboard Δ: ${sideboardDelta !== null ? `${sideboardDelta > 0 ? '+' : ''}${sideboardDelta.toFixed(1)}%` : 'Unavailable'}`}>
            <span className="metagame-health-kpi-label">Sideboard &Delta;</span>
            <strong className="metagame-health-kpi-value">
              {sideboardDelta !== null ? `${sideboardDelta > 0 ? '+' : ''}${sideboardDelta.toFixed(1)}%` : '—'}
            </strong>
          </div>
        </TooltipTrigger>
        <TooltipContent className="metagame-tooltip-content">
          <strong className="metagame-tooltip-heading">Sideboard &Delta; (&Delta;P)</strong>
          <p className="metagame-health-tooltip-text">
            Shift in format polarity from Game 1 to Games 2&ndash;3. Negative values demonstrate that sideboard interaction compresses matchup disparities.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
