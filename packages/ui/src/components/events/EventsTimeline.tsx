/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { format as fnsFormat } from 'date-fns'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Button } from '../../primitives/Button'
import { cn } from '../../lib/cn'
import type { EventsTimelineProps, TournamentEvent } from '../../types/events'
import { getFormatBackgroundColor } from '../../utils/formats'

const PX_PER_HOUR = 80
const LANE_HEIGHT = 32
const LANE_GAP = 2
const ROW_PAD = 4
const MIN_BAR_WIDTH = 60
const MAX_SCROLL_HEIGHT = 300

function getTimelineRange(events: TournamentEvent[]) {
  let earliest = Infinity
  let latest = -Infinity
  for (const e of events) {
    if (e._rawStartTime) earliest = Math.min(earliest, new Date(e._rawStartTime).getTime())
    if (e._rawEndTime) latest = Math.max(latest, new Date(e._rawEndTime).getTime())
  }
  if (earliest === Infinity) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return { start, end }
  }
  const start = new Date(earliest)
  start.setMinutes(0, 0, 0)
  const end = new Date(latest)
  if (end.getMinutes() > 0 || end.getSeconds() > 0) {
    end.setHours(end.getHours() + 1, 0, 0, 0)
  }
  return { start, end }
}

function generateHourSlots(start: Date, end: Date): Date[] {
  const hours: Date[] = []
  const cur = new Date(start)
  while (cur.getTime() < end.getTime()) {
    hours.push(new Date(cur))
    cur.setHours(cur.getHours() + 1)
  }
  return hours
}

interface DaySpan {
  label: string
  hourCount: number
}

function computeDaySpans(hourSlots: Date[]): DaySpan[] {
  if (hourSlots.length === 0) return []
  const spans: DaySpan[] = []
  let curDay = hourSlots[0]
  let count = 0

  for (const slot of hourSlots) {
    if (slot.getDate() !== curDay.getDate() || slot.getMonth() !== curDay.getMonth()) {
      spans.push({ label: fnsFormat(curDay, 'EEEE, MMMM d, yyyy'), hourCount: count })
      curDay = slot
      count = 1
    } else {
      count++
    }
  }
  spans.push({ label: fnsFormat(curDay, 'EEEE, MMMM d, yyyy'), hourCount: count })
  return spans
}

function eventToPosition(event: TournamentEvent, timelineStart: Date) {
  const start = new Date(event._rawStartTime!)
  const end = new Date(event._rawEndTime!)
  const startMs = Math.max(start.getTime() - timelineStart.getTime(), 0)
  const endMs = end.getTime() - timelineStart.getTime()
  const left = (startMs / (1000 * 60 * 60)) * PX_PER_HOUR
  const width = Math.max(((endMs - startMs) / (1000 * 60 * 60)) * PX_PER_HOUR, MIN_BAR_WIDTH)
  return { left, width }
}

function getCurrentTimeOffset(start: Date, end: Date): number | null {
  const now = Date.now()
  if (now < start.getTime() || now > end.getTime()) return null
  return ((now - start.getTime()) / (1000 * 60 * 60)) * PX_PER_HOUR
}

function formatDuration(s: string, e: string): string {
  const min = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60000)
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `(${h}h)` : `(${h}h ${m}m)`
}

