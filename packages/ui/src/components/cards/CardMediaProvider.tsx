/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

export interface CardFaceInfo {
  catalogId: number
  name?: string
}

export interface CardMediaRequest {
  catalogId?: number | null
  textureId?: number | null
  name?: string | null
}

export interface CardMediaServices {
  /** Override the primary image URL. The Videre CDN remains the default. */
  getCardImageUrl?: (catalogId: number) => string | null
  /** Optional host fallback used after primary and texture images fail. */
  getCardImageFallbackUrl?: (catalogId: number) => string | null
  /** Optional host-rendered image for an MTGO texture ID. */
  getCardTextureImageUrl?: (textureId: number) => string | null
  /** Optional host-rendered image when only a card name is known. */
  getNamedCardImageUrl?: (name: string) => string | null
  /** Optional host-provided cropped art URL, used for replay avatars. */
  getCardArtUrl?: (catalogId: number) => string | null
  /** Optional host lookup for double-faced cards. */
  resolveCardFace?: (catalogId: number) => Promise<CardFaceInfo | null>
}

export interface CardMediaProviderProps extends CardMediaServices {
  children: ReactNode
}

export interface CardMediaContextValue extends CardMediaServices {
  getCardImageCandidates: (request: CardMediaRequest) => string[]
  preloadCardImages: (catalogIds: readonly number[]) => void
  isUrlDecoded: (url: string) => boolean
  isUrlFailed: (url: string) => boolean
  markUrlDecoded: (url: string) => void
  markUrlFailed: (url: string) => void
}

const getDefaultCardImageUrl = (catalogId: number): string =>
  `https://r2.videreproject.com/cards/${catalogId}-300px.png`

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  return [...new Set(urls.filter((url): url is string => Boolean(url)))]
}

function resolveCandidates(
  request: CardMediaRequest,
  services: CardMediaServices,
): string[] {
  const { catalogId, textureId, name } = request
  const validCatalogId = catalogId != null && catalogId > 0 ? catalogId : null
  const validTextureId = textureId != null && textureId > 0 ? textureId : null

  return uniqueUrls([
    validCatalogId == null
      ? null
      : services.getCardImageUrl?.(validCatalogId) ?? getDefaultCardImageUrl(validCatalogId),
    validTextureId == null ? null : services.getCardTextureImageUrl?.(validTextureId),
    validCatalogId == null ? null : services.getCardImageFallbackUrl?.(validCatalogId),
    name ? services.getNamedCardImageUrl?.(name) : null,
  ])
}

function createStandaloneContext(): CardMediaContextValue {
  const decodedUrls = new Set<string>()
  const failedUrls = new Set<string>()
  const preloadedUrls = new Set<string>()
  const services: CardMediaServices = {}

  const context: CardMediaContextValue = {
    getCardImageCandidates: request => resolveCandidates(request, services),
    preloadCardImages: catalogIds => {
      if (typeof Image === 'undefined') return
      for (const catalogId of catalogIds) {
        const url = resolveCandidates({ catalogId }, services)[0]
        if (!url || failedUrls.has(url) || preloadedUrls.has(url)) continue
        preloadedUrls.add(url)
        const image = new Image()
        image.fetchPriority = 'low'
        image.src = url
        void image.decode()
          .then(() => decodedUrls.add(url))
          .catch(() => failedUrls.add(url))
      }
    },
    isUrlDecoded: url => decodedUrls.has(url),
    isUrlFailed: url => failedUrls.has(url),
    markUrlDecoded: url => decodedUrls.add(url),
    markUrlFailed: url => failedUrls.add(url),
  }
  return context
}

const CardMediaContext = createContext<CardMediaContextValue>(createStandaloneContext())

/** Supplies host-owned card media behavior without coupling components to a host API. */
export function CardMediaProvider({
  children,
  getCardImageUrl,
  getCardImageFallbackUrl,
  getCardTextureImageUrl,
  getNamedCardImageUrl,
  getCardArtUrl,
  resolveCardFace,
}: CardMediaProviderProps) {
  const decodedUrls = useRef(new Set<string>())
  const failedUrls = useRef(new Set<string>())
  const preloadedUrls = useRef(new Set<string>())
  const resolverState = useRef<{
    source: CardMediaServices['resolveCardFace']
    values: Map<number, CardFaceInfo | null>
    pending: Map<number, Promise<CardFaceInfo | null>>
  }>({
    source: resolveCardFace,
    values: new Map(),
    pending: new Map(),
  })

  const services = useMemo<CardMediaServices>(() => ({
    getCardImageUrl,
    getCardImageFallbackUrl,
    getCardTextureImageUrl,
    getNamedCardImageUrl,
    getCardArtUrl,
    resolveCardFace,
  }), [
    getCardArtUrl,
    getCardImageFallbackUrl,
    getCardImageUrl,
    getCardTextureImageUrl,
    getNamedCardImageUrl,
    resolveCardFace,
  ])

  const resolveCardFaceCached = useCallback(async (catalogId: number) => {
    if (!resolveCardFace) return null

    if (resolverState.current.source !== resolveCardFace) {
      resolverState.current = {
        source: resolveCardFace,
        values: new Map(),
        pending: new Map(),
      }
    }

    const { values, pending } = resolverState.current
    if (values.has(catalogId)) return values.get(catalogId) ?? null

    const existing = pending.get(catalogId)
    if (existing) return existing

    const request = resolveCardFace(catalogId)
      .catch(() => null)
      .then(face => {
        values.set(catalogId, face)
        pending.delete(catalogId)
        return face
      })
    pending.set(catalogId, request)
    return request
  }, [resolveCardFace])

  const getCardImageCandidates = useCallback(
    (request: CardMediaRequest) => resolveCandidates(request, services),
    [services],
  )

  const preloadCardImages = useCallback((catalogIds: readonly number[]) => {
    if (typeof Image === 'undefined') return

    for (const catalogId of catalogIds) {
      const url = getCardImageCandidates({ catalogId })[0]
      if (!url || failedUrls.current.has(url) || preloadedUrls.current.has(url)) continue

      preloadedUrls.current.add(url)
      const image = new Image()
      image.fetchPriority = 'low'
      image.src = url
      void image.decode()
        .then(() => decodedUrls.current.add(url))
        .catch(() => failedUrls.current.add(url))
    }
  }, [getCardImageCandidates])

  const value = useMemo<CardMediaContextValue>(() => ({
    ...services,
    resolveCardFace: resolveCardFace ? resolveCardFaceCached : undefined,
    getCardImageCandidates,
    preloadCardImages,
    isUrlDecoded: url => decodedUrls.current.has(url),
    isUrlFailed: url => failedUrls.current.has(url),
    markUrlDecoded: url => decodedUrls.current.add(url),
    markUrlFailed: url => failedUrls.current.add(url),
  }), [
    getCardImageCandidates,
    preloadCardImages,
    resolveCardFace,
    resolveCardFaceCached,
    services,
  ])

  return <CardMediaContext.Provider value={value}>{children}</CardMediaContext.Provider>
}

export function useCardMedia(): CardMediaContextValue {
  return useContext(CardMediaContext)
}
