/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page, type Route } from '@playwright/test'

import {
  COLLECTION_SHOWCASE_CARDS,
  COLLECTION_SHOWCASE_PRODUCTS,
} from '../src/fixtures'
import type { CollectionCardEntry } from '../src/types/collection'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const cardImage = fs.readFileSync(path.resolve(dirname, '../src/assets/backface.png'))

/** `data-ui-layout` attribute value on the layout root. */
type LayoutAttr =
  | 'collection'
  | 'match-details'
  | 'replay'
  | 'trade-history'
  | 'history'
  | 'trades'
  | 'dashboard'
  | 'decks'
  | 'deck-editor'
  | 'game-log'
  | 'events'
  | 'event-details'

type Scenario = {
  name: string
  layout: LayoutAttr
  storyId: string
  viewport: { width: number; height: number }
}

function cardDetail(card: CollectionCardEntry) {
  return {
    ...card,
    canonicalName: card.name,
    colors: [],
    imageUrl: `/api/collection/cards/${card.catalogId}/image`,
    setCode: card.setCode ?? '',
    typeLine: card.typeLine ?? '',
    oracleText: card.oracleText ?? '',
  }
}

async function fulfillJson(route: Route, value: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) })
}

async function installFixtures(page: Page, unexpectedExternalRequests: string[]) {
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark')
    document.documentElement.classList.add('dark')
  })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    const pathname = url.pathname

    if (url.hostname === 'r2.videreproject.com') {
      return route.fulfill({ status: 200, contentType: 'image/png', body: cardImage })
    }
    if (url.hostname === 'api.videreproject.com' && pathname.startsWith('/cards/')) {
      return fulfillJson(route, { data: [] })
    }
    if (pathname === '/api/Client/WatchState') {
      return route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson',
        body: `${JSON.stringify({ isConnected: true, isInitialized: true, status: 'ready' })}\n`,
      })
    }
    if (
      /^\/api\/collection\/cards\/(?:texture\/\d+\/image|[^/]+\/(?:image|art))$/.test(pathname) ||
      /^\/api\/collection\/cards\/[^/]+\/image$/.test(pathname)
    ) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: cardImage })
    }
    const faceMatch = pathname.match(/^\/api\/collection\/cards\/(\d+)\/face$/)
    if (faceMatch) return fulfillJson(route, { catalogId: null })
    const detailMatch = pathname.match(/^\/api\/collection\/cards\/(\d+)\/details$/)
    if (detailMatch) {
      const card =
        COLLECTION_SHOWCASE_CARDS.find(item => item.catalogId === Number(detailMatch[1])) ??
        COLLECTION_SHOWCASE_CARDS[0]
      return fulfillJson(route, cardDetail(card))
    }
    const historyMatch = pathname.match(/^\/api\/collection\/prices\/(\d+)\/history$/)
    if (historyMatch) {
      const card =
        COLLECTION_SHOWCASE_CARDS.find(item => item.catalogId === Number(historyMatch[1])) ??
        COLLECTION_SHOWCASE_CARDS[0]
      return fulfillJson(route, {
        catalogId: card.catalogId,
        priceCacheExpiresAt: '2099-01-01T00:00:00Z',
        prices: card.prices ?? [],
      })
    }
    if (pathname === '/api/collection/cards') {
      const cards = COLLECTION_SHOWCASE_CARDS.map(card => ({
        ...card,
        price: card.price ?? card.prices?.at(-1)?.price ?? null,
      }))
      return fulfillJson(route, {
        hash: 'visual-fixture',
        itemCount: cards.length,
        uniqueCount: cards.length,
        totalQuantity: cards.reduce((sum, card) => sum + card.quantity, 0),
        timestamp: '2026-08-09T12:00:00Z',
        priceCacheExpiresAt: '2099-01-01T00:00:00Z',
        elapsedMilliseconds: 1,
        cards,
        products: COLLECTION_SHOWCASE_PRODUCTS,
      })
    }
    if (pathname.includes('/api/')) return fulfillJson(route, {})
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      unexpectedExternalRequests.push(url.toString())
      return route.abort('blockedbyclient')
    }
    return route.continue()
  })
}

async function waitForStableUi(page: Page) {
  for (let pass = 0; pass < 3; pass += 1) {
    await page.waitForFunction(async () => {
      await document.fonts.ready
      const images = Array.from(document.images)
      await Promise.all(
        images.map(async image => {
          if (!image.complete) {
            await new Promise(resolve => {
              image.addEventListener('load', resolve, { once: true })
              image.addEventListener('error', resolve, { once: true })
            })
          }
          if (image.complete && image.naturalWidth > 0) await image.decode().catch(() => undefined)
        }),
      )
      return true
    })
    await page.waitForTimeout(200)
  }
  await page.waitForTimeout(1_000)
}

