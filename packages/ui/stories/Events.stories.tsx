/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

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
