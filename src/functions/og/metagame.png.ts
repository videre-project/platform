/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { render } from 'takumi-js'
import takumiWasmModule, {
  init as initializeTakumiWasm,
  Renderer,
} from 'takumi-js/wasm'

import { MetagameChart } from '../../components/metagame/MetagameChart'
import { loadMetagameData } from '../../utils/metagameData'
import {
  createMetagameSearchParameters,
  readMetagameShareParameters,
} from '../../utils/metagameShareParameters'
import { getSecondsUntilNextMetagameRefresh } from '../../utils/metagameCacheSchedule'

interface PagesAssetsBinding {
  fetch(request: Request | URL | string): Promise<Response>
}

interface MetagameImageContext {
  request: Request
  env: { ASSETS: PagesAssetsBinding }
  waitUntil(promise: Promise<unknown>): void
  metagameStyles?: string[]
  metagameFontBase64?: string
}

interface APIResponse<T> {
  data: T
}

const API_BASE_URL = 'https://api.videreproject.com'
const IMAGE_WIDTH = 1200
const IMAGE_HEIGHT = 630
const MATRIX_COLUMN_WIDTH = 36
const MATRIX_LABEL_ANGLE_RADIANS = 43 * Math.PI / 180
const MATRIX_LABEL_RIGHT_PADDING = 16
const MATRIX_START_X = 56 + 270 + 16 + 210 + 16
const MATRIX_HEADER_FONT_SIZE = 12.8
const MATRIX_HEADER_FONT_WEIGHT = 500
const MATRIX_HEADER_WIDTH_CHARACTERS = 16
const ARCHETYPE_LABEL_FONT_SIZE = 12.8
const ARCHETYPE_LABEL_FONT_WEIGHT = 400
const ARCHETYPE_LABEL_WIDTH = 142 - (0.25 + 0.55) * 16
const graphemeSegmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

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

function metagameImageHeaders(cacheSeconds: number) {
  return {
    'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
    'Content-Disposition': 'inline; filename="metagame.png"',
    'Content-Type': 'image/png',
  }
}

export function onRequestHead(): Response {
  return new Response(null, {
    status: 200,
    headers: metagameImageHeaders(getSecondsUntilNextMetagameRefresh()),
  })
}

interface TextMeasurementStyle {
  fontSize: number
  fontWeight: number
}

async function measureText(
  renderer: Renderer,
  label: string,
  { fontSize, fontWeight }: TextMeasurementStyle,
) {
  const measurement = await renderer.measure({
    type: 'container',
    style: { display: 'inline' },
    children: [{
      type: 'text',
      text: label,
      style: {
        display: 'inline',
        fontFamily: 'Inter',
        fontSize,
        fontWeight,
        whiteSpace: 'nowrap',
      },
    }],
  }, {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    fontFamilies: ['Inter'],
  })
  return measurement.runs[0]?.width ?? 0
}

async function truncateTextToWidth(
  renderer: Renderer,
  label: string,
  maximumWidth: number,
  style: TextMeasurementStyle,
) {
  if (await measureText(renderer, label, style) <= maximumWidth) return label

  const graphemes = Array.from(graphemeSegmenter.segment(label), part => part.segment)
  let minimum = 0
  let maximum = graphemes.length
  while (minimum < maximum) {
    const count = Math.ceil((minimum + maximum) / 2)
    const candidate = `${graphemes.slice(0, count).join('')}…`
    if (await measureText(renderer, candidate, style) <= maximumWidth) minimum = count
    else maximum = count - 1
  }
  return `${graphemes.slice(0, minimum).join('')}…`
}

async function createMatrixHeaderLabels(
  renderer: Renderer,
  labels: readonly string[],
) {
  const style = {
    fontSize: MATRIX_HEADER_FONT_SIZE,
    fontWeight: MATRIX_HEADER_FONT_WEIGHT,
  }
  const regularWidth = await measureText(
    renderer,
    '0'.repeat(MATRIX_HEADER_WIDTH_CHARACTERS),
    style,
  )
  const finalLabelAnchor = MATRIX_START_X + (labels.length - 0.5) * MATRIX_COLUMN_WIDTH
  const finalLabelWidth = (
    IMAGE_WIDTH - MATRIX_LABEL_RIGHT_PADDING - finalLabelAnchor
  ) / Math.cos(MATRIX_LABEL_ANGLE_RADIANS)

  return Promise.all(labels.map((label, index) => truncateTextToWidth(
    renderer,
    label,
    index === labels.length - 1 ? Math.min(regularWidth, finalLabelWidth) : regularWidth,
    style,
  )))
}

async function createArchetypeLabels(
  renderer: Renderer,
  labels: readonly string[],
) {
  const style = {
    fontSize: ARCHETYPE_LABEL_FONT_SIZE,
    fontWeight: ARCHETYPE_LABEL_FONT_WEIGHT,
  }
  return Promise.all(labels.map(label => truncateTextToWidth(
    renderer,
    label,
    ARCHETYPE_LABEL_WIDTH,
    style,
  )))
}

async function fetchAPI<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}&v=3`)
  if (!response.ok) throw new Error(`API request returned HTTP ${response.status}`)
  return (await response.json() as APIResponse<T>).data
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
  metagameStyles = [],
  metagameFontBase64,
}: MetagameImageContext): Promise<Response> {
  const requestUrl = new URL(request.url)
  const cacheSeconds = getSecondsUntilNextMetagameRefresh()
  const state = readMetagameShareParameters(requestUrl.searchParams)
  const parameters = createMetagameSearchParameters(state)
  parameters.set('v', '7')

  const cacheUrl = new URL('/og/metagame.png', requestUrl.origin)
  cacheUrl.search = parameters.toString()
  const cacheKey = new Request(cacheUrl, { method: 'GET' })
  const cached = await caches.default.match(cacheKey)
  if (cached) return cached

  try {
    const data = await loadMetagameData(
      state.format,
      parameters.get('min_date') ?? undefined,
      parameters.get('max_date') ?? undefined,
      fetchAPI,
    )
    if (!metagameFontBase64) throw new Error('Metagame font data is unavailable')

    const renderer = await createRenderer()
    try {
      await renderer.registerFont({
        name: 'Inter',
        data: decodeBase64(metagameFontBase64),
        weight: MATRIX_HEADER_FONT_WEIGHT,
      })
      const labels = data.archetypes.map(archetype => archetype.archetype)
      const [archetypeLabels, matrixHeaderLabels] = await Promise.all([
        createArchetypeLabels(renderer, labels),
        createMatrixHeaderLabels(renderer, labels),
      ])
      const markup = renderToStaticMarkup(React.createElement(
        'main',
        {
          className: 'metagame-og-image',
          'aria-label': `${state.format} metagame share image`,
        },
        React.createElement(MetagameChart, {
          data,
          format: state.format,
          from: state.dateRange.from,
          to: state.dateRange.to,
          staticRender: true,
          renderTarget: 'takumi',
          archetypeLabels,
          matrixHeaderLabels,
        }),
      ))
      const image = await render(markup, {
        renderer,
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        stylesheets: metagameStyles,
        fontFamilies: ['Inter'],
      })
      const response = new Response(image, {
        status: 200,
        headers: metagameImageHeaders(cacheSeconds),
      })
      waitUntil(caches.default.put(cacheKey, response.clone()))
      return response
    } finally {
      renderer.free()
    }
  } catch {
    return fallbackImage(requestUrl, env, cacheSeconds)
  }
}
