/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { ArrowUpRight, Check, Clock, Minus, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { EventDecklist } from './EventDecklist'
import { EventPlayerTabs } from './EventPlayerTabs'
import { DeckManaSymbols } from '../cards/DeckManaSymbols'
import { Button } from '../../primitives/Button'
import { Skeleton } from '../../primitives/Skeleton'
import { cn } from '../../lib/cn'
import type { TournamentMatch, TournamentPlayerDetails } from '../../types/events'

function MatchResult({ result }: { result: TournamentMatch['result'] }) {
  const Icon = result === 'win' || result === 'bye' ? Check
    : result === 'loss' ? X : result === 'draw' ? Minus : Clock
  return <Icon aria-label={result === 'in-progress' ? 'In progress' : result === 'pending' ? 'Awaiting result' : result}
    className={cn('h-3.5 w-3.5', result === 'win' || result === 'bye' ? 'text-emerald-500'
      : result === 'loss' ? 'text-rose-500' : 'text-muted-foreground')} />
}

export function TournamentPlayerPanel({
  details,
  showPlayerName = false,
  totalSwissRounds,
  completed,
  tab,
  onTabChange,
  onMatchClick,
  onPreviewDeck,
}: {
  details: TournamentPlayerDetails
  showPlayerName?: boolean
  totalSwissRounds?: number
  completed: boolean
  tab: 'matchups' | 'decklist' | null
  onTabChange: (tab: 'matchups' | 'decklist') => void
  onMatchClick?: (matchId: number) => void
  onPreviewDeck?: (deck: NonNullable<TournamentPlayerDetails['deck']>) => void
}) {
  const [showScrollFade, setShowScrollFade] = useState(false)
  const scrollPanel = useRef<HTMLDivElement>(null)
  const deckAvailable = completed && Boolean(details.deck || details.deckLoading)
  const activeTab = tab === 'matchups' || !deckAvailable ? 'matchups' : 'decklist'

  useLayoutEffect(() => {
    if (scrollPanel.current) scrollPanel.current.scrollTop = 0
  }, [activeTab, details.player])

  useEffect(() => {
    const panel = scrollPanel.current
    if (!panel) return

    const updateFade = () => {
      const hasOverflow = panel.scrollHeight > panel.clientHeight + 1
      const isAtBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1
      setShowScrollFade(hasOverflow && !isAtBottom)
    }
    const frame = window.requestAnimationFrame(updateFade)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateFade)
    panel.addEventListener('scroll', updateFade, { passive: true })
    observer?.observe(panel)
    Array.from(panel.children).forEach(child => observer?.observe(child))

    return () => {
      window.cancelAnimationFrame(frame)
      panel.removeEventListener('scroll', updateFade)
      observer?.disconnect()
    }
  }, [activeTab, details])

  const showArchetypes = details.matches.some(match => match.opponentArchetype)
  const deck = details.deck
  let content: ReactNode
  if (activeTab === 'decklist' && deck) {
    content = <EventDecklist mainboard={deck.mainboard} sideboard={deck.sideboard}
      onPreview={onPreviewDeck ? () => onPreviewDeck(deck) : undefined} />
  } else if (details.loading || (activeTab === 'decklist' && details.deckLoading)) {
    content = <div className="space-y-3 py-3" aria-label="Loading player matches">
      {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}
    </div>
  } else if (details.error) {
    content = <p role="alert" className="py-4 text-sm text-destructive">{details.error}</p>
  } else if (!details.player) {
    content = <p className="py-4 text-sm text-muted-foreground">Select a player to view their matches.</p>
  } else if (details.matches.length === 0) {
    content = <p className="py-4 text-sm text-muted-foreground">No pairings available yet.</p>
  } else {
    content = <div>
      <div className="flex gap-3 border-b border-sidebar-border/60 py-2 text-xs text-muted-foreground">
        <span className="w-8 shrink-0">Round</span><span className="flex-1">Opponent</span>
        {showArchetypes && <span className="w-32 shrink-0">Archetype</span>}
      </div>
      {details.matches.map(match => {
        const matchId = match.id
        const playoffRound = totalSwissRounds && match.round != null ? match.round - totalSwissRounds : 0
        const round = playoffRound > 0 && playoffRound <= 3
          ? ['QF', 'SF', 'F'][playoffRound - 1]
          : match.round == null ? '—' : `R${match.round}`
        const record = match.record ?? (
          match.result === 'in-progress' ? 'In progress'
            : match.result === 'pending' ? 'Awaiting result'
            : match.result === 'bye' ? null : 'Score unavailable'
        )
        return <div key={`${match.round}-${matchId}`} className="flex items-center gap-3 border-b border-sidebar-border/60 py-3 text-sm">
          <div className="flex w-8 shrink-0 flex-col items-start gap-1 text-xs text-muted-foreground">
            <span>{round}</span><MatchResult result={match.result} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate font-medium">{match.result === 'bye' ? 'Bye' : match.opponent ?? 'Awaiting opponent'}</span>
              {match.isRecorded && matchId != null && onMatchClick && <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                aria-label={`View recorded match against ${match.opponent ?? 'opponent'}`} onClick={() => onMatchClick(matchId)}>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>}
            </div>
            <div className="text-xs tabular-nums text-muted-foreground">{record}</div>
          </div>
          {showArchetypes && <div className="flex w-32 shrink-0 flex-col gap-1 text-xs">
            <span className={cn('truncate', !match.opponentArchetype && 'text-muted-foreground')}>{match.opponentArchetype ?? 'Unknown'}</span>
            <DeckManaSymbols colors={match.opponentColors} className="h-3" symbolClassName="h-3 w-3" />
          </div>}
        </div>
      })}
    </div>
  }

  return <aside aria-label="Player details" className="event-tournament-player-panel min-w-0">
    {showPlayerName && details.player && <h2 className="truncate py-2 text-sm font-medium">{details.player}</h2>}
    <EventPlayerTabs activeTab={activeTab} onChange={onTabChange} decklistDisabled={!deckAvailable} />
    <div ref={scrollPanel} role="tabpanel" aria-label={activeTab === 'decklist' ? 'Decklist' : 'Matchups'}
      className="event-tournament-player-scroll">
      {content}
      {details.deckLoading && <p className="py-3 text-xs text-muted-foreground">Loading published decklist…</p>}
      {details.deckError && <p role="status" className="py-3 text-xs text-muted-foreground">{details.deckError}</p>}
    </div>
    {showScrollFade && <div className="event-detail-sidebar-scroll-fade" aria-hidden="true" />}
  </aside>
}
