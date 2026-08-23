/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import {
  TRADE_HISTORY_SHOWCASE_CANCELLED_ID,
  TRADE_HISTORY_SHOWCASE_DEFAULT_ID,
  TRADE_HISTORY_SHOWCASE_DETAILS,
  TRADE_HISTORY_SHOWCASE_PRODUCT_ID,
  TRADE_HISTORY_SHOWCASE_SECOND_PRODUCT_ID,
  TRADE_HISTORY_SHOWCASE_TRADES,
} from '../src/fixtures/trade-history-showcase'
import { TradeHistoryLayout } from '../src/layouts/TradeHistoryLayout'
import type {
  TradeEscrowKind,
  TradeEscrowResult,
  TradeHistoryDetail,
  TradeHistoryLayoutProps,
} from '../src/types/trade'

const meta = {
  title: 'Trades/Trade history layout',
  component: TradeHistoryLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-[680px] w-[1120px] overflow-hidden bg-background p-4"><Story /></div>],
  args: {
    trades: [...TRADE_HISTORY_SHOWCASE_TRADES],
    selectedId: TRADE_HISTORY_SHOWCASE_DEFAULT_ID,
    detail: TRADE_HISTORY_SHOWCASE_DETAILS[TRADE_HISTORY_SHOWCASE_DEFAULT_ID],
    search: '',
    kind: 'all',
    result: 'all',
    onSelectedIdChange: fn(),
    onSearchChange: fn(),
    onKindChange: fn(),
    onResultChange: fn(),
    onClearFilters: fn(),
  },
} satisfies Meta<typeof TradeHistoryLayout>

export default meta
type Story = StoryObj<typeof meta>

interface HarnessProps extends Omit<TradeHistoryLayoutProps, 'selectedId' | 'detail' | 'search' | 'kind' | 'result'> {
  initialSelectedId?: number | null
  initialSearch?: string
  initialKind?: 'all' | TradeEscrowKind
  initialResult?: 'all' | TradeEscrowResult
  detailById?: Readonly<Record<number, TradeHistoryDetail>>
  onSelection?: (id: number) => void
  onSearch?: (value: string) => void
  onKind?: (value: 'all' | TradeEscrowKind) => void
  onResult?: (value: 'all' | TradeEscrowResult) => void
  onClear?: () => void
}

function TradeHistoryHarness({
  initialSelectedId = TRADE_HISTORY_SHOWCASE_DEFAULT_ID,
  initialSearch = '',
  initialKind = 'all',
  initialResult = 'all',
  detailById = TRADE_HISTORY_SHOWCASE_DETAILS,
  onSelection,
  onSearch,
  onKind,
  onResult,
  onClear,
  ...props
}: HarnessProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const [search, setSearch] = useState(initialSearch)
  const [kind, setKind] = useState<'all' | TradeEscrowKind>(initialKind)
  const [result, setResult] = useState<'all' | TradeEscrowResult>(initialResult)

  return (
    <TradeHistoryLayout
      {...props}
      selectedId={selectedId}
      detail={selectedId === null ? null : detailById[selectedId] ?? null}
      search={search}
      kind={kind}
      result={result}
      onSelectedIdChange={id => {
        setSelectedId(id)
        onSelection?.(id)
      }}
      onSearchChange={value => {
        setSearch(value)
        onSearch?.(value)
      }}
      onKindChange={value => {
        setKind(value)
        onKind?.(value)
      }}
      onResultChange={value => {
        setResult(value)
        onResult?.(value)
      }}
      onClearFilters={() => {
        setSearch('')
        setKind('all')
        setResult('all')
        onClear?.()
      }}
    />
  )
}

const fixtureProps = { trades: [...TRADE_HISTORY_SHOWCASE_TRADES] }

