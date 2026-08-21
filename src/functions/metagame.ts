/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  createMetagameSearchParameters,
  createMetagameShareUrl,
  formatMetagameShareDateRange,
  readMetagameShareParameters,
} from '../utils/metagameShareParameters'

interface PagesAssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>
}

interface MetagamePagesContext {
  request: Request
  env: { ASSETS: PagesAssetsBinding }
}

class ContentAttributeHandler {
  constructor(private readonly content: string) {}

  element(element: Element) {
    element.setAttribute('content', this.content)
  }
}

class TitleHandler {
  constructor(private readonly title: string) {}

  element(element: Element) {
    element.setInnerContent(this.title)
  }
}

class RemoveElementHandler {
  element(element: Element) {
    element.remove()
  }
}

export async function onRequestGet({ request, env }: MetagamePagesContext): Promise<Response> {
  const requestUrl = new URL(request.url)
  const state = readMetagameShareParameters(requestUrl.searchParams)
  const parameters = createMetagameSearchParameters(state)
  const canonicalUrl = createMetagameShareUrl(requestUrl.origin, state)
  const imageUrl = new URL('/og/metagame.png', requestUrl.origin)
  imageUrl.search = parameters.toString()
  imageUrl.searchParams.set('v', '4')

  const dateLabel = formatMetagameShareDateRange(state.dateRange)
  const title = `${state.format} MTGO Metagame — ${dateLabel}`
  const description = `Explore ${state.format} metagame share, win rates, and archetype matchups from ${dateLabel}.`
  const imageAlt = `${state.format} MTGO metagame chart from ${dateLabel}.`
  const assetUrl = new URL('/', requestUrl)
  const shell = await env.ASSETS.fetch(new Request(assetUrl, request))

  const response = new HTMLRewriter()
    .on('title', new TitleHandler(`${title} | Videre Project`))
    .on('meta[name="description"]', new ContentAttributeHandler(description))
    .on('meta[property="og:title"]', new ContentAttributeHandler(title))
    .on('meta[property="og:description"]', new ContentAttributeHandler(description))
    .on('meta[property="og:url"]', new ContentAttributeHandler(canonicalUrl.toString()))
    .on('meta[property="og:image"]', new ContentAttributeHandler(imageUrl.toString()))
    .on('meta[property="og:image:width"]', new RemoveElementHandler())
    .on('meta[property="og:image:height"]', new RemoveElementHandler())
    .on('meta[property="og:image:alt"]', new ContentAttributeHandler(imageAlt))
    .on('meta[name="twitter:title"]', new ContentAttributeHandler(title))
    .on('meta[name="twitter:description"]', new ContentAttributeHandler(description))
    .on('meta[name="twitter:image"]', new ContentAttributeHandler(imageUrl.toString()))
    .transform(shell)

  response.headers.set('Cache-Control', 'private, no-cache')
  return response
}