const scenarios: Scenario[] = [
  // Existing baselines
  {
    name: 'collection-default',
    layout: 'collection',
    storyId: 'collection-collection-layout--default-selected-card',
    viewport: { width: 1120, height: 695 },
  },
  {
    name: 'collection-products',
    layout: 'collection',
    storyId: 'collection-collection-layout--products',
    viewport: { width: 1120, height: 695 },
  },
  {
    name: 'collection-sort-open',
    layout: 'collection',
    storyId: 'collection-collection-layout--sort-menu-open',
    viewport: { width: 1120, height: 695 },
  },
  {
    name: 'collection-text-scroll-fade',
    layout: 'collection',
    storyId: 'collection-collection-layout--scrollable-rules-text-fade',
    viewport: { width: 1120, height: 695 },
  },
  {
    name: 'trade-player',
    layout: 'trade-history',
    storyId: 'trades-trade-history-layout--player-selected',
    viewport: { width: 1120, height: 700 },
  },
  {
    name: 'trade-product',
    layout: 'trade-history',
    storyId: 'trades-trade-history-layout--product-escrow-selected',
    viewport: { width: 1120, height: 700 },
  },
  {
    name: 'match-game-1',
    layout: 'match-details',
    storyId: 'match-match-details-layout--first-game-no-sideboarding',
    viewport: { width: 1120, height: 720 },
  },
  {
    name: 'match-game-2',
    layout: 'match-details',
    storyId: 'match-match-details-layout--second-game',
    viewport: { width: 1120, height: 720 },
  },
  {
    name: 'match-archetype-editor',
    layout: 'match-details',
    storyId: 'match-match-details-layout--archetype-editor',
    viewport: { width: 1120, height: 720 },
  },
  {
    name: 'match-wide-full-hand',
    layout: 'match-details',
    storyId: 'match-match-details-layout--wide-desktop-full-hand',
    viewport: { width: 1638, height: 720 },
  },
  {
    name: 'replay-initial',
    layout: 'replay',
    storyId: 'replay-replay-layout--initial-snapshot',
    viewport: { width: 1120, height: 736 },
  },
  {
    name: 'replay-prompt',
    layout: 'replay',
    storyId: 'replay-replay-layout--prompt-snapshot',
    viewport: { width: 1120, height: 736 },
  },
  {
    name: 'replay-final',
    layout: 'replay',
    storyId: 'replay-replay-layout--final-snapshot',
    viewport: { width: 1120, height: 736 },
  },

  // Product layouts
  {
    name: 'history-default',
    layout: 'history',
    storyId: 'history-history-layout--default',
    viewport: { width: 1120, height: 700 },
  },
  {
    name: 'trades-marketplace',
    layout: 'trades',
    storyId: 'trades-trades-layout--marketplace',
    viewport: { width: 1120, height: 700 },
  },
  {
    name: 'trades-partners',
    layout: 'trades',
    storyId: 'trades-trades-layout--partners',
    viewport: { width: 1120, height: 700 },
  },
  {
    name: 'dashboard-default',
    layout: 'dashboard',
    storyId: 'dashboard-dashboard-layout--default',
    viewport: { width: 1120, height: 720 },
  },
  {
    name: 'decks-gallery',
    layout: 'decks',
    storyId: 'decks-decks-layout--gallery',
    viewport: { width: 1120, height: 700 },
  },
  {
    name: 'deck-editor-default',
    layout: 'deck-editor',
    storyId: 'decks-deck-editor-layout--default',
    viewport: { width: 1120, height: 720 },
  },
  {
    name: 'game-log-default',
    layout: 'game-log',
    storyId: 'game-log-game-log-layout--default',
    viewport: { width: 1120, height: 700 },
  },
  {
    name: 'events-list',
    layout: 'events',
    storyId: 'events-events-layout--list',
    viewport: { width: 1120, height: 720 },
  },
  {
    name: 'event-details-default',
    layout: 'event-details',
    storyId: 'events-events-layout--event-details',
    viewport: { width: 1120, height: 720 },
  },
]

for (const scenario of scenarios) {
  test(scenario.name, async ({ page }) => {
    await page.setViewportSize(scenario.viewport)
    const unexpectedExternalRequests: string[] = []
    await installFixtures(page, unexpectedExternalRequests)
    await page.goto(
      `http://127.0.0.1:6006/iframe.html?id=${scenario.storyId}&viewMode=story&globals=theme:dark`,
    )
    await page.locator('#storybook-root').waitFor()
    await page.locator(`[data-ui-layout="${scenario.layout}"]`).waitFor()
    await page.mouse.move(scenario.viewport.width - 1, scenario.viewport.height - 1)
    await waitForStableUi(page)
    expect(unexpectedExternalRequests, 'visual tests must not make unhandled external requests').toEqual(
      [],
    )
    await expect(page).toHaveScreenshot(`${scenario.name}.png`)
  })
}
