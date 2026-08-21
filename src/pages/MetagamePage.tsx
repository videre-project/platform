/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ACTIVE_FORMATS } from '@videreproject/constants'
import {
  Button,
  Card,
  DatePickerWithRange,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  CardTooltipProvider,
  TooltipProvider,
  type DatePickerWithRangeProps,
} from '@videreproject/ui'
import { AlertCircle, Check, RotateCcw, Share2 } from 'lucide-react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { MetagameChart } from '@/components/metagame/MetagameChart'
import { useMetagame } from '@/hooks/useMetagame'
import { CardTrends, MetagameMovers } from '@/components/metagame/MetagameMovers'
import { useMetagameMovers } from '@/hooks/useMetagameMovers'
import { SideboardingPerformance } from '@/components/metagame/SideboardingPerformance'
import { useSideboarding } from '@/hooks/useSideboarding'
import {
  createMetagameSearchParameters,
  createMetagameShareUrl,
  formatMetagameShareDateRange,
  getDefaultMetagameDateRange,
  readMetagameShareParameters,
} from '@/utils/metagameShareParameters'
import './MetagamePage.css'

type DateRange = NonNullable<DatePickerWithRangeProps['date']>

const getInitialRange = (): DateRange => {
  return getDefaultMetagameDateRange()
}

const datePresets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 21 days', days: 21 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
].map(({ label, days }) => ({
  label,
  getValue: () => {
    const to = new Date()
    const from = new Date(to)
    from.setDate(from.getDate() - days)
    return { from, to }
  },
}))

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return
    } catch {
      // Fall through for browsers that expose the API but deny permission.
    }
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.append(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) throw new Error('Could not copy the metagame link')
}

export default function MetagamePage() {
  const [initialFilters] = useState(() => readMetagameShareParameters(window.location.search))
  const [format, setFormat] = useState(initialFilters.format)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialFilters.dateRange)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle')
  const shareResetTimerRef = useRef<number>()
  const { data, loading, error } = useMetagame(format, dateRange)
  const movers = useMetagameMovers(format, dateRange)
  const sideboarding = useSideboarding(format, dateRange)
  const from = dateRange?.from ?? getInitialRange().from!
  const to = dateRange?.to ?? dateRange?.from ?? new Date()
  const metagameMatrixContentEnd = 512 + (data?.archetypes.length ?? 16) * 36

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${format} Metagame | Videre Project`
    return () => { document.title = previousTitle }
  }, [format])

  useEffect(() => {
    if (!dateRange?.from) return
    const nextSearch = createMetagameSearchParameters({
      format,
      dateRange: {
        from: dateRange.from,
        to: dateRange.to ?? dateRange.from,
      },
    }).toString()
    if (window.location.search.slice(1) !== nextSearch) {
      window.history.replaceState({}, '', `${window.location.pathname}?${nextSearch}`)
    }
  }, [dateRange, format])

  useEffect(() => {
    const handlePopState = () => {
      const filters = readMetagameShareParameters(window.location.search)
      setFormat(filters.format)
      setDateRange(filters.dateRange)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => () => {
    if (shareResetTimerRef.current !== undefined) window.clearTimeout(shareResetTimerRef.current)
  }, [])

  const handleShare = async () => {
    if (!dateRange?.from) return
    const normalizedRange = {
      from: dateRange.from,
      to: dateRange.to ?? dateRange.from,
    }
    const shareUrl = createMetagameShareUrl(window.location.origin, {
      format,
      dateRange: normalizedRange,
    }).toString()
    const shareData = {
      title: `${format} Metagame | Videre Project`,
      text: `${format} MTGO metagame, ${formatMetagameShareDateRange(normalizedRange)}`,
      url: shareUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
      }
    }

    await copyText(shareUrl)
    setShareStatus('copied')
    if (shareResetTimerRef.current !== undefined) window.clearTimeout(shareResetTimerRef.current)
    shareResetTimerRef.current = window.setTimeout(() => setShareStatus('idle'), 2000)
  }

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={0}>
      <CardTooltipProvider>
      <div className="metagame-page-shell">
      <Header />
      <main className="metagame-page-main">
        <div className="container-wide">
          <div
            className="metagame-page-heading"
            style={{ '--metagame-matrix-content-end': `${metagameMatrixContentEnd}px` } as CSSProperties}
          >
            <div>
              <h1>Magic: The Gathering Metagame</h1>
              <p>Explore the decks defining each format and their performance across the field.</p>
            </div>
            <Button
              className="metagame-page-share-button"
              variant="outline"
              size="sm"
              onClick={() => void handleShare()}
              disabled={!dateRange?.from}
            >
              {shareStatus === 'copied'
                ? <Check className="mr-2 h-4 w-4" />
                : <Share2 className="mr-2 h-4 w-4" />}
              {shareStatus === 'copied' ? 'Link copied' : 'Share'}
            </Button>
          </div>

          {error ? (
            <>
              <MetagameFilters
                format={format}
                setFormat={setFormat}
                dateRange={dateRange}
                setDateRange={setDateRange}
              />
              <Card className="metagame-error-card">
                <AlertCircle size={20} />
                <div>
                  <strong>We couldn&apos;t load this metagame.</strong>
                  <p>{error}. Try another format or date range.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setDateRange(getInitialRange())}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset filters
                </Button>
              </Card>
            </>
          ) : (
            <>
              <MetagameChart
                data={data}
                format={format}
                from={from}
                to={to}
                loading={loading}
                controls={(
                  <MetagameFilters
                    format={format}
                    setFormat={setFormat}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                  />
                )}
              />
              <MetagameMovers
                data={movers.data}
                loading={movers.loading}
                error={movers.error}
              />
              <SideboardingPerformance
                data={sideboarding.data}
                metagame={data}
                loading={sideboarding.loading}
                error={sideboarding.error}
              />
              <CardTrends
                data={movers.data}
                loading={movers.cardLoading}
                error={movers.cardError}
              />
            </>
          )}
        </div>
      </main>
      <Footer />
      </div>
      </CardTooltipProvider>
    </TooltipProvider>
  )
}

function MetagameFilters({
  format,
  setFormat,
  dateRange,
  setDateRange,
}: {
  format: string
  setFormat: (value: string) => void
  dateRange: DateRange | undefined
  setDateRange: (value: DateRange | undefined) => void
}) {
  return (
    <section className="metagame-filter-content" aria-label="Metagame filters">
      <label className="metagame-filter-field">
        <span>Format</span>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger aria-label="Select a format">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_FORMATS.map(value => (
              <SelectItem key={value} value={value}>{value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="metagame-filter-field is-date">
        <span>Date range</span>
        <DatePickerWithRange
          date={dateRange}
          setDate={setDateRange}
          presets={datePresets}
          className="metagame-date-picker"
        />
      </label>
    </section>
  )
}
