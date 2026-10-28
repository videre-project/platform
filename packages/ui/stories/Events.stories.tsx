/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'

import {
  EVENT_DETAILS_SHOWCASE_STANDINGS,
  EVENTS_SHOWCASE_ITEMS,
} from '../src/fixtures/layout-showcase'
import { EventsLayout } from '../src/layouts/EventsLayout'
import { EventDetailsLayout } from '../src/layouts/EventDetailsLayout'

const meta = {
  title: 'Events/Events layout',
  component: EventsLayout,
  parameters: {
    layout: 'fullscreen',
    // Completed timeline rows are intentionally dimmed (opacity).
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  decorators: [
    Story => (
      <div className="h-[720px] w-[1120px] overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EventsLayout>

export default meta
type Story = StoryObj<typeof meta>

function EventsHarness() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>('ev-1')
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

  return (
    <EventsLayout
      events={EVENTS_SHOWCASE_ITEMS}
      timelineEvents={EVENTS_SHOWCASE_ITEMS}
      loading={false}
      selectedEventId={selectedEventId}
      onSelectedEventIdChange={setSelectedEventId}
      hoveredEventId={hoveredEventId}
      onHoveredEventIdChange={setHoveredEventId}
      activeEventIds={new Set(['ev-1'])}
      entryFees={{ 'ev-1': '10 tix', 'ev-2': 'Free', 'ev-3': '5 tix' }}
      selectedEventDetails={{ entryFee: '10 tix', prizes: { '1st': '100 tix' }, loading: false }}
      onViewTournament={fn()}
    />
  )
}

export const List: Story = {
  render: () => <EventsHarness />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText('Modern Challenge').length).toBeGreaterThan(0)
  },
}

export const EventDetails: Story = {
  render: () => (
    <div className="h-[720px] w-[1120px] overflow-hidden bg-background">
      <EventDetailsLayout
        event={EVENTS_SHOWCASE_ITEMS[0]}
        standings={EVENT_DETAILS_SHOWCASE_STANDINGS}
        eventsLoading={false}
        standingsLoading={false}
        lastStandingsUpdatedAt="2026-08-01T12:00:00.000Z"
        timerText="12:34"
        playerNamesWithMatchesInProgress={['Player One']}
        onBack={fn()}
      />
    </div>
  ),
  parameters: { layout: 'fullscreen' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Player One')).toBeVisible()
  },
}

function TournamentSelectionHarness() {
  const [player, setPlayer] = useState('Player One')
  const [completed, setCompleted] = useState(false)
  const [reversed, setReversed] = useState(false)
  const standings = reversed
    ? [...EVENT_DETAILS_SHOWCASE_STANDINGS].reverse()
    : EVENT_DETAILS_SHOWCASE_STANDINGS

  return <div data-testid="tournament-container" className="flex h-[720px] w-[720px] flex-col">
    <div className="flex shrink-0 gap-4 p-2">
      <button onClick={() => setReversed(value => !value)}>Reorder standings</button>
      <button onClick={() => setCompleted(true)}>Finish event</button>
    </div>
    <EventDetailsLayout
      event={{ ...EVENTS_SHOWCASE_ITEMS[0], roundNumber: 5, status: completed ? 'completed' : 'active', state: completed ? 'Finished' : 'RoundInProgress' }}
      standings={standings}
      playerNamesWithMatchesInProgress={['Player One']}
      playerDetails={{ player, matches: [], deck: completed ? { mainboard: [], sideboard: [] } : null }}
      onPlayerSelect={setPlayer}
    />
  </div>
}

export const TournamentSelection: Story = {
  render: () => <TournamentSelectionHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const container = canvas.getByTestId('tournament-container')
    const player = canvas.getByRole('button', { name: 'Player One', exact: true })
    const row = player.closest('tr')!
    const panel = () => canvas.getByRole('complementary', { name: 'Player details' })

    await waitFor(() => expect(panel().closest('td')).not.toBeNull())
    await expect(getComputedStyle(row).backgroundColor).toBe('rgba(234, 179, 8, 0.25)')
    await userEvent.click(player)
    await expect(canvas.queryByRole('complementary', { name: 'Player details' })).toBeNull()
    await expect(player).toHaveFocus()
    await expect(player).toHaveAttribute('aria-expanded', 'false')
    await userEvent.keyboard('{Enter}')
    await expect(player).toHaveFocus()
    await expect(player).toHaveAttribute('aria-expanded', 'true')

    // A live reorder must preserve each player's DOM identity.
    await userEvent.click(canvas.getByRole('button', { name: 'Reorder standings' }))
    await expect(canvas.getByRole('button', { name: 'Player One', exact: true })).toBe(player)
    await userEvent.click(canvas.getByRole('button', { name: 'Player Two', exact: true }))
    await userEvent.unhover(player)
    await waitFor(() => expect(getComputedStyle(row).backgroundColor).toBe('rgba(234, 179, 8, 0.15)'))
    await userEvent.click(player)
    await userEvent.unhover(player)
    await waitFor(() => expect(getComputedStyle(row).backgroundColor).toBe('rgba(234, 179, 8, 0.25)'))

    const matchups = canvas.getByRole('tab', { name: 'Matchups', exact: true })
    await userEvent.click(matchups)
    await expect(getComputedStyle(panel().closest('tr')!).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    await userEvent.click(canvas.getByRole('button', { name: 'Finish event' }))
    await expect(matchups).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => expect(getComputedStyle(row).backgroundColor).toBe('rgb(30, 41, 59)'))

    // Resizing changes where the panel renders, without changing its tab.
    container.style.width = '1040px'
    await waitFor(() => expect(panel().closest('td')).toBeNull())
    await expect(canvas.getByRole('tab', { name: 'Matchups', exact: true })).toHaveAttribute('aria-selected', 'true')
    container.style.width = '720px'
    await waitFor(() => expect(panel().closest('td')).not.toBeNull())
    await userEvent.click(player)
    await userEvent.click(player)
    await expect(canvas.getByRole('tab', { name: 'Matchups', exact: true })).toHaveAttribute('aria-selected', 'true')
  },
}
