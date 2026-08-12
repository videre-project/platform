/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { ArrowRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { Button } from '../../primitives/Button'
import { cn } from '../../lib/cn'
import type { EventDetailPanelProps } from '../../types/events'
import { getFormatDotColor } from '../../utils/formats'

function PrizesScroll({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(false)

  const checkFade = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const hasMore = el.scrollHeight - el.scrollTop - el.clientHeight > 4
    setShowFade(hasMore)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkFade()
    el.addEventListener('scroll', checkFade, { passive: true })
    const ro = new ResizeObserver(checkFade)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkFade)
      ro.disconnect()
    }
  }, [checkFade])

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} className="h-full overflow-y-auto px-4 pb-4">
        {children}
      </div>
      {showFade ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{
            height: 32,
            background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
          }}
        />
      ) : null}
    </div>
  )
}

function sortPrizeBrackets(a: string, b: string): number {
  const parseRank = (s: string) => {
    const wl = s.match(/^(\d+)-(\d+)$/)
    if (wl) return -parseInt(wl[1], 10)
    const nth = s.match(/^(\d+)/)
    if (nth) return parseInt(nth[1], 10)
    return 999
  }
  return parseRank(a) - parseRank(b)
}

export function EventDetailPanel({
  event,
  entryFee = null,
  prizes = null,
  detailsLoading = false,
  detailsPending = false,
  onClose,
  onViewTournament,
  className,
}: EventDetailPanelProps) {
  if (!event) return null

  const hasPlayoffs =
    event.hasPlayoffs ||
    (event.eventStructure &&
      typeof event.eventStructure === 'object' &&
      event.eventStructure.hasPlayoffs) ||
    (event.totalSwissRounds &&
      event.totalRounds &&
      event.totalSwissRounds !== event.totalRounds)

  return (
    <div
      className={cn(
        'flex w-80 shrink-0 flex-col border-l border-border bg-background',
        className,
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{event.name}</h3>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={cn('h-2 w-2 shrink-0 rounded-full', getFormatDotColor(event.format))}
            />
            <span className="text-xs text-muted-foreground">{event.format}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 shrink-0 p-0"
          onClick={onClose}
          aria-label="Close event details"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="shrink-0 space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <div className="mb-0.5 text-xs text-muted-foreground">Schedule</div>
            <div>
              {event.startTime ?? '—'} – {event.endTime ?? '—'}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-xs text-muted-foreground">Players</div>
            <div>
              {event.totalPlayers ?? 0} / {event.minimumPlayers ?? 0}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-xs text-muted-foreground">Rounds</div>
            <div>
              {event.totalSwissRounds || event.totalRounds || '—'}
              {hasPlayoffs ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">(with top 8)</span>
              ) : null}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-xs text-muted-foreground">Entry Fee</div>
            <div>{detailsLoading ? '...' : (entryFee ?? '—')}</div>
          </div>
        </div>
      </div>

      <PrizesScroll>
        {detailsPending || detailsLoading ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : prizes && Object.keys(prizes).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(prizes)
              .sort(([a], [b]) => sortPrizeBrackets(a, b))
              .map(([bracket, prize]) => (
                <div key={bracket} className="flex gap-3 text-[13px]">
                  <span className="w-16 shrink-0 text-muted-foreground">{bracket}</span>
                  <div className="space-y-0.5">
                    {prize.split(' / ').map((item, j) => (
                      <div key={j}>{item}</div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No prize data available</div>
        )}
      </PrizesScroll>

      {onViewTournament ? (
        <div className="shrink-0 border-t border-border px-4 py-4">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 border-sidebar-border/60"
            onClick={() => onViewTournament(event)}
          >
            View Tournament
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
