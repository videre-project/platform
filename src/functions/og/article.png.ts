/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
**/

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { render } from 'takumi-js'
import takumiWasmModule, {
  init as initializeTakumiWasm,
  Renderer,
} from 'takumi-js/wasm'

import { ArticleOgCard } from '../../components/articles/ArticleOgCard'

interface PagesAssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>
}

export interface ArticleOgManifestEntry {
  slug: string
  title: string
  description: string
  thumbnail: string
  readTime: string
  published: string
  tags?: string[]
  author?: {
    name: string
    handle?: string
    avatar?: string
  }
}

interface ArticleOgContext {
  request: Request
  env: { ASSETS: PagesAssetsBinding }
  waitUntil(promise: Promise<unknown>): void
  articleStyles?: string[]
  articleFontBase64?: string
  articleManifest?: ArticleOgManifestEntry[]
}

const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
const IMAGE_CACHE_SECONDS = 60 * 60

let takumiInitialization: Promise<unknown> | undefined

async function createRenderer() {
  // The Node entrypoint initializes itself. Workerd exposes the compiled WASM
  // module and requires one explicit, process-wide initialization.
  if (typeof takumiWasmModule !== 'function') {
    takumiInitialization ??= initializeTakumiWasm({ module_or_path: takumiWasmModule })
    await takumiInitialization
  }
  return new Renderer()
}

function decodeBase64(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

function articleImageHeaders(cacheSeconds: number) {
  return {
    'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    'Content-Disposition': 'inline; filename="article.png"',
    'Content-Type': 'image/png',
  }
}

export function onRequestHead(): Response {
  return new Response(null, {
    status: 200,
    headers: articleImageHeaders(IMAGE_CACHE_SECONDS),
  })
}

async function fetchImageBytes(url: URL): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Image fetch returned HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

export async function onRequestGet({
  request,
  env,
  waitUntil,
  articleStyles = [],
  articleFontBase64,
  articleManifest = [],
}: ArticleOgContext): Promise<Response> {
  const requestUrl = new URL(request.url)
  const slug = requestUrl.searchParams.get('slug')
  const article = slug ? articleManifest.find(entry => entry.slug === slug) : undefined
  if (!article) {
    return new Response('Unknown article', { status: 404 })
  }
  if (!articleFontBase64) throw new Error('Article font data is unavailable')

  const cacheUrl = new URL('/og/article.png', requestUrl.origin)
  cacheUrl.searchParams.set('slug', article.slug)
  cacheUrl.searchParams.set('v', '1')
  const cacheKey = new Request(cacheUrl, { method: 'GET' })
  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  try {
    // Pre-fetch the images the card references so takumi does not need to reach
    // the network (the thumbnail is a local asset, the avatar is remote).
    const images: Array<{ src: string; data: Uint8Array }> = []
    let thumbnailSrc: string | undefined
    if (article.thumbnail) {
      const thumbnailUrl = new URL(article.thumbnail, requestUrl.origin)
      thumbnailSrc = thumbnailUrl.toString()
      const assetResponse = await env.ASSETS.fetch(new URL(article.thumbnail, requestUrl))
      if (assetResponse.ok) {
        images.push({ src: thumbnailSrc, data: new Uint8Array(await assetResponse.arrayBuffer()) })
      }
    }
    let avatarSrc: string | undefined
    const avatarUrl = article.author?.avatar
      ? new URL(article.author.avatar, requestUrl.origin)
      : undefined
    if (avatarUrl && avatarUrl.protocol.startsWith('http')) {
      avatarSrc = avatarUrl.toString()
      try {
        images.push({ src: avatarSrc, data: await fetchImageBytes(avatarUrl) })
      } catch {
        // A missing avatar should not break the whole image; drop it instead.
        avatarSrc = undefined
      }
    }

    const renderer = await createRenderer()
    try {
      await renderer.registerFont({
        name: 'Inter',
        data: decodeBase64(articleFontBase64),
      })
      const markup = renderToStaticMarkup(React.createElement(
        'main',
        {
          className: 'article-og-image',
          'aria-label': `${article.title} share image`,
        },
        React.createElement(ArticleOgCard, {
          title: article.title,
          description: article.description,
          author: article.author
            ? {
                name: article.author.name,
                handle: article.author.handle,
                avatar: avatarSrc,
              }
            : undefined,
          published: article.published,
          readTime: article.readTime,
          tags: article.tags,
          thumbnail: thumbnailSrc,
        }),
      ))
      const image = await render(markup, {
        renderer,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        stylesheets: articleStyles,
        fontFamilies: ['Inter'],
        images,
      })
      const response = new Response(image, {
        status: 200,
        headers: articleImageHeaders(IMAGE_CACHE_SECONDS),
      })
      waitUntil(caches.default.put(cacheKey, response.clone()))
      return response
    } finally {
      renderer.free()
    }
  } catch {
    const fallback = await env.ASSETS.fetch(new URL('/og-image.png', requestUrl))
    const response = new Response(fallback.body, fallback)
    response.headers.set(
      'Cache-Control',
      `public, max-age=${IMAGE_CACHE_SECONDS}, s-maxage=${IMAGE_CACHE_SECONDS}`,
    )
    response.headers.set('X-Article-Image-Fallback', 'true')
    return response
  }
}
