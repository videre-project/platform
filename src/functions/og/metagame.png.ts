/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  createMetagameSearchParameters,
  readMetagameShareParameters,
} from '../../utils/metagameShareParameters'
import { getSecondsUntilNextMetagameRefresh } from '../../utils/metagameCacheSchedule'

interface BrowserRunBinding {
  quickAction(action: 'screenshot', options: Record<string, unknown>): Promise<Response>
}

interface PagesAssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>
}

interface MetagameImageContext {
  request: Request
  env: {
    ASSETS: PagesAssetsBinding
    BROWSER: BrowserRunBinding
  }
  waitUntil(promise: Promise<unknown>): void
}

async function fallbackImage(
  requestUrl: URL,
  env: MetagameImageContext['env'],
  cacheSeconds: number,
) {
  const fallback = await env.ASSETS.fetch(new URL('/og-image.png', requestUrl))
  const response = new Response(fallback.body, fallback)
  response.headers.set('Cache-Control', `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`)
  response.headers.set('X-Metagame-Image-Fallback', 'true')
  return response
}

export async function onRequestGet({
  request,
  env,
  waitUntil,
}: MetagameImageContext): Promise<Response> {
  const requestUrl = new URL(request.url)
  const cacheSeconds = getSecondsUntilNextMetagameRefresh()
  const state = readMetagameShareParameters(requestUrl.searchParams)
  const parameters = createMetagameSearchParameters(state)
  parameters.set('v', '5')

  const cacheUrl = new URL('/og/metagame.png', requestUrl.origin)
  cacheUrl.search = parameters.toString()
  const cacheKey = new Request(cacheUrl, { method: 'GET' })
  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  const renderUrl = new URL('/__og/metagame', requestUrl.origin)
  renderUrl.search = parameters.toString()

  try {
    const screenshot = await env.BROWSER.quickAction('screenshot', {
      url: renderUrl.toString(),
      waitForSelector: {
        selector: '.metagame-og-image[data-metagame-og-ready="true"]',
        visible: true,
        timeout: 60000,
      },
      viewport: {
        width: 1400,
        height: 900,
        deviceScaleFactor: 1,
      },
      gotoOptions: {
        waitUntil: 'networkidle2',
        timeout: 60000,
      },
      screenshotOptions: {
        type: 'png',
        captureBeyondViewport: true,
      },
      selector: '.metagame-chart-section.is-static-render',
      actionTimeout: 60000,
      cacheTTL: cacheSeconds,
    })
    if (!screenshot.ok || !screenshot.body) return fallbackImage(requestUrl, env, cacheSeconds)

    const response = new Response(screenshot.body, {
      status: 200,
      headers: screenshot.headers,
    })
    response.headers.set('Content-Type', 'image/png')
    response.headers.set('Cache-Control', `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`)
    response.headers.set('Content-Disposition', 'inline; filename="metagame.png"')
    waitUntil(caches.default.put(cacheKey, response.clone()))
    return response
  } catch {
    return fallbackImage(requestUrl, env, cacheSeconds)
  }
}
