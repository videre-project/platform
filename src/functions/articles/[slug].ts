/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
**/

import type { ArticleOgManifestEntry } from '../og/article.png'

interface PagesAssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>
}

interface ArticlePagesContext {
  request: Request
  env: { ASSETS: PagesAssetsBinding }
  articleManifest?: ArticleOgManifestEntry[]
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

function readArticleSlug(requestUrl: URL) {
  const match = requestUrl.pathname.match(/^\/articles\/([a-zA-Z0-9_-]+)\/?$/)
  return match ? match[1] : undefined
}

export async function onRequestGet({
  request,
  env,
  articleManifest = [],
}: ArticlePagesContext): Promise<Response> {
  const requestUrl = new URL(request.url)
  const slug = readArticleSlug(requestUrl)
  const article = slug ? articleManifest.find(entry => entry.slug === slug) : undefined

  // Only rewrite the tags for known articles. Everything else (static files
  // like thumbnails under /articles/, unknown slugs) falls through to the
  // static assets, which serve the file or the SPA shell for the client
  // router's not-found state.
  if (!article) {
    return env.ASSETS.fetch(request)
  }

  const assetUrl = new URL('/', requestUrl)
  const shell = await env.ASSETS.fetch(new Request(assetUrl, request))

  const canonicalUrl = new URL(`/articles/${article.slug}`, requestUrl.origin).toString()
  const imageUrl = new URL('/og/article.png', requestUrl.origin)
  imageUrl.searchParams.set('slug', article.slug)
  imageUrl.searchParams.set('v', '1')
  const title = article.title
  const description = article.description
  const imageAlt = `${article.title} article preview.`

  const response = new HTMLRewriter()
    .on('title', new TitleHandler(`${title} | Videre Project`))
    .on('meta[name="description"]', new ContentAttributeHandler(description))
    .on('meta[property="og:type"]', new ContentAttributeHandler('article'))
    .on('meta[property="og:title"]', new ContentAttributeHandler(title))
    .on('meta[property="og:description"]', new ContentAttributeHandler(description))
    .on('meta[property="og:url"]', new ContentAttributeHandler(canonicalUrl))
    .on('meta[property="og:image"]', new ContentAttributeHandler(imageUrl.toString()))
    .on('meta[property="og:image:alt"]', new ContentAttributeHandler(imageAlt))
    .on('meta[name="twitter:title"]', new ContentAttributeHandler(title))
    .on('meta[name="twitter:description"]', new ContentAttributeHandler(description))
    .on('meta[name="twitter:image"]', new ContentAttributeHandler(imageUrl.toString()))
    .transform(shell)

  response.headers.set('Cache-Control', 'private, no-cache')
  return response
}
