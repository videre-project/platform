/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useState, type CSSProperties } from 'react'
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
import { Activity, AlertCircle, BarChart3, RotateCcw } from 'lucide-react'

import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { MetagameChart } from '@/components/metagame/MetagameChart'
import { useMetagame } from '@/hooks/useMetagame'
import { CardTrends, MetagameMovers } from '@/components/metagame/MetagameMovers'
import { useMetagameMovers } from '@/hooks/useMetagameMovers'
import { SideboardingPerformance } from '@/components/metagame/SideboardingPerformance'
import { MetagamePolarity } from '@/components/metagame/MetagamePolarity'
import { useSideboarding } from '@/hooks/useSideboarding'
import {
  createMetagameSearchParameters,
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

export default function MetagamePage() {
  const [initialFilters] = useState(() => readMetagameShareParameters(window.location.search))
  const [format, setFormat] = useState(initialFilters.format)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialFilters.dateRange)
  const [activeTab, setActiveTab] = useState<'breakdown' | 'health'>('breakdown')
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
    }, { includeDefaults: false }).toString()
    if (window.location.search.slice(1) !== nextSearch) {
      const nextUrl = nextSearch
        ? `${window.location.pathname}?${nextSearch}`
        : window.location.pathname
      window.history.replaceState({}, '', nextUrl)
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

  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={0}>
      <CardTooltipProvider>
      <div className="metagame-page-shell">
      <Header />
      <main className="metagame-page-main">
        <div
          className="container-wide"
          style={{ '--metagame-matrix-content-end': `${metagameMatrixContentEnd}px` } as CSSProperties}
        >
          <div className="metagame-page-heading">
            <div>
              <h1>Magic: The Gathering Metagame</h1>
              <p>Explore the decks defining each format and their performance across the field.</p>
            </div>
            <div className="metagame-page-tabs" role="tablist" aria-label="Metagame view">
              <button
                type="button"
                id="metagame-breakdown-tab"
                role="tab"
                aria-selected={activeTab === 'breakdown'}
                aria-controls="metagame-breakdown-panel"
                className={activeTab === 'breakdown' ? 'is-active' : undefined}
                onClick={() => setActiveTab('breakdown')}
              >
                <BarChart3 size={16} />
                Breakdown
              </button>
              <button
                type="button"
                id="metagame-health-tab"
                role="tab"
                aria-selected={activeTab === 'health'}
                aria-controls="metagame-health-panel"
                className={activeTab === 'health' ? 'is-active' : undefined}
                onClick={() => setActiveTab('health')}
              >
                <Activity size={16} />
                Health
              </button>
            </div>
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
              <div
                id="metagame-breakdown-panel"
                role="tabpanel"
                aria-labelledby="metagame-breakdown-tab"
                tabIndex={0}
                hidden={activeTab !== 'breakdown'}
              >
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
              </div>
              <div
                id="metagame-health-panel"
                role="tabpanel"
                aria-labelledby="metagame-health-tab"
                tabIndex={0}
                hidden={activeTab !== 'health'}
              >
                <MetagamePolarity
                  metagame={data}
                  sideboarding={sideboarding.data}
                  loading={loading || sideboarding.loading}
                  sideboardingError={sideboarding.error}
                  visible={activeTab === 'health'}
                  controls={(
                    <MetagameFilters
                      format={format}
                      setFormat={setFormat}
                      dateRange={dateRange}
                      setDateRange={setDateRange}
                    />
                  )}
                />
              </div>
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
