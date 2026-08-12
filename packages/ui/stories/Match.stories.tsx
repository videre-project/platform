/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { GameReviewPanel } from '../src/components/match/GameReviewPanel'
import { MatchDeckCard } from '../src/components/match/MatchDeckCard'
import { MATCH_DETAILS_SHOWCASE } from '../src/fixtures/product-showcase-data'
import { MatchDetailsLayout } from '../src/layouts/MatchDetailsLayout'

const meta = {
  title: 'Match/Match details layout',
  component: MatchDetailsLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-[680px] w-screen overflow-hidden bg-background"><Story /></div>],
} satisfies Meta<typeof MatchDetailsLayout>

export default meta
type Story = StoryObj<typeof meta>

const actions = {
  onBack: fn(),
  onWatchLive: fn(),
  onOpenDeck: fn(),
  onGameLog: fn(),
  onReplay: fn(),
  onGameChange: fn(),
  onOpponentArchetypeChange: fn(),
}

export const SecondGame: Story = { args: { match: MATCH_DETAILS_SHOWCASE, initialGameId: 'game-2', ...actions } }
export const FirstGameNoSideboarding: Story = { args: { match: MATCH_DETAILS_SHOWCASE, initialGameId: 'game-1', ...actions } }
export const ThirdGame: Story = { args: { match: MATCH_DETAILS_SHOWCASE, initialGameId: 'game-3', ...actions } }

/** Regression coverage for the wide desktop layout: all seven cards and both actions fit. */
export const WideDesktopFullHand: Story = {
  args: { match: MATCH_DETAILS_SHOWCASE, initialGameId: 'game-1', ...actions },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvasElement.querySelectorAll('[data-opening-hand-card]')).toHaveLength(7)
    await expect(canvas.getByRole('button', { name: 'Game Log' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Replay' })).toBeVisible()
  },
}

export const NavigationActions: Story = {
  args: { match: MATCH_DETAILS_SHOWCASE, initialGameId: 'game-2', ...actions },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: /Game 1 Win On the Play 9m 7s/ }))
    await expect(args.onGameChange).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Replay' }))
    await expect(args.onReplay).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Watch Live' }))
    await expect(args.onWatchLive).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
    await expect(args.onBack).toHaveBeenCalled()
  },
}

export const ArchetypeEditor: Story = {
  args: { match: MATCH_DETAILS_SHOWCASE, initialGameId: 'game-2', ...actions, onOpponentArchetypeChange: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByTitle('Edit opponent archetype'))
    await expect(within(document.body).getByText('Edit Opponent Archetype')).toBeVisible()
  },
}

export const ReviewPanel: Story = {
  render: () => {
    const game = MATCH_DETAILS_SHOWCASE.games[1]
    return <div className="h-[620px] w-[780px]"><GameReviewPanel openingHandCards={game.openingHand.map((card, index) => ({ ...card, key: `${card.catalogId}-${index}`, bottomed: Boolean(card.bottomed) }))} sideboardingDiff={{ in: game.sideboarding.in.map((card, index) => ({ ...card, key: `in-${index}`, quantity: card.quantity ?? 1 })), out: game.sideboarding.out.map((card, index) => ({ ...card, key: `out-${index}`, quantity: card.quantity ?? 1 })), emptyMessage: 'No sideboarding recorded.' }} /></div>
  },
}

export const DeckCard: Story = {
  render: () => <div className="w-72 p-4"><MatchDeckCard deckName={MATCH_DETAILS_SHOWCASE.deckName} deckArchetype={MATCH_DETAILS_SHOWCASE.deckArchetype} deckColors={MATCH_DETAILS_SHOWCASE.deckColors} previewCards={MATCH_DETAILS_SHOWCASE.deckPreviewCards} onOpen={fn()} /></div>,
}