export const PlayerSelected: Story = {
  render: () => <TradeHistoryHarness {...fixtureProps} />,
  play: async ({ canvasElement }) => {
    const detail = TRADE_HISTORY_SHOWCASE_DETAILS[TRADE_HISTORY_SHOWCASE_DEFAULT_ID]
    await expect(detail.items.some(item => item.role === 'LocalOffer')).toBe(true)
    await expect(detail.items.some(item => item.role === 'RemoteOffer')).toBe(true)
    const expectedAvatars = [
      ['FblthpTradeBot', 125478],
      ['MoxMarketBot', 35842],
      ['DraftTrade_42', 150290],
      ['PauperStaplesBot', 93872],
      ['VintageSinglesBot', 52553],
    ] as const

    for (const [partnerName, catalogId] of expectedAvatars) {
      const avatar = within(canvasElement).getByRole('img', { name: `${partnerName} avatar` })
      await expect(avatar.querySelector('img')).toHaveAttribute(
        'src',
        `https://r2.videreproject.com/products/${catalogId}-300px.png`,
      )
    }

    const selectedRow = within(canvasElement).getByRole('row', { name: /FblthpTradeBot/ })
    const title = within(selectedRow).getByText('FblthpTradeBot')
    await expect(title.getBoundingClientRect().width).toBeGreaterThan(160)
  },
}

export const ProductEscrowSelected: Story = {
  render: () => <TradeHistoryHarness {...fixtureProps} initialSelectedId={TRADE_HISTORY_SHOWCASE_PRODUCT_ID} />,
  play: async () => {
    const detail = TRADE_HISTORY_SHOWCASE_DETAILS[TRADE_HISTORY_SHOWCASE_PRODUCT_ID]
    await expect(detail.items.some(item => item.role === 'LocalOffer')).toBe(true)
    await expect(detail.items.some(item => item.role === 'InferredOutput')).toBe(true)
    const outputs = detail.items.filter(item => item.role === 'InferredOutput')
    await expect(outputs).toHaveLength(4)
    await expect(outputs.find(item => item.name === 'Play Point')?.quantity).toBe(5)
  },
}

export const SecondProductEscrow: Story = {
  render: () => <TradeHistoryHarness {...fixtureProps} initialSelectedId={TRADE_HISTORY_SHOWCASE_SECOND_PRODUCT_ID} />,
  play: async () => {
    const draftBoosters = Object.values(TRADE_HISTORY_SHOWCASE_DETAILS)
      .filter(detail => detail.summary.productName?.endsWith('Draft Booster'))
    await expect(draftBoosters).toHaveLength(2)
    for (const booster of draftBoosters) {
      const outputs = booster.items.filter(item => item.role === 'InferredOutput')
      await expect(outputs.filter(item => item.rarity === 'common' && item.objectType !== 'Basic land')).toHaveLength(10)
      await expect(outputs.filter(item => item.rarity === 'uncommon')).toHaveLength(3)
      await expect(outputs.filter(item => item.rarity === 'rare' || item.rarity === 'mythic')).toHaveLength(1)
      await expect(outputs.filter(item => item.objectType === 'Basic land')).toHaveLength(1)
    }

    const playBooster = TRADE_HISTORY_SHOWCASE_DETAILS[TRADE_HISTORY_SHOWCASE_SECOND_PRODUCT_ID]
    const playOutputs = playBooster.items.filter(item => item.role === 'InferredOutput')
    await expect(playBooster.summary.productName).toBe("Marvel's Spider-Man Play Booster")
    await expect(playOutputs).toHaveLength(14)
    await expect(playOutputs.filter(item => item.rarity === 'common' && !item.objectType)).toHaveLength(7)
    await expect(playOutputs.filter(item => item.rarity === 'uncommon' && !item.objectType)).toHaveLength(3)
    await expect(playOutputs.filter(item => (item.rarity === 'rare' || item.rarity === 'mythic') && !item.objectType)).toHaveLength(1)
    await expect(playOutputs.filter(item => item.objectType === 'Wildcard')).toHaveLength(1)
    await expect(playOutputs.filter(item => item.objectType === 'Traditional foil')).toHaveLength(1)
    await expect(playOutputs.filter(item => item.objectType === 'Basic land')).toHaveLength(1)
  },
}

export const CancelledTransaction: Story = {
  render: () => <TradeHistoryHarness {...fixtureProps} initialSelectedId={TRADE_HISTORY_SHOWCASE_CANCELLED_ID} />,
  play: async ({ canvasElement }) => {
    const cancelledRow = within(canvasElement).getByRole('row', { name: /DraftTrade_42/ })
    await expect(cancelledRow).toHaveTextContent('—')
    const detail = TRADE_HISTORY_SHOWCASE_DETAILS[TRADE_HISTORY_SHOWCASE_CANCELLED_ID]
    await expect(detail.summary.outgoingQuantity).toBe(0)
    await expect(detail.summary.incomingQuantity).toBe(0)
    await expect(detail.effects).toHaveLength(0)
  },
}

