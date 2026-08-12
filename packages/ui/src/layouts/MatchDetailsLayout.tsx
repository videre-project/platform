/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useState, type ComponentType, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Layers3,
  Pencil,
  Play,
  Radio,
  UserRound,
} from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'

import { cn } from '../lib/cn'
import { Badge } from '../primitives/Badge'
import { Button } from '../primitives/Button'
import { GameReviewPanel } from '../components/match/GameReviewPanel'
import { DeckManaSymbols, MatchDeckCard } from '../components/match/MatchDeckCard'
import type { MatchDetailsData, MatchDetailsGame } from '../types/match'

function MatchHeaderMeta({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string
  value: ReactNode
  icon: ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <span className={cn('inline-flex h-6 min-w-0 items-center gap-1.5 leading-none', className)}>
      <Icon className="h-3.5 w-3.5 shrink-0 translate-y-px text-muted-foreground" />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-xs font-semibold text-foreground">{value}</span>
    </span>
  )
}

function OpponentMetaValue({
  match,
  onArchetypeChange,
  pending = false,
  error,
}: {
  match: MatchDetailsData
  onArchetypeChange?: (archetype: string) => void | Promise<void>
  pending?: boolean
  error?: string | null
}) {
  const name = match.opponentName?.trim()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(match.opponentDeckArchetype ?? '')
  const [saving, setSaving] = useState(false)
  useEffect(() => setValue(match.opponentDeckArchetype ?? ''), [match.opponentDeckArchetype])
  const deckLabel = value.trim() || match.opponentDeckArchetype?.trim()
    || match.opponentDeckName?.trim()
    || 'Deck unknown'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!onArchetypeChange) return
    setSaving(true)
    try {
      await onArchetypeChange(value.trim())
      setIsEditing(false)
    } catch {
      // The host owns error reporting through the controlled error prop.
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="truncate">{name ? `vs ${name}` : 'Opponent unknown'}</span>
      <span className="text-muted-foreground/60">-</span>
      <Popover.Root open={isEditing} onOpenChange={setIsEditing}>
        <Popover.Trigger asChild>
          <button type="button" disabled={!onArchetypeChange} className="group/arch inline-flex max-w-full items-center gap-2 text-muted-foreground hover:text-foreground disabled:pointer-events-none" title={onArchetypeChange ? 'Edit opponent archetype' : undefined}>
            <span className="truncate">{deckLabel}</span>
            {onArchetypeChange ? <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-colors group-hover/arch:text-foreground" /> : null}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content aria-label="Edit opponent archetype" align="start" sideOffset={4} className="z-50 w-64 rounded-md border border-sidebar-border/70 bg-popover p-3 font-sans text-popover-foreground shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="text-xs font-medium text-muted-foreground">Edit Opponent Archetype</div>
              <div className="flex items-center gap-1.5">
                <input value={value} onChange={event => setValue(event.target.value)} autoFocus className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Dimir Murktide" />
                <Button size="sm" type="submit" disabled={pending || saving} className="h-7 px-2.5 text-xs">Save</Button>
              </div>
              {error ? <div className="text-[11px] text-destructive">{error}</div> : null}
            </form>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <DeckManaSymbols colors={match.opponentDeckColors} />
    </span>
  )
}

function getResultVariant(result?: string | null) {
  if (result?.toLocaleLowerCase() === 'win') return 'default' as const
  if (result?.toLocaleLowerCase() === 'loss') return 'destructive' as const
  return 'secondary' as const
}

