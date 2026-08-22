/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ACTIVE_FORMATS, EVENTS } from '@videreproject/constants'
import {
  Button,
  DataTablePagination,
  DatePickerWithRange,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  type DatePickerWithRangeProps,
} from '@videreproject/ui'
import { AlertCircle, ArrowRight, BookOpen, CalendarDays, Trophy, Users } from 'lucide-react'

import { Footer } from '@/components/Footer'
import { Header, navigateTo } from '@/components/Header'
import { useEvents, type EventSummary } from '@/hooks/useEvents'
import { formatCalendarDate, getCalendarDate } from '@/utils/calendarDate'
import { formatEventTitle } from '@/utils/eventFormatting'
import './EventPages.css'

type DateRange = NonNullable<DatePickerWithRangeProps['date']>
const DEFAULT_EVENTS_PAGE_SIZE = 50

const getInitialRange = (): DateRange => {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 31)
  return { from, to }
}

const datePresets = [7, 14, 21, 30, 90].map(days => ({
  label: `Last ${days} days`,
  getValue: () => {
    const to = new Date()
    const from = new Date(to)
    from.setDate(from.getDate() - days)
    return { from, to }
  },
}))

const formatDate = (date: string) => formatCalendarDate(date, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function EventRow({ event }: { event: EventSummary }) {
  const isLeague = event.kind.toLowerCase().includes('league')
  const EventIcon = isLeague ? BookOpen : Trophy

  return (
    <a className="events-page-row" href={`/events/${event.id}`} onClick={navigateTo(`/events/${event.id}`)}>
      <div className="events-page-row-title">
        <span className="events-page-row-icon" aria-hidden="true"><EventIcon size={16} /></span>
        <span className="events-page-row-name">{formatEventTitle(event)}</span>
      </div>
      <div className="events-page-row-meta">
        <time className="events-page-row-date" dateTime={getCalendarDate(event.date)}>{formatDate(event.date)}</time>
        <span className="events-page-row-players"><Users size={15} />{event.players}<span className="events-page-row-meta-label"> players</span></span>
        <span className="events-page-row-rounds">{event.rounds} rounds</span>
      </div>
      <ArrowRight className="events-page-row-arrow" size={17} />
    </a>
  )
}

export default function EventsPage() {
  const [format, setFormat] = useState('Standard')
  const [eventType, setEventType] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getInitialRange)
  const [pageSize, setPageSize] = useState(DEFAULT_EVENTS_PAGE_SIZE)
  const [offset, setOffset] = useState(0)
  const pageMainRef = useRef<HTMLElement>(null)
  const resultsRef = useRef<HTMLElement>(null)
  const { data, pagination, loading, error } = useEvents(
    format,
    dateRange,
    eventType === 'all' ? undefined : eventType,
    { limit: pageSize, offset },
  )
  const filteredData = data
  const resultLabel = eventType === 'all' ? `${format} events` : `${format} ${eventType} events`
  const page = Math.floor(pagination.offset / pagination.limit) + 1
  const firstVisibleEvent = pagination.offset + 1
  const lastVisibleEvent = pagination.offset + filteredData.length

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Events | Videre Project'
    return () => { document.title = previousTitle }
  }, [])

  useLayoutEffect(() => {
    const pageMain = pageMainRef.current
    if (!pageMain) return

    let frame: number | null = null
    const updateSpotlightPosition = () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        pageMain.style.setProperty('--events-main-viewport-top', `${pageMain.getBoundingClientRect().top}px`)
        frame = null
      })
    }

    updateSpotlightPosition()
    window.addEventListener('scroll', updateSpotlightPosition, { passive: true })
    window.addEventListener('resize', updateSpotlightPosition)
    return () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      pageMain.style.removeProperty('--events-main-viewport-top')
      window.removeEventListener('scroll', updateSpotlightPosition)
      window.removeEventListener('resize', updateSpotlightPosition)
    }
  }, [])

  const resetPagination = () => setOffset(0)
  const changePage = (nextOffset: number) => {
    setOffset(nextOffset)
    window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ block: 'start' }))
  }

  return (
    <div className="events-page-shell">
      <Header />
      <main ref={pageMainRef} className="events-page-main">
        <div className="container-wide">
          <div className="events-page-heading">
            <div>
              <h1>Events</h1>
              <p>Browse tournament results and decklists by format, event type, and date.</p>
            </div>
          </div>

          <section className="events-page-filters metagame-filter-content" aria-label="Event filters">
            <label className="metagame-filter-field">
              <span>Format</span>
              <Select value={format} onValueChange={value => { setFormat(value); resetPagination() }}>
                <SelectTrigger aria-label="Select a format"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVE_FORMATS.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="metagame-filter-field">
              <span>Event type</span>
              <Select value={eventType} onValueChange={value => { setEventType(value); resetPagination() }}>
                <SelectTrigger aria-label="Select an event type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All event types</SelectItem>
                  {EVENTS.map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
            <label className="metagame-filter-field">
              <span>Date range</span>
              <DatePickerWithRange
                date={dateRange}
                setDate={value => { setDateRange(value); resetPagination() }}
                presets={datePresets}
                className="metagame-date-picker"
              />
            </label>
          </section>

          <section ref={resultsRef} className="events-page-results" aria-label={resultLabel}>
            <div className="events-page-results-header">
              <div>
                <h2>{resultLabel}</h2>
                <p>{loading ? 'Loading events…' : filteredData.length > 0 ? `Showing events ${firstVisibleEvent}–${lastVisibleEvent}` : 'No events found'}</p>
              </div>
              <CalendarDays size={19} aria-hidden="true" />
            </div>
            {error ? (
              <div className="events-page-state is-error"><AlertCircle size={19} /><span>{error}</span><Button variant="outline" size="sm" onClick={() => { setDateRange(getInitialRange()); resetPagination() }}>Reset filters</Button></div>
            ) : loading ? (
              <div className="events-page-list" aria-label="Loading events">
                {Array.from({ length: 8 }, (_, index) => <div className="events-page-skeleton" key={index}><Skeleton className="h-5 w-52" /><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-16" /></div>)}
              </div>
            ) : filteredData.length === 0 ? (
              <div className="events-page-state">No events found for this format and date range.</div>
            ) : (
              <>
                <div className="events-page-list">
                  <div className="events-page-list-head">
                    <span>Event</span>
                    <span className="events-page-row-meta"><span>Date</span><span>Players</span><span>Rounds</span></span>
                    <span />
                  </div>
                  {filteredData.map(event => <EventRow key={event.id} event={event} />)}
                </div>
                {(pagination.offset > 0 || pagination.hasMore) && <div className="events-page-pagination">
                  <DataTablePagination<EventSummary>
                    summary={`Showing ${firstVisibleEvent}–${lastVisibleEvent} events`}
                    disabled={loading}
                    pagination={{
                      pageIndex: page - 1,
                      pageSize: pagination.limit,
                      pageCount: null,
                      hasPreviousPage: pagination.offset > 0,
                      hasNextPage: pagination.hasMore,
                      onPageIndexChange: nextPage => changePage(nextPage * pagination.limit),
                      onPageSizeChange: nextPageSize => {
                        setPageSize(nextPageSize)
                        changePage(0)
                      },
                    }}
                  />
                </div>}
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
