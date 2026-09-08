/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { getManaSymbolSvgPath } from '@videreproject/ui'
import { cardImageUrl, useCardImage } from './use-card-image'
import './TournamentSnapshot.css'

export type CardInput = string | { name: string; set?: string; id?: number }
export type ColorInput = string[] | string[][]

export interface ArchetypeSection {
  deck: string
  colors?: ColorInput
  cards?: CardInput[]
}

export interface TournamentSnapshotProps {
  event?: string
  date?: string
  title?: string
  deck?: string
  colors?: ColorInput
  cards?: CardInput[]
  archetypes?: ArchetypeSection[]
  metaShare?: string
  winRate?: string
  nEff?: number
  pMeta?: number
}

function CardBarItem({ item }: { item: CardInput }) {
  const cardName = typeof item === 'string' ? item : item.name
  const setCode = typeof item === 'string' ? undefined : item.set
  const catalogId = typeof item === 'string' ? undefined : item.id

  const record = useCardImage(cardName, setCode, catalogId)
  const cdnImageUrl = cardImageUrl(record)

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <div
          className="tournament-snapshot-card-bar"
          tabIndex={0}
          role="button"
          aria-label={`View full card: ${cardName}${setCode ? ` (${setCode})` : ''}`}
        >
          {cdnImageUrl ? (
            <img
              src={cdnImageUrl}
              alt={cardName}
              className="snapshot-cropped-card-img"
              loading="lazy"
            />
          ) : (
            <div className="snapshot-card-skeleton" title={cardName}>
              <span className="snapshot-card-skeleton-name">{cardName}</span>
            </div>
          )}
        </div>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="snapshot-card-full-tooltip"
          side="top"
          align="center"
          sideOffset={8}
        >
          {cdnImageUrl ? (
            <img
              src={cdnImageUrl}
              alt={cardName}
              className="snapshot-card-full-img"
              loading="eager"
            />
          ) : (
            <div className="snapshot-card-tooltip-fallback">
              <span>{cardName}</span>
            </div>
          )}
          <TooltipPrimitive.Arrow
            className="snapshot-card-tooltip-arrow"
            width={10}
            height={5}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

function ManaGroupSymbols({ colors, className }: { colors?: ColorInput; className?: string }) {
  if (!colors || colors.length === 0) return null

  const isMultiGroup = Array.isArray(colors[0])

  if (isMultiGroup) {
    const groups = colors as string[][]
    return (
      <div className={`tournament-snapshot-mana-symbols ${className || ''}`} aria-label="Archetype color variants">
        {groups.map((group, gIndex) => (
          <React.Fragment key={`mana-group-${gIndex}`}>
            {gIndex > 0 && <span className="snapshot-mana-group-slash">/</span>}
            <span className="snapshot-mana-subgroup">
              {group.map((color, cIndex) => {
                const path = getManaSymbolSvgPath(color)
                return path ? (
                  <img
                    key={`${color}-${cIndex}`}
                    src={path}
                    alt={color}
                    className="snapshot-mana-symbol-icon"
                  />
                ) : null
              })}
            </span>
          </React.Fragment>
        ))}
      </div>
    )
  }

  const flat = colors as string[]
  return (
    <div className={`tournament-snapshot-mana-symbols ${className || ''}`} aria-label={`Colors: ${flat.join(', ')}`}>
      <span className="snapshot-mana-subgroup">
        {flat.map((color, index) => {
          const path = getManaSymbolSvgPath(color)
          return path ? (
            <img
              key={`${color}-${index}`}
              src={path}
              alt={color}
              className="snapshot-mana-symbol-icon"
            />
          ) : null
        })}
      </span>
    </div>
  )
}

function ArchetypeCardRow({
  deck,
  colors,
  cards = [],
}: {
  deck: string
  colors?: ColorInput
  cards?: CardInput[]
}) {
  return (
    <div className="tournament-snapshot-archetype-section">
      <div className="tournament-snapshot-archetype-row-header">
        <ManaGroupSymbols colors={colors} />
        <h4 className="tournament-snapshot-deck-title">{deck}</h4>
      </div>

      {cards.length > 0 && (
        <TooltipPrimitive.Provider delayDuration={150}>
          <div className="tournament-snapshot-card-bars" aria-label={`Key cards for ${deck}`}>
            {cards.map((item, index) => {
              const cardName = typeof item === 'string' ? item : item.name
              return <CardBarItem key={`${cardName}-${index}`} item={item} />
            })}
          </div>
        </TooltipPrimitive.Provider>
      )}
    </div>
  )
}

export function TournamentSnapshot({
  event,
  date,
  title,
  deck,
  colors,
  cards = [],
  archetypes,
  metaShare,
  winRate,
  nEff,
  pMeta,
}: TournamentSnapshotProps) {
  const sections: ArchetypeSection[] =
    archetypes && archetypes.length > 0
      ? archetypes
      : deck
      ? [{ deck, colors, cards }]
      : []

  const isMulti = sections.length > 1
  const hasMetrics =
    metaShare !== undefined &&
    winRate !== undefined &&
    nEff !== undefined &&
    pMeta !== undefined
  const hasHeader = Boolean(title || event || date || (!isMulti && sections[0]))

  const metaPercent = (() => {
    const parsed = parseFloat((metaShare ?? '').replace('%', ''))
    return isNaN(parsed) ? 0 : Math.min(100, Math.max(0, parsed))
  })()

  const winPercent = (() => {
    const parsed = parseFloat((winRate ?? '').replace('%', ''))
    return isNaN(parsed) ? 50 : Math.min(100, Math.max(0, parsed))
  })()
  const lossPercent = 100 - winPercent
  const nEffPercent = Math.min(100, Math.max(0, ((nEff ?? 0) / 16) * 100))
  const pMetaPercent = Math.min(100, Math.max(0, ((pMeta ?? 0) / 40) * 100))

  return (
    <div
      className={`tournament-snapshot-card ${isMulti ? 'snapshot-card-multi' : ''} ${
        hasMetrics ? '' : 'snapshot-card-without-metrics'
      }`}
    >
      {/* Top Event Title Bar */}
      {hasHeader && (
        <div className="tournament-snapshot-header">
          {!isMulti && sections[0] ? (
            <div className="tournament-snapshot-archetype-wrap">
              <ManaGroupSymbols colors={sections[0].colors} />
              <h4 className="tournament-snapshot-deck-title">{title || sections[0].deck}</h4>
            </div>
          ) : (
            <div className="tournament-snapshot-archetype-wrap">
              <h4 className="tournament-snapshot-deck-title">
                {title || 'Post-B&R Metagame'}
              </h4>
            </div>
          )}

          {(event || date) && (
            <div className="tournament-snapshot-event-meta">
              {event && <span className="tournament-snapshot-event-name">{event}</span>}
              {date && (
                <span className="tournament-snapshot-event-date">
                  {event ? `(${date})` : date}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Archetype Row(s) */}
      {!isMulti && sections[0]?.cards && sections[0].cards.length > 0 ? (
        <TooltipPrimitive.Provider delayDuration={150}>
          <div className="tournament-snapshot-card-bars" aria-label="Archetype card crops">
            {sections[0].cards.map((item, index) => {
              const cardName = typeof item === 'string' ? item : item.name
              return <CardBarItem key={`${cardName}-${index}`} item={item} />
            })}
          </div>
        </TooltipPrimitive.Provider>
      ) : isMulti ? (
        <div className="tournament-snapshot-multi-sections">
          {sections.map((section, sIndex) => (
            <ArchetypeCardRow
              key={`${section.deck}-${sIndex}`}
              deck={section.deck}
              colors={section.colors}
              cards={section.cards}
            />
          ))}
        </div>
      ) : null}

      {/* Row 3: 4 Metrics with Bar Separator */}
      {metaShare !== undefined &&
        winRate !== undefined &&
        nEff !== undefined &&
        pMeta !== undefined && (
        <div className="tournament-snapshot-metrics-container">
        {/* Left Pair: Micro Archetype Performance */}
        <div className="tournament-snapshot-metric-group">
          <div className="tournament-snapshot-metric">
            <span className="snapshot-metric-label">Metagame %</span>
            <span className="snapshot-metric-value">{metaShare}</span>
            <div
              className="snapshot-meta-bar-track"
              role="img"
              aria-label={`${metaShare} of tournament metagame with 50% baseline`}
              title={`${metaShare} field share`}
            >
              <div
                className="snapshot-meta-bar-fill"
                style={{ width: `${metaPercent}%` }}
              />
              <div className="snapshot-meta-bar-midline" aria-hidden="true" />
            </div>
          </div>
          <div className="tournament-snapshot-metric">
            <span className="snapshot-metric-label">Non-Mirror Winrate %</span>
            <span className="snapshot-metric-value">{winRate}</span>
            <div
              className="snapshot-winrate-bar-track"
              role="img"
              aria-label={`${winRate} win rate with 50% baseline`}
              title={`${winRate} non-mirror win rate`}
            >
              <div
                className="snapshot-winrate-bar-win"
                style={{ width: `${winPercent}%` }}
              />
              <div
                className="snapshot-winrate-bar-loss"
                style={{ width: `${lossPercent}%` }}
              />
              <div className="snapshot-winrate-bar-midline" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* Center Vertical Separator Bar */}
        <div className="tournament-snapshot-metric-divider" aria-hidden="true" />

        {/* Right Pair: Macro Format Environment */}
        <div className="tournament-snapshot-metric-group">
          <div className="tournament-snapshot-metric">
            <span className="snapshot-metric-label">
              Field Diversity (<span className="snapshot-math-sym"><i>N</i><sub>eff</sub></span>)
            </span>
            <span className="snapshot-metric-value">
              {nEff.toFixed(1)} <span className="snapshot-metric-denominator">/ 16</span>
            </span>
            <div
              className="snapshot-neff-bar-track"
              role="img"
              aria-label={`Field diversity ${nEff.toFixed(1)} out of 16`}
              title={`Field diversity ${nEff.toFixed(1)} / 16 (10.0 benchmark notch)`}
            >
              <div
                className="snapshot-neff-bar-fill"
                style={{ width: `${nEffPercent}%` }}
              />
              <div className="snapshot-neff-bar-notch" aria-hidden="true" />
            </div>
          </div>
          <div className="tournament-snapshot-metric">
            <span className="snapshot-metric-label">
              Matchup Polarity (<span className="snapshot-math-sym"><i>P</i><sub>meta</sub></span>)
            </span>
            <span className="snapshot-metric-value">{pMeta.toFixed(1)}%</span>
            <div
              className="snapshot-pmeta-bar-track"
              role="img"
              aria-label={`Matchup polarity ${pMeta.toFixed(1)}%`}
              title={`Matchup polarity ${pMeta.toFixed(1)}% (16% threshold notch)`}
            >
              <div
                className="snapshot-pmeta-bar-fill"
                style={{ width: `${pMetaPercent}%` }}
              />
              <div className="snapshot-pmeta-bar-notch" aria-hidden="true" />
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
