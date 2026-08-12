/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

import { GAME_LOG_SHOWCASE_ENTRIES } from '../src/fixtures/layout-showcase'
import { GameLogLayout } from '../src/layouts/GameLogLayout'

const meta = {
  title: 'Game log/Game log layout',
  component: GameLogLayout,
  parameters: {
    layout: 'fullscreen',
    // Dense log chrome intentionally uses low-emphasis timestamps (same class of
    // exception as Replay board annotations).
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  decorators: [
    Story => (
      <div className="h-[700px] w-[1120px] overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GameLogLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    entries: GAME_LOG_SHOWCASE_ENTRIES,
    title: 'Game 1 Log',
    matchId: 9001,
    connected: true,
    liveEventCount: 3,
    loading: false,
    onBack: fn(),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText(/Game 1 Log/i)).toBeVisible()
  },
}

export const Disconnected: Story = {
  args: {
    ...Default.args,
    connected: false,
    liveEventCount: 0,
  },
}
