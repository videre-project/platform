/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState, type ComponentType, type ReactNode } from 'react'
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

import { cn } from '../lib/cn'
import { Badge } from '../primitives/Badge'
import { Button } from '../primitives/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/Table'
import { GameReviewPanel } from '../components/match/GameReviewPanel'
import { MatchDeckCard } from '../components/match/MatchDeckCard'
import { DeckManaSymbols } from '../components/cards/DeckManaSymbols'
import { OpponentArchetypePicker, type OpponentArchetypePickerProps } from '../components/match/OpponentArchetypePicker'
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

function OpponentMetaValue({ match, onArchetypeChange, pending = false, error, loadContext }: {
  match: MatchDetailsData
  onArchetypeChange?: (archetype: string, colors: string[] | null) => void | Promise<void>
  pending?: boolean
  error?: string | null
  loadContext?: OpponentArchetypePickerProps['loadContext']
}) {
  const name = match.opponentName?.trim()
  const deckLabel = match.opponentDeckArchetype?.trim() || match.opponentDeckName?.trim() || 'Deck unknown'
  const trigger = <button type="button" disabled={!onArchetypeChange || pending}
    className="group/arch inline-flex max-w-full items-center gap-2 text-muted-foreground hover:text-foreground disabled:pointer-events-none"
    aria-label="Edit opponent archetype">
    <span className="truncate">{deckLabel}</span>
    <DeckManaSymbols colors={match.opponentDeckColors} className="shrink-0" />
    {onArchetypeChange && <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-colors group-hover/arch:text-foreground" />}
  </button>
  return <span className="inline-flex min-w-0 items-center gap-1.5">
    <span className="truncate">{name ? `vs ${name}` : 'Opponent unknown'}</span>
    <span className="text-muted-foreground/60">-</span>
    {onArchetypeChange ? <OpponentArchetypePicker value={match.opponentDeckArchetype ?? null} colors={match.opponentDeckColors}
      error={error} loadContext={loadContext} onChange={onArchetypeChange}>{trigger}</OpponentArchetypePicker> : trigger}
  </span>
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
  onOpponentArchetypeChange?: (archetype: string, colors: string[] | null) => void | Promise<void>
  loadOpponentArchetypeContext?: OpponentArchetypePickerProps['loadContext']
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
  loadOpponentArchetypeContext,
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
          value={<OpponentMetaValue match={match} onArchetypeChange={onOpponentArchetypeChange} pending={opponentArchetypePending} error={opponentArchetypeError} loadContext={loadOpponentArchetypeContext} />}
          icon={UserRound}
          className="max-w-full sm:max-w-[28rem]"
        />
        <MatchHeaderMeta label="Date" value={match.date || '-'} icon={Calendar} />
        <MatchHeaderMeta label="Duration" value={match.duration || '-'} icon={Clock} />
      </div>

      {/* Exclude the run summary's 4.5rem caret and match-number gutter. */}
      <section className="grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto xl:grid-cols-[23.5rem_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)_auto] xl:content-normal xl:overflow-hidden">
        <Table aria-label="Games" scrollLabel="Scroll games" className="table-fixed" wrapperClassName="max-h-96 min-h-0 overflow-auto xl:max-h-none">
          <colgroup><col /><col className="w-28" /><col className="w-20" /></colgroup>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-3 text-xs">Games</TableHead>
              <TableHead className="text-xs">Result</TableHead>
              <TableHead className="pr-3 text-right text-xs">Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {match.games.map(game => (
              <TableRow key={game.id} data-state={selectedGame?.id === game.id ? 'selected' : undefined}
                className="cursor-pointer" onClick={() => chooseGame(game)}>
                <TableCell className="pl-3">
                  <button type="button" aria-label={`Game ${game.gameNumber}`} aria-pressed={selectedGame?.id === game.id}
                    className="block w-full rounded text-left outline-none focus-visible:ring-1 focus-visible:ring-ring">
                    <span className="block font-medium">Game {game.gameNumber}</span>
                    <span className="mt-0.5 inline-flex whitespace-nowrap text-xs text-muted-foreground">
                      {game.playDraw === 'Play' || game.playDraw === 'Draw' ? `On the ${game.playDraw.toLowerCase()}` : '—'}
                    </span>
                  </button>
                </TableCell>
                <TableCell><Badge variant={getResultVariant(game.result)} className="whitespace-nowrap rounded-md capitalize">{game.result || 'Unknown'}</Badge></TableCell>
                <TableCell className="pr-3 text-right text-xs tabular-nums text-muted-foreground">{game.duration || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex h-[36rem] min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-sidebar-border/60 bg-card xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:h-auto">
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
        <div className="min-w-0 shrink-0 xl:col-start-1 xl:row-start-2">
          <MatchDeckCard
            deckName={match.deckName}
            deckArchetype={match.deckArchetype}
            deckColors={match.deckColors}
            backgroundArtUrl={match.deckBackgroundArtUrl}
            previewCards={match.deckPreviewCards}
            onOpen={onOpenDeck}
          />
        </div>
      </section>
    </div>
  )
}
