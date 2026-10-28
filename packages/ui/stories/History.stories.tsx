/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useState, type ComponentProps, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { DateRange } from 'react-day-picker'

import { HISTORY_SHOWCASE_ITEMS, SHOWCASE_FORMATS } from '../src/fixtures/layout-showcase'
import { HistoryLayout } from '../src/layouts/HistoryLayout'
import { OpponentArchetypePicker } from '../src/components/match/OpponentArchetypePicker'
import type { MatchHistoryItem } from '../src/types/history'
import type { GameType } from '../src/components/filters/GameTypeFormatFilter'

const meta = {
  title: 'History/History layout',
  component: HistoryLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [
    Story => (
      <div className="flex h-[700px] w-[1120px] flex-col overflow-hidden bg-background">
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
      pagination={{ pageIndex: 0, pageSize: 50, pageCount: 3, totalCount: 120,
        hasPreviousPage: false, hasNextPage: true, onPageIndexChange: fn(), onPageSizeChange: fn() }}
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

const classify = fn()

function EditableHistoryHarness() {
  const [items, setItems] = useState(HISTORY_SHOWCASE_ITEMS)
  const renderEditor = useCallback((match: MatchHistoryItem, trigger: ReactNode) => (
    <OpponentArchetypePicker value={match.opponentDeckArchetype ?? null} colors={match.opponentDeckColors}
      loadContext={async () => {
        // Replace the history snapshot while the editor is opening.
        setItems(current => current.map(item => ({ ...item })))
        return { archetypes: [{ name: 'Dimir Control', colors: ['U', 'B'] }], cards: [] }
      }} onChange={classify}>{trigger}</OpponentArchetypePicker>
  ), [])
  return <HistoryHarness items={items} renderOpponentArchetype={renderEditor} />
}

export const ArchetypeEditor: Story = {
  render: () => <EditableHistoryHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getAllByRole('button', { name: /^Classify opponent in match/ })[0])
    const picker = within(await within(document.body).findByRole('dialog', { name: 'Classify opponent' }))
    await userEvent.type(picker.getByRole('textbox', { name: 'Search archetypes' }), 'Dimir')
    await userEvent.click(picker.getByRole('button', { name: 'Colorless', exact: true }))
    await userEvent.click(picker.getByRole('button', { name: 'G deck color', exact: true }))
    await userEvent.click(await picker.findByRole('option', { name: /^Dimir Control/ }))
    await expect(classify).toHaveBeenCalledWith('Dimir Control', ['G'])
  },
}