export const EnabledFiltersOpenSelect: Story = {
  parameters: { a11y: { disable: true } },
  render: () => <TradeHistoryHarness {...fixtureProps} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('combobox', { name: 'Filter trade type' }))
    await expect(within(document.body).getByRole('option', { name: 'Player trades' })).toBeVisible()
  },
}

export const DisabledShowcaseFilters: Story = {
  render: () => <TradeHistoryHarness {...fixtureProps} filtersDisabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('searchbox', { name: 'Search trade history' })).toBeDisabled()
    await expect(canvas.getByRole('combobox', { name: 'Filter trade type' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Clear trade history filters' })).toBeDisabled()
    await userEvent.click(canvas.getByRole('row', { name: /Escrow 982405/ }))
    await expect(canvas.getAllByText('Received')[0]).toBeVisible()
  },
}

export const RowSelectionInteractions: Story = {
  render: () => <TradeHistoryHarness {...fixtureProps} onSelection={meta.args.onSelectedIdChange} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const productRow = canvas.getByRole('row', { name: /Escrow 982405/ })
    productRow.focus()
    await userEvent.keyboard('{Enter}')
    await expect(meta.args.onSelectedIdChange).toHaveBeenCalledWith(TRADE_HISTORY_SHOWCASE_PRODUCT_ID)
    await expect(canvas.getAllByText('Received')[0]).toBeVisible()
  },
}

export const FilterInteractions: Story = {
  render: () => (
    <TradeHistoryHarness
      {...fixtureProps}
      onSearch={meta.args.onSearchChange}
      onKind={meta.args.onKindChange}
      onResult={meta.args.onResultChange}
      onClear={meta.args.onClearFilters}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByRole('searchbox', { name: 'Search trade history' }), 'Lotus')
    await expect(meta.args.onSearchChange).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('combobox', { name: 'Filter trade type' }))
    await userEvent.click(within(document.body).getByRole('option', { name: 'Player trades' }))
    await expect(meta.args.onKindChange).toHaveBeenCalledWith('Player')
    await userEvent.click(canvas.getByRole('combobox', { name: 'Filter trade result' }))
    await userEvent.click(within(document.body).getByRole('option', { name: 'Completed' }))
    await expect(meta.args.onResultChange).toHaveBeenCalledWith('Completed')
    await userEvent.click(canvas.getByRole('button', { name: 'Clear trade history filters' }))
    await expect(meta.args.onClearFilters).toHaveBeenCalled()
  },
}

const errorDetail: TradeHistoryDetail = {
  ...TRADE_HISTORY_SHOWCASE_DETAILS[TRADE_HISTORY_SHOWCASE_DEFAULT_ID],
  errors: [{
    id: 1,
    observedAt: '2026-08-08T19:42:56.000Z',
    errorCode: 17,
    errorName: 'Partner changed the proposed trade',
  }],
}

export const ChatAndErrors: Story = {
  render: () => <TradeHistoryHarness {...fixtureProps} detailById={{ ...TRADE_HISTORY_SHOWCASE_DETAILS, [TRADE_HISTORY_SHOWCASE_DEFAULT_ID]: errorDetail }} />,
}

export const Loading: Story = {
  render: () => <TradeHistoryHarness trades={[]} initialSelectedId={null} loading detailLoading />,
}

export const Empty: Story = {
  render: () => <TradeHistoryHarness trades={[]} initialSelectedId={null} />,
}

export const Failure: Story = {
  render: () => <TradeHistoryHarness trades={[]} initialSelectedId={null} error="Fixture history request failed" />,
}

export const LoadMore: Story = {
  render: () => <TradeHistoryHarness {...fixtureProps} hasMore onLoadMore={meta.args.onClearFilters} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Load older trades' }))
    await expect(meta.args.onClearFilters).toHaveBeenCalled()
  },
}

export const StaleDetailSuppressed: Story = {
  args: {
    ...meta.args,
    selectedId: TRADE_HISTORY_SHOWCASE_PRODUCT_ID,
    detail: TRADE_HISTORY_SHOWCASE_DETAILS[TRADE_HISTORY_SHOWCASE_DEFAULT_ID],
    detailLoading: true,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByText('FblthpTradeBot', { selector: 'h3' })).not.toBeInTheDocument()
  },
}
