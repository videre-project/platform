/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

import { DECK_EDITOR_SHOWCASE_CARDS } from '../src/fixtures/layout-showcase'
import { DeckEditorLayout } from '../src/layouts/DeckEditorLayout'
import type { DeckSortMode, DeckSidePanelView } from '../src/types/decks'
import backfaceUrl from '../src/assets/backface.png'

const meta = {
  title: 'Decks/Deck editor layout',
  component: DeckEditorLayout,
  parameters: {
    layout: 'fullscreen',
    // Zone labels and density chrome use low-emphasis text by design.
    a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } },
  },
  decorators: [
    Story => (
      <div className="h-[720px] w-[1120px] overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeckEditorLayout>

export default meta
type Story = StoryObj<typeof meta>

const cards = DECK_EDITOR_SHOWCASE_CARDS.map(card => ({ ...card, imageUrl: backfaceUrl }))

function DeckEditorHarness() {
  const [sortMode, setSortMode] = useState<DeckSortMode>('cmc')
  const [sidePanelView, setSidePanelView] = useState<DeckSidePanelView>('cards')
  const [sideboardCollapsed, setSideboardCollapsed] = useState(false)
  const [toolsCollapsed, setToolsCollapsed] = useState(false)

  return (
    <DeckEditorLayout
      deckName="Showcase Red Deck"
      headerContext={
        <div className="text-sm font-semibold text-foreground">Showcase Red Deck</div>
      }
      archetype="Aggro"
      colors={['R']}
      timestamp="2026-08-01T12:00:00.000Z"
      mainCount={28}
      sideCount={5}
      loadingHeader={false}
      cards={cards}
      cardsLoading={false}
      sortMode={sortMode}
      onSortModeChange={setSortMode}
      sideboardCollapsed={sideboardCollapsed}
      onSideboardCollapsedChange={setSideboardCollapsed}
      toolsCollapsed={toolsCollapsed}
      onToolsCollapsedChange={setToolsCollapsed}
      sidePanelView={sidePanelView}
      onSidePanelViewChange={setSidePanelView}
      historyData={null}
      historyLoading={false}
      searchResults={[]}
      searchLoading={false}
      onSearchQueryChange={fn()}
      onBack={fn()}
      onCopyList={fn()}
      onExportList={fn()}
      canExport
      copiedList={false}
      onArchetypeChange={fn()}
    />
  )
}

export const Default: Story = {
  render: () => <DeckEditorHarness />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Showcase Red Deck')).toBeVisible()
  },
}
