/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test'

import { CollectionLayout } from '../src/layouts/CollectionLayout'
import { CollectionPriceHistoryPanel } from '../src/components/collection/CollectionPriceHistoryPanel'
import { CollectionToolbar } from '../src/components/collection/CollectionToolbar'
import { VirtualCollectionGrid } from '../src/components/collection/VirtualCollectionGrid'
import { COLLECTION_SHOWCASE_CARDS, COLLECTION_SHOWCASE_PRODUCTS } from '../src/fixtures/product-showcase-data'
import backfaceUrl from '../src/assets/backface.png'

const meta = {
  title: 'Collection/Collection layout',
  component: CollectionLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-[655px] w-[1120px] overflow-hidden bg-background"><Story /></div>],
} satisfies Meta<typeof CollectionLayout>

export default meta
type Story = StoryObj<typeof meta>

const visualCollectionCards = COLLECTION_SHOWCASE_CARDS.map(card => ({ ...card, imageUrl: backfaceUrl }))
const longRulesCard = {
  ...visualCollectionCards[0],
  oracleText: Array.from({ length: 8 }, () => visualCollectionCards[0].oracleText).join('\n'),
}

const baseArgs = {
  cards: visualCollectionCards,
  products: COLLECTION_SHOWCASE_PRODUCTS,
  initialSelectedCatalogId: 147729,
  initialSortMode: 'price' as const,
  initialSortDirection: 'desc' as const,
  onCloseDetails: fn(),
}

export const DefaultSelectedCard: Story = { args: baseArgs }

export const SearchResults: Story = {
  args: { ...baseArgs, defaultSearch: 'Spider' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByDisplayValue('Spider')).toBeVisible()
  },
}

export const Products: Story = {
  args: { ...baseArgs, defaultViewMode: 'products', initialSelectedCatalogId: undefined, initialSortMode: 'name', initialSortDirection: 'asc' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('tab', { name: 'Products' })).toHaveAttribute('aria-selected', 'true')
  },
}

export const SortMenuOpen: Story = {
  args: { ...baseArgs, initialSelectedCatalogId: undefined },
  parameters: { a11y: { disable: true } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox', { name: 'Sort collection by' }))
    await expect(within(document.body).getByRole('option', { name: 'Quantity' })).toBeVisible()
  },
}

export const NameSort: Story = { args: { ...baseArgs, initialSortMode: 'name', initialSortDirection: 'asc' } }
export const QuantitySort: Story = { args: { ...baseArgs, initialSortMode: 'quantity', initialSortDirection: 'desc' } }

export const Interactions: Story = {
  args: { ...baseArgs, onSelectionChange: fn(), onSortModeChange: fn(), onCloseDetails: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByPlaceholderText('Search cards'), 'Lightning')
    await userEvent.click(canvas.getByTitle(/Lightning Bolt/))
    await expect(args.onSelectionChange).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Close price history' }))
    await expect(args.onCloseDetails).toHaveBeenCalledOnce()
  },
}

export const CloseDisabled: Story = { args: { ...baseArgs, onCloseDetails: fn(), detailsCloseDisabled: true } }
export const ActiveFilter: Story = { args: { ...baseArgs, activeFilterCount: 3 } }
export const Loading: Story = { args: { ...baseArgs, cards: [], initialSelectedCatalogId: undefined, loading: true } }
export const Error: Story = { args: { ...baseArgs, error: 'Collection search failed: fixture error' } }

export const PricePanel: Story = {
  render: () => <div className="ml-auto h-[655px] w-96"><CollectionPriceHistoryPanel card={visualCollectionCards[0]} onClose={fn()} /></div>,
}

export const ScrollableRulesText: Story = {
  render: () => (
    <div className="ml-auto h-[655px] w-96">
      <CollectionPriceHistoryPanel card={longRulesCard} onClose={fn()} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rulesText = canvas.getByLabelText(`${visualCollectionCards[0].name} rules text`)
    await waitFor(() => expect(canvas.getByTestId('collection-text-scroll-fade')).toBeVisible())
    rulesText.scrollTop = rulesText.scrollHeight
    await fireEvent.scroll(rulesText)
    await expect(canvas.queryByTestId('collection-text-scroll-fade')).not.toBeInTheDocument()
  },
}

export const ScrollableRulesTextFade: Story = {
  render: () => <div data-ui-layout="collection" className="ml-auto h-[655px] w-96"><CollectionPriceHistoryPanel card={longRulesCard} onClose={fn()} /></div>,
}

export const Toolbar: Story = {
  render: () => <div className="p-4"><CollectionToolbar search="" sortMode="price" sortDirection="desc" onSearchChange={fn()} onSortModeChange={fn()} onSortDirectionChange={fn()} /></div>,
}

export const Grid: Story = {
  render: () => <div className="h-[600px] w-[720px]"><VirtualCollectionGrid items={visualCollectionCards} selectedCatalogId={147729} onSelectItem={fn()} /></div>,
}
