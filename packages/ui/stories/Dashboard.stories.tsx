/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { DateRange } from 'react-day-picker'

import {
  DASHBOARD_SHOWCASE_ARCHETYPES,
  DASHBOARD_SHOWCASE_METAGAME_DECKS,
  DASHBOARD_SHOWCASE_STATS,
  DASHBOARD_SHOWCASE_TREND,
  SHOWCASE_FORMATS,
} from '../src/fixtures/layout-showcase'
import { DashboardLayout } from '../src/layouts/DashboardLayout'
import type { DashboardGameType } from '../src/types/dashboard'
import backfaceUrl from '../src/assets/backface.png'

const meta = {
  title: 'Dashboard/Dashboard layout',
  component: DashboardLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [
    Story => (
      <div className="h-[720px] w-[1120px] overflow-auto bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DashboardLayout>

export default meta
type Story = StoryObj<typeof meta>

function DashboardHarness({ withReports = false }: { withReports?: boolean }) {
  const [gameType, setGameType] = useState<DashboardGameType>('Constructed')
  const [selectedFormat, setSelectedFormat] = useState('')
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date('2026-07-01T00:00:00.000Z'),
    to: new Date('2026-08-01T00:00:00.000Z'),
  })

  return (
    <DashboardLayout
      gameType={gameType}
      onGameTypeChange={setGameType}
      selectedFormat={selectedFormat}
      formats={[...SHOWCASE_FORMATS]}
      onFormatChange={setSelectedFormat}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      stats={DASHBOARD_SHOWCASE_STATS}
      loading={false}
      trend={DASHBOARD_SHOWCASE_TREND}
      archetypes={DASHBOARD_SHOWCASE_ARCHETYPES}
      archetypesLoading={false}
      metagameDecks={DASHBOARD_SHOWCASE_METAGAME_DECKS}
      metagameDecksLoading={false}
      renderSearchMoreMetagameDecks={({ children }) => (
        <a href="/metagame" onClick={event => event.preventDefault()}>{children}</a>
      )}
      getArtUrl={() => backfaceUrl}
      selectedArchetype={selectedArchetype}
      onDeckClick={setSelectedArchetype}
      performanceContent={withReports ? <section aria-label="Matchup preview" className="h-[600px]" /> : undefined}
    />
  )
}

export const Default: Story = {
  render: () => <DashboardHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Overall Winrate')).toBeVisible()
    await expect(canvas.getByText('Top Metagame Decks')).toBeVisible()
    await expect(canvas.getByText('Search more decks')).toBeInTheDocument()
    await expect(canvas.getByRole('list', { name: 'Top metagame decks' })).toBeVisible()
    await expect(canvasElement.querySelector('[data-metagame-edge="left"]')).toHaveAttribute('data-visible', 'false')
    await expect(canvasElement.querySelector('[data-metagame-edge="right"]')).toHaveAttribute('data-visible', 'true')
  },
}

export const DeckSelection: Story = {
  render: () => <DashboardHarness />,
  play: async ({ canvasElement }) => {
    const chart = within(within(canvasElement).getByRole('group', { name: 'Deck performance chart' }))
    await expect(chart.getByRole('img', { name: /Expected spread around 58.3% overall winrate/ })).toBeVisible()
    await expect(chart.queryByText('Overall 58.3%')).toBeNull()
    const spread = chart.getByRole('img', { name: /Expected spread around/ })
    const clip = spread.querySelector('clipPath rect') as SVGRectElement
    const contours = spread.querySelectorAll('path')
    await expect(contours).toHaveLength(3)
    // Curves must continue above the visible plot, even when nice axis ticks
    // extend beyond the highest observed match count.
    for (const contour of contours) {
      await expect(contour.getBBox().y).toBeLessThan(clip.y.baseVal.value)
      await expect(contour.getAttribute('d')).not.toMatch(/NaN|Infinity/)
    }
    const rakdos = chart.getByRole('button', { name: 'Show matchups for Rakdos Scam' })
    await userEvent.click(rakdos)
    await waitFor(() => expect(rakdos).toHaveAttribute('aria-pressed', 'true'))
    const yawgmoth = chart.getByRole('button', { name: 'Show matchups for Yawgmoth' })
    yawgmoth.focus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(yawgmoth).toHaveAttribute('aria-pressed', 'true'))
    await expect(yawgmoth).toHaveFocus()
    await expect(rakdos).toHaveAttribute('aria-pressed', 'false')
    await expect(within(canvasElement).queryByRole('button', { name: 'View More Decks' })).toBeNull()
  },
}

export const StickyFilters: Story = {
  render: () => <DashboardHarness withReports />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const filters = canvas.getByRole('group', { name: 'Dashboard filters' })
    const dashboard = filters.closest('[data-ui-layout="dashboard"]')!
    const scrollport = dashboard.parentElement!
    const overview = dashboard.querySelector('[data-dashboard-overview]')!
    const reports = canvas.getByRole('region', { name: 'Matchup preview' })
    const top = scrollport.getBoundingClientRect().top
    scrollport.scrollTop = 150
    await waitFor(() => expect(filters.getBoundingClientRect().top).toBeCloseTo(top, 0))
    scrollport.scrollTop = overview.getBoundingClientRect().height - 12
    await waitFor(() => {
      expect(filters.getBoundingClientRect().bottom).toBeCloseTo(overview.getBoundingClientRect().bottom, 0)
      expect(filters.getBoundingClientRect().bottom).toBeLessThan(reports.getBoundingClientRect().top)
    })
    scrollport.scrollTop = overview.getBoundingClientRect().height + 100
    await waitFor(() => expect(filters.getBoundingClientRect().bottom).toBeLessThan(top))
  },
}