function formatTimeShort(d: string): string {
  return new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

interface LanedEvent {
  event: TournamentEvent
  lane: number
}

function assignLanes(events: TournamentEvent[]): { lanes: LanedEvent[]; laneCount: number } {
  const sorted = [...events].sort(
    (a, b) => new Date(a._rawStartTime!).getTime() - new Date(b._rawStartTime!).getTime(),
  )
  const laneEnds: number[] = []
  const lanes: LanedEvent[] = []
  for (const event of sorted) {
    const start = new Date(event._rawStartTime!).getTime()
    let assigned = -1
    for (let i = 0; i < laneEnds.length; i++) {
      if (start >= laneEnds[i]) {
        assigned = i
        break
      }
    }
    if (assigned === -1) {
      assigned = laneEnds.length
      laneEnds.push(0)
    }
    laneEnds[assigned] = new Date(event._rawEndTime!).getTime()
    lanes.push({ event, lane: assigned })
  }
  return { lanes, laneCount: Math.max(laneEnds.length, 1) }
}

interface FormatGroup {
  format: string
  lanes: LanedEvent[]
  laneCount: number
}

function groupByFormat(events: TournamentEvent[]): FormatGroup[] {
  const map = new Map<string, TournamentEvent[]>()
  for (const e of events) {
    if (!e._rawStartTime || !e._rawEndTime) continue
    const list = map.get(e.format)
    if (list) list.push(e)
    else map.set(e.format, [e])
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([format, evts]) => ({ format, ...assignLanes(evts) }))
}

function formatRowHeight(laneCount: number) {
  return laneCount * LANE_HEIGHT + Math.max(0, laneCount - 1) * LANE_GAP + ROW_PAD * 2
}

function hourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  const h = hour % 12
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`
}

function toIdSet(ids?: Set<string> | string[]): Set<string> | undefined {
  if (!ids) return undefined
  return ids instanceof Set ? ids : new Set(ids)
}

export function EventsTimeline({
  events,
  focusedEventId,
  activeEventIds,
  onEventClick,
  className,
}: EventsTimelineProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [timeOffset, setTimeOffset] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const hasScrolled = useRef(false)
  const activeIds = useMemo(() => toIdSet(activeEventIds), [activeEventIds])

  useEffect(() => {
    if (!isFullscreen) return
    const wrapper = wrapperRef.current
    const page = wrapper?.parentElement
    if (!wrapper || !page) return

    const siblings = Array.from(page.children).filter(el => el !== wrapper) as HTMLElement[]
    siblings.forEach(el => {
      el.style.display = 'none'
    })

    const scrollAncestor = wrapper.closest('.overflow-y-auto') as HTMLElement | null
    if (scrollAncestor) {
      scrollAncestor.style.overflow = 'hidden'
      scrollAncestor.style.display = 'flex'
      scrollAncestor.style.flexDirection = 'column'
    }

    page.style.flex = '1'
    page.style.minHeight = '0'
    page.style.display = 'flex'
    page.style.flexDirection = 'column'

    return () => {
      siblings.forEach(el => {
        el.style.display = ''
      })
      page.style.flex = ''
      page.style.minHeight = ''
      page.style.display = ''
      page.style.flexDirection = ''
      if (scrollAncestor) {
        scrollAncestor.style.overflow = ''
        scrollAncestor.style.display = ''
        scrollAncestor.style.flexDirection = ''
      }
    }
  }, [isFullscreen])

  const range = useMemo(() => getTimelineRange(events), [events])
  const hourSlots = useMemo(() => generateHourSlots(range.start, range.end), [range])
  const daySpans = useMemo(() => computeDaySpans(hourSlots), [hourSlots])
  const timelineWidth = hourSlots.length * PX_PER_HOUR
  const formatGroups = useMemo(() => groupByFormat(events), [events])

  useEffect(() => {
    const update = () => setTimeOffset(getCurrentTimeOffset(range.start, range.end))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [range])

  const lastFocusedEventIdRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    if (!scrollRef.current || hasScrolled.current || formatGroups.length === 0) return
    const container = scrollRef.current

    const now = Date.now()
    const targetEvent =
      (focusedEventId ? events.find(e => e.id === focusedEventId) : null) ??
      events.find(
        e =>
          (e.status === 'scheduled' || e.status === 'active') &&
          e._rawStartTime &&
          new Date(e._rawStartTime).getTime() >= now,
      ) ??
      events.find(e => e.status === 'scheduled' || e.status === 'active') ??
      events[0]

    let targetLeft: number
    if (targetEvent?._rawStartTime && targetEvent?._rawEndTime) {
      const pos = eventToPosition(targetEvent, range.start)
      targetLeft = Math.max(0, pos.left + pos.width / 2 - container.clientWidth / 2)
    } else if (timeOffset !== null) {
      targetLeft = Math.max(0, timeOffset - container.clientWidth / 2)
    } else {
      let minLeft = timelineWidth
      for (const { lanes } of formatGroups) {
        for (const { event } of lanes) {
          const { left } = eventToPosition(event, range.start)
          if (left < minLeft) minLeft = left
        }
      }
      targetLeft = Math.max(0, minLeft - container.clientWidth / 3)
    }

    container.scrollLeft = targetLeft
    hasScrolled.current = true
  }, [formatGroups, timeOffset, range, timelineWidth, focusedEventId, events])

  useEffect(() => {
    if (!focusedEventId || !scrollRef.current) return
    const isInitialFocus = lastFocusedEventIdRef.current === null
    const focusChanged = lastFocusedEventIdRef.current !== focusedEventId
    lastFocusedEventIdRef.current = focusedEventId

    const timer = setTimeout(() => {
      const el = scrollRef.current
      if (!el) return

      const event = events.find(e => e.id === focusedEventId)
      if (!event?._rawStartTime || !event._rawEndTime) return

      const pos = eventToPosition(event, range.start)
      const centerX = pos.left + pos.width / 2
      const targetLeft = Math.max(0, centerX - el.clientWidth / 2)

      const bar = el.querySelector(`[data-event-id="${focusedEventId}"]`) as HTMLElement | null
      let targetTop = el.scrollTop
      if (bar) {
        const scrollRect = el.getBoundingClientRect()
        const barRect = bar.getBoundingClientRect()
        const barTopInScroll = barRect.top - scrollRect.top + el.scrollTop
        const barCenterY = barTopInScroll + barRect.height / 2
        targetTop = Math.max(0, barCenterY - el.clientHeight / 2)
      }

      if (isInitialFocus || !focusChanged || !hasScrolled.current) {
        el.scrollLeft = targetLeft
        el.scrollTop = targetTop
        hasScrolled.current = true
      } else {
        el.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' })
      }
    }, isInitialFocus ? 0 : 40)

    return () => clearTimeout(timer)
  }, [focusedEventId, events, range])

  if (formatGroups.length === 0) {
    return (
      <div
        className={cn('px-4 py-6 text-center text-sm text-muted-foreground', className)}
      >
        No scheduled events to display on timeline.
      </div>
    )
  }

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative isolate',
        isFullscreen && 'flex min-h-0 flex-1 flex-col',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 z-30"
        style={{
          width: 60,
          height: 28,
          background: 'linear-gradient(to right, hsl(var(--background)) 0px, transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-30"
        style={{
          width: 60,
          height: 28,
          background: 'linear-gradient(to left, hsl(var(--background)) 0px, transparent)',
        }}
      />
      <div
        ref={scrollRef}
        className={cn('overflow-auto border-b border-border', isFullscreen && 'min-h-0 flex-1')}
        tabIndex={0}
        aria-label="Events timeline"
        style={isFullscreen ? undefined : { maxHeight: MAX_SCROLL_HEIGHT }}
      >
        <div style={{ width: timelineWidth }}>
          <div className="sticky top-0 z-20 bg-background">
            <div className="flex border-b border-border">
              {daySpans.map((day, i) => {
                const spanWidth = day.hourCount * PX_PER_HOUR
                return (
                  <div
                    key={i}
                    className={cn('px-3 text-center', i > 0 && 'border-l border-border')}
                    style={{ width: spanWidth }}
                  >
                    <div className="sticky left-0 right-0 whitespace-nowrap pb-2.5 pt-0.5 text-[13px] font-medium text-muted-foreground">
                      {day.label}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex border-b border-border/60">
              {hourSlots.map((slot, i) => (
                <div
                  key={i}
                  className="relative shrink-0 select-none border-r border-border/50 py-1 text-center text-[11px] text-muted-foreground/80"
                  style={{
                    width: PX_PER_HOUR,
                    minWidth: PX_PER_HOUR,
                    backgroundImage:
                      'linear-gradient(to right, transparent 24%, hsl(var(--border) / 0.3) 25%, transparent 26%, transparent 49%, hsl(var(--border) / 0.3) 50%, transparent 51%, transparent 74%, hsl(var(--border) / 0.3) 75%, transparent 76%)',
                    backgroundPosition: 'bottom',
                    backgroundSize: '100% 4px',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {hourLabel(slot.getHours())}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {formatGroups.map(({ format, lanes, laneCount }) => {
              const height = formatRowHeight(laneCount)
              const bg = getFormatBackgroundColor(format)
              return (
                <div
                  key={format}
                  className="relative border-b border-border/15"
                  style={{
                    height,
                    backgroundImage:
                      'linear-gradient(to right, hsl(var(--border) / 0.15) 1px, transparent 1px)',
                    backgroundSize: `${PX_PER_HOUR}px 100%`,
                  }}
                >
                  {lanes.map(({ event, lane }) => {
                    const pos = eventToPosition(event, range.start)
                    const dur = formatDuration(event._rawStartTime!, event._rawEndTime!)
                    const timeStr = `${formatTimeShort(event._rawStartTime!)} - ${formatTimeShort(event._rawEndTime!)} ${dur}`
                    const top = ROW_PAD + lane * (LANE_HEIGHT + LANE_GAP)
                    const isFocused = focusedEventId === event.id
                    const isActive = activeIds?.has(event.id) ?? false
                    const isDimmed =
                      (focusedEventId != null && !isFocused) || (!focusedEventId && isActive)
                    return (
                      <div
                        key={event.id}
                        data-event-id={event.id}
                        className={cn(
                          'absolute flex flex-col justify-center overflow-hidden rounded-sm px-1.5 text-white shadow-sm transition-all duration-150',
                          onEventClick ? 'cursor-pointer' : 'cursor-default',
                          bg,
                          isFocused && 'z-10 ring-2 ring-white/70',
                          isDimmed && 'opacity-30',
                        )}
                        style={{
                          left: pos.left,
                          width: pos.width,
                          top,
                          height: LANE_HEIGHT,
                        }}
                        onClick={() => onEventClick?.(event)}
                        title={`${event.name}\nFormat: ${event.format}\nTime: ${timeStr}\nPlayers: ${event.totalPlayers ?? '?'} / ${event.minimumPlayers ?? '?'}\nRounds: ${event.totalRounds ?? '?'}`}
                      >
                        <span className="truncate text-[10px] font-medium leading-tight">
                          {event.name}
                        </span>
                        <span className="truncate text-[9px] leading-tight opacity-80">
                          {timeStr}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {timeOffset !== null ? (
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-red-500"
                style={{ left: timeOffset }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="absolute bottom-2 right-4 z-30 h-8 w-8 rounded-full bg-background/80 p-0 opacity-50 shadow-md backdrop-blur-sm transition-opacity hover:opacity-100"
        onClick={() => setIsFullscreen(v => !v)}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  )
}
