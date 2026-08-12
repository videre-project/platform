/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import type { DateRange } from 'react-day-picker'

import {
  DASHBOARD_SHOWCASE_ARCHETYPES,
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

function DashboardHarness() {
  const [gameType, setGameType] = useState<DashboardGameType>('Constructed')
  const [selectedFormat, setSelectedFormat] = useState('')
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
      getArtUrl={() => backfaceUrl}
      onViewMoreDecks={fn()}
    />
  )
}

export const Default: Story = {
  render: () => <DashboardHarness />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Overall Winrate')).toBeVisible()
  },
}