function MatchTitleBar({
  match,
  selectedGame,
  onBack,
  onWatchLive,
  liveUpdateCount = 0,
}: {
  match: MatchDetailsData
  selectedGame?: MatchDetailsGame
  onBack?: () => void
  onWatchLive?: (game: MatchDetailsGame) => void
  liveUpdateCount?: number
}) {
  const isInProgress = match.isActive || match.result === 'In Progress'
  const resultVariant = isInProgress ? 'secondary' : getResultVariant(match.result)
  const resultLabel = isInProgress ? 'In Progress' : match.record || match.result || 'Match'

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {onBack ? (
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 h-8 w-8 shrink-0" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden="true">
            <ArrowLeft className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 pt-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate text-xl font-semibold leading-7 tracking-tight">
              {match.eventName || 'Match'}
            </h1>
            <Badge variant={resultVariant} className="rounded-md capitalize">
              {resultLabel}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {liveUpdateCount > 0 ? (
          <Badge variant="success" className="rounded-md text-xs">
            +{liveUpdateCount} live
          </Badge>
        ) : null}
        {onWatchLive && selectedGame ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 border-sidebar-border/60"
            onClick={() => onWatchLive(selectedGame)}
          >
            <Radio className="h-3.5 w-3.5 translate-y-px" />
            Watch Live
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export interface MatchDetailsLayoutProps {
  match: MatchDetailsData
  initialGameId?: string
  onBack?: () => void
  onWatchLive?: (game: MatchDetailsGame) => void
  onOpenDeck?: () => void
  onGameLog?: (game: MatchDetailsGame) => void
  onReplay?: (game: MatchDetailsGame) => void
  onGameChange?: (game: MatchDetailsGame) => void
  onOpponentArchetypeChange?: (archetype: string) => void | Promise<void>
  opponentArchetypePending?: boolean
  opponentArchetypeError?: string | null
  liveUpdateCount?: number
  className?: string
}

/** Match Details presentation, with routing, fetching, and mutations supplied by the host. */
export function MatchDetailsLayout({
  match,
  initialGameId,
  onBack,
  onWatchLive,
  onOpenDeck,
  onGameLog,
  onReplay,
  onGameChange,
  onOpponentArchetypeChange,
  opponentArchetypePending,
  opponentArchetypeError,
  liveUpdateCount,
  className,
}: MatchDetailsLayoutProps) {
  const initialIndex = Math.max(0, match.games.findIndex(game => game.id === initialGameId))
  const [selectedGameId, setSelectedGameId] = useState(match.games[initialIndex]?.id ?? null)
  const selectedGame = match.games.find(game => game.id === selectedGameId) ?? match.games[0]

  const chooseGame = (game: MatchDetailsGame) => {
    setSelectedGameId(game.id)
    onGameChange?.(game)
  }

  return (
    <div className={cn('videre-ui flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden bg-background px-4 pb-4 pt-1 font-sans text-foreground', className)} data-ui-layout="match-details">
      <MatchTitleBar match={match} selectedGame={selectedGame} onBack={onBack} onWatchLive={onWatchLive} liveUpdateCount={liveUpdateCount} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-md border border-sidebar-border/60 bg-card px-3 py-2">
        <MatchHeaderMeta label="Format" value={match.format || '-'} icon={Layers3} />
        <MatchHeaderMeta
          label="Opponent"
          value={<OpponentMetaValue match={match} onArchetypeChange={onOpponentArchetypeChange} pending={opponentArchetypePending} error={opponentArchetypeError} />}
          icon={UserRound}
          className="max-w-full sm:max-w-[28rem]"
        />
        <MatchHeaderMeta label="Date" value={match.date || '-'} icon={Calendar} />
        <MatchHeaderMeta label="Duration" value={match.duration || '-'} icon={Clock} />
      </div>

      <section className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-3 overflow-visible">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden">
            <h2 className="text-sm font-medium text-foreground">Games ({match.games.length})</h2>
            {match.games.map(game => {
              const selected = selectedGame?.id === game.id
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => chooseGame(game)}
                  className={cn(
                    'block w-full rounded-md border border-sidebar-border/60 bg-card px-3 py-2.5 text-left transition-colors hover:bg-muted/35',
                    selected && 'border-sidebar-accent/70 bg-muted/45',
                  )}
                  aria-pressed={selected}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/40 text-sm font-semibold text-foreground',
                      selected && 'bg-sidebar-accent/40',
                    )}>
                      {game.gameNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="font-medium">Game {game.gameNumber}</span>
                        <Badge variant={getResultVariant(game.result)} className="rounded-md capitalize">
                          {game.result || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>On the {game.playDraw || '-'}</span>
                        <span>{game.duration || '-'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <MatchDeckCard
            deckName={match.deckName}
            deckArchetype={match.deckArchetype}
            deckColors={match.deckColors}
            backgroundArtUrl={match.deckBackgroundArtUrl}
            previewCards={match.deckPreviewCards}
            onOpen={onOpenDeck}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-sidebar-border/60 bg-card">
          {selectedGame ? (
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <GameReviewPanel
                openingHandCards={selectedGame.openingHand.map((card, index) => ({
                  key: `opening:${card.catalogId}:${index}`,
                  name: card.name,
                  catalogId: card.catalogId,
                  bottomed: card.bottomed ?? false,
                }))}
                sideboardingDiff={{
                  in: selectedGame.sideboarding.in.map((card, index) => ({
                    key: `in:${card.catalogId}:${index}`,
                    name: card.name,
                    catalogId: card.catalogId,
                    quantity: card.quantity ?? 1,
                  })),
                  out: selectedGame.sideboarding.out.map((card, index) => ({
                    key: `out:${card.catalogId}:${index}`,
                    name: card.name,
                    catalogId: card.catalogId,
                    quantity: card.quantity ?? 1,
                  })),
                  emptyMessage: 'No sideboard changes.',
                }}
                endContent={onGameLog || onReplay ? (
                  <>
                    {onGameLog ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 gap-1.5 border-sidebar-border/60 px-2.5 text-xs"
                        onClick={() => onGameLog(selectedGame)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Game Log
                      </Button>
                    ) : null}
                    {onReplay ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 gap-1.5 border-sidebar-border/60 px-2.5 text-xs"
                        onClick={() => onReplay(selectedGame)}
                      >
                        <Play className="h-3.5 w-3.5 translate-y-px" />
                        Replay
                      </Button>
                    ) : null}
                  </>
                ) : null}
              />
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center px-4 py-8 text-sm text-muted-foreground">
              No games recorded for this match.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
