/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

import {
  TRADES_SHOWCASE_PARTNERS,
  TRADES_SHOWCASE_POSTS,
} from '../src/fixtures/layout-showcase'
import { TradesLayout } from '../src/layouts/TradesLayout'
import type { TradePostFormatFilter, TradeView } from '../src/types/trades-page'

const meta = {
  title: 'Trades/Trades layout',
  component: TradesLayout,
  parameters: { layout: 'fullscreen' },
  decorators: [
    Story => (
      <div className="h-[700px] w-[1120px] overflow-hidden bg-background">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TradesLayout>

export default meta
type Story = StoryObj<typeof meta>

function TradesHarness({
  activeView: initialView = 'marketplace' as TradeView,
}: {
  activeView?: TradeView
}) {
  const [activeView, setActiveView] = useState<TradeView>(initialView)
  const [postFormat, setPostFormat] = useState<TradePostFormatFilter>('all')
  const [userSearch, setUserSearch] = useState('')
  const [messageSearch, setMessageSearch] = useState('')
  const [postsPage, setPostsPage] = useState(1)

  return (
    <TradesLayout
      activeView={activeView}
      onActiveViewChange={setActiveView}
      historyContent={
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Trade history host slot
        </div>
      }
      posts={TRADES_SHOWCASE_POSTS}
      postsLoading={false}
      postsPagination={{
        page: postsPage,
        totalPages: 2,
        hasPreviousPage: postsPage > 1,
        hasNextPage: postsPage < 2,
      }}
      postsPage={postsPage}
      onPostsPageChange={setPostsPage}
      postFormat={postFormat}
      onPostFormatChange={setPostFormat}
      userSearch={userSearch}
      onUserSearchChange={setUserSearch}
      messageSearch={messageSearch}
      onMessageSearchChange={setMessageSearch}
      debouncedUserSearch={userSearch}
      debouncedMessageSearch={messageSearch}
      tradePartners={TRADES_SHOWCASE_PARTNERS}
      currentTrade={null}
      myPost={{ posterName: 'You', format: 'Message', message: 'WTS foils' }}
      tradesLoading={false}
      hasTradesSnapshot
      clientReady
      onClearPostFilters={fn()}
    />
  )
}

export const Marketplace: Story = {
  render: () => <TradesHarness activeView="marketplace" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('TraderOne')).toBeVisible()
  },
}

export const Partners: Story = {
  render: () => <TradesHarness activeView="partners" />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByText('Alice').length).toBeGreaterThan(0)
  },
}
