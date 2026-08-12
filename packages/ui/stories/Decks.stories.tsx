/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

import { DECKS_SHOWCASE_ITEMS, SHOWCASE_FORMATS } from '../src/fixtures/layout-showcase'
import { DecksLayout } from '../src/layouts/DecksLayout'
import type { GameType } from '../src/components/filters/GameTypeFormatFilter'
import backfaceUrl from '../src/assets/backface.png'

const meta = {
  title: 'Decks/Decks layout',
  component: DecksLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [
    Story => (
      <div className="h-[700px] w-[1120px] overflow-auto bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DecksLayout>

export default meta
type Story = StoryObj<typeof meta>

const decksWithArt = DECKS_SHOWCASE_ITEMS.map(deck => ({
  ...deck,
  imageUrl: backfaceUrl,
  featuredCards: deck.featuredCards?.map(card => ({ ...card, imageUrl: backfaceUrl })),
}))

function DecksHarness() {
  const [gameType, setGameType] = useState<GameType>('All')
  const [selectedFormat, setSelectedFormat] = useState('')
  const [query, setQuery] = useState('')

  return (
    <DecksLayout
      decks={decksWithArt}
      formats={[...SHOWCASE_FORMATS]}
      selectedFormat={selectedFormat}
      onFormatChange={setSelectedFormat}
      gameType={gameType}
      onGameTypeChange={setGameType}
      query={query}
      onQueryChange={setQuery}
      loading={false}
      onDeckClick={fn()}
      onCreateDeck={fn()}
    />
  )
}

export const Gallery: Story = {
  render: () => <DecksHarness />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole('button', { name: /Open Rakdos Scam/i }),
    ).toBeVisible()
  },
}
