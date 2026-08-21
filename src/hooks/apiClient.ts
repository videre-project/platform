/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

type JSONRequestInit = Omit<RequestInit, 'signal'>

interface InFlightRequest<T> {
  controller: AbortController
  promise: Promise<T>
  consumers: number
  settled: boolean
}

const inFlightRequests = new Map<string, InFlightRequest<unknown>>()
const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504])
// The API's Worker cache version does not change the public URL used by the
// CDN. Bump this when a deployed API change must bypass older edge responses.
const PUBLIC_API_CACHE_VERSION = '3'

export interface APIRequestTiming {
  url: string
  method: string
  status: number | null
  elapsedMs: number
  serverMs: number | null
  attempt: number
}

type APIRequestTimingObserver = (timing: APIRequestTiming) => void

let requestTimingObserver: APIRequestTimingObserver | null = null

/** Enables local instrumentation without changing request behavior. */
export function setAPIRequestTimingObserver(observer: APIRequestTimingObserver | null): void {
  requestTimingObserver = observer
}

const withPublicAPICacheVersion = (url: string): string => {
  const parsed = new URL(url)
  if (parsed.hostname !== 'api.videreproject.com') return url

  parsed.searchParams.set('v', PUBLIC_API_CACHE_VERSION)
  return parsed.toString()
}

const requestKey = (url: string, init: JSONRequestInit): string => [
  init.method ?? 'GET',
  url,
  typeof init.body === 'string' ? init.body : '',
].join('\u0000')

const delay = (milliseconds: number) => new Promise<void>(resolve => {
  window.setTimeout(resolve, milliseconds)
})

const retryURL = (url: string, attempt: number): string => {
  if (attempt === 0) return url
  const parsed = new URL(url)
  parsed.searchParams.set('__retry', String(attempt))
  return parsed.toString()
}

async function requestJSON<T>(url: string, init: JSONRequestInit, signal: AbortSignal): Promise<T> {
  const started = performance.now()
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(retryURL(url, attempt), { ...init, signal })
      if (response.ok) {
        const payload = await response.json() as T & { meta?: { exec_ms?: number }}
        requestTimingObserver?.({
          url,
          method: init.method ?? 'GET',
          status: response.status,
          elapsedMs: Number((performance.now() - started).toFixed(3)),
          serverMs: typeof payload.meta?.exec_ms === 'number' ? payload.meta.exec_ms : null,
          attempt,
        })
        return payload
      }

      if (!RETRYABLE_STATUSES.has(response.status) || attempt >= 1) {
        requestTimingObserver?.({
          url,
          method: init.method ?? 'GET',
          status: response.status,
          elapsedMs: Number((performance.now() - started).toFixed(3)),
          serverMs: null,
          attempt,
        })
        throw new Error(`API request returned HTTP ${response.status}`)
      }
    } catch (error) {
      if (signal.aborted) throw error
      const status = error instanceof Error
        ? Number(error.message.match(/^API request returned HTTP (\d+)$/)?.[1])
        : undefined
      if (
        attempt >= 1
        || (status !== undefined && !RETRYABLE_STATUSES.has(status))
      ) {
        throw error
      }
    }

    await delay(150 * (attempt + 1))
  }
}

function releaseRequest<T>(key: string, request: InFlightRequest<T>): void {
  request.consumers = Math.max(0, request.consumers - 1)
  if (
    request.consumers === 0
    && !request.settled
    && inFlightRequests.get(key) === request
  ) {
    // React Strict Mode intentionally cleans up and re-runs effects during
    // development. Give the replacement effect a chance to subscribe before
    // aborting the shared request; real unmounts still cancel on the next
    // microtask.
    queueMicrotask(() => {
      if (
        request.consumers === 0
        && !request.settled
        && inFlightRequests.get(key) === request
      ) {
        request.controller.abort()
      }
    })
  }
}

/** Shares concurrent identical API requests while preserving caller cancellation. */
export function fetchSharedJSON<T>(url: string, signal?: AbortSignal, init: JSONRequestInit = {}): Promise<T> {
  url = withPublicAPICacheVersion(url)
  const key = requestKey(url, init)
  let request = inFlightRequests.get(key) as InFlightRequest<T> | undefined
  if (!request) {
    const controller = new AbortController()
    request = {
      controller,
      promise: undefined as unknown as Promise<T>,
      consumers: 0,
      settled: false,
    }
    request.promise = requestJSON<T>(url, init, controller.signal).then(
      value => {
        request!.settled = true
        if (inFlightRequests.get(key) === request) inFlightRequests.delete(key)
        return value
      },
      error => {
        request!.settled = true
        if (inFlightRequests.get(key) === request) inFlightRequests.delete(key)
        throw error
      },
    )
    // The shared promise may outlive every caller after they cancel. Attach a
    // rejection handler so aborting the underlying request cannot become an
    // unhandled rejection.
    request.promise.catch(() => undefined)
    inFlightRequests.set(key, request)
  }

  request.consumers += 1
  return new Promise<T>((resolve, reject) => {
    let finished = false
    const cleanup = () => {
      if (signal) signal.removeEventListener('abort', abort)
      if (!finished) {
        finished = true
        releaseRequest(key, request!)
      }
    }
    const abort = () => {
      cleanup()
      reject(new DOMException('The request was aborted.', 'AbortError'))
    }

    if (signal?.aborted) {
      abort()
      return
    }

    signal?.addEventListener('abort', abort, { once: true })
    request!.promise.then(
      value => { cleanup(); resolve(value) },
      error => { cleanup(); reject(error) },
    )
  })
}
