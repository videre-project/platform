/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import type { DateRange } from 'react-day-picker'

import { HISTORY_SHOWCASE_ITEMS, SHOWCASE_FORMATS } from '../src/fixtures/layout-showcase'
import { HistoryLayout } from '../src/layouts/HistoryLayout'
import type { GameType } from '../src/components/filters/GameTypeFormatFilter'

const meta = {
  title: 'History/History layout',
  component: HistoryLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [
    Story => (
      <div className="h-[700px] w-[1120px] overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HistoryLayout>

export default meta
type Story = StoryObj<typeof meta>

const defaultRange: DateRange = {
  from: new Date('2026-07-01T00:00:00.000Z'),
  to: new Date('2026-08-01T00:00:00.000Z'),
}

function HistoryHarness({
  gameType: initialGameType = 'All' as GameType,
  selectedFormat: initialFormat = '',
  ...rest
}: Partial<ComponentProps<typeof HistoryLayout>>) {
  const [gameType, setGameType] = useState<GameType>(initialGameType)
  const [selectedFormat, setSelectedFormat] = useState(initialFormat)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange)

  return (
    <HistoryLayout
      items={HISTORY_SHOWCASE_ITEMS}
      gameType={gameType}
      onGameTypeChange={setGameType}
      selectedFormat={selectedFormat}
      formats={[...SHOWCASE_FORMATS]}
      onFormatChange={setSelectedFormat}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onRowClick={fn()}
      pagination={{ page: 1, totalPages: 3, totalCount: 120 }}
      onPreviousPage={fn()}
      onNextPage={fn()}
      {...rest}
    />
  )
}

export const Default: Story = {
  render: () => <HistoryHarness />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Modern Challenge')).toBeVisible()
  },
}

export const Loading: Story = {
  render: () => <HistoryHarness items={[]} loading />,
}
