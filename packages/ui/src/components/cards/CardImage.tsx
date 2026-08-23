/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { type ImgHTMLAttributes, useEffect, useMemo, useState } from 'react'

import { useCardMedia, type CardFaceInfo } from './CardMediaProvider'

export interface CardImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  catalogId: number | null
  textureId?: number | null
  imageUrl?: string | null
  name?: string
  fallback?: React.ReactNode
  /** Resolve a transformed card's alternate face when replay explicitly opts in. */
  resolveFace?: boolean
}

interface CommittedImage {
  requestKey: string
  url: string
}

/** Decode card images off-screen and commit the first working host/CDN candidate. */
export function CardImage({
  catalogId,
  textureId,
  imageUrl,
  name,
  fallback,
  resolveFace = false,
  onError,
  style,
  className,
  ...props
}: CardImageProps) {
  const {
    getCardImageCandidates,
    isUrlDecoded,
    isUrlFailed,
    markUrlDecoded,
    markUrlFailed,
    resolveCardFace,
  } = useCardMedia()
  const [backFaceInfo, setBackFaceInfo] = useState<CardFaceInfo | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    setBackFaceInfo(null)
    if (!resolveFace || !catalogId || !name || !resolveCardFace) return

    let active = true
    void resolveCardFace(catalogId).then(face => {
      if (active) setBackFaceInfo(face)
    })
    return () => {
      active = false
    }
  }, [catalogId, name, resolveCardFace, resolveFace])

  const matchingBackFace = Boolean(
    resolveFace
      && name
      && backFaceInfo?.name
      && name.trim().toLowerCase() === backFaceInfo.name.trim().toLowerCase(),
  )
  const activeCatalogId = matchingBackFace ? backFaceInfo!.catalogId : catalogId
  const candidates = useMemo(() => [
    ...new Set([
      imageUrl,
      ...getCardImageCandidates({
        catalogId: activeCatalogId,
        textureId,
        name,
      }),
    ].filter((url): url is string => Boolean(url))),
  ], [activeCatalogId, getCardImageCandidates, imageUrl, name, textureId])
  const requestKey = `${activeCatalogId ?? ''}|${textureId ?? ''}|${name ?? ''}|${candidates.join('|')}`

  const [committed, setCommitted] = useState<CommittedImage | null>(() => {
    const decoded = candidates.find(url => isUrlDecoded(url) && !isUrlFailed(url))
    return decoded ? { requestKey, url: decoded } : null
  })

  useEffect(() => {
    const decoded = candidates.find(url => isUrlDecoded(url) && !isUrlFailed(url))
    if (decoded) {
      setCommitted({ requestKey, url: decoded })
      return
    }

    let cancelled = false
    setCommitted(null)

    async function decodeFirstWorkingCandidate() {
      for (const url of candidates) {
        if (cancelled || isUrlFailed(url)) continue
        const image = new Image()
        image.src = url
        try {
          await image.decode()
          if (cancelled) return
          markUrlDecoded(url)
          setCommitted({ requestKey, url })
          return
        } catch {
          markUrlFailed(url)
        }
      }
      if (!cancelled) setCommitted(null)
    }

    void decodeFirstWorkingCandidate()
    return () => {
      cancelled = true
    }
  }, [candidates, isUrlDecoded, isUrlFailed, markUrlDecoded, markUrlFailed, requestKey, retryVersion])

  const committedSrc = committed?.requestKey === requestKey ? committed.url : null
  if (!committedSrc) return <>{fallback}</>

  return (
    <img
      {...props}
      src={committedSrc}
      className={className}
      style={style}
      onError={event => {
        markUrlFailed(committedSrc)
        setCommitted(null)
        const hasAnotherCandidate = candidates.some(
          url => url !== committedSrc && !isUrlFailed(url),
        )
        if (hasAnotherCandidate) setRetryVersion(version => version + 1)
        else onError?.(event)
      }}
    />
  )
}
