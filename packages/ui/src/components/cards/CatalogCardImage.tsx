/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { type CSSProperties, useEffect, useMemo, useState } from 'react'

import { useCardMedia } from './CardMediaProvider'

export interface CatalogCardImageProps {
  catalogId: number
  name: string
  className?: string
  alt?: string
  loading?: 'eager' | 'lazy'
  style?: CSSProperties
  title?: string
  imageUrl?: string
}

/** A host-independent card image that walks the configured media candidates. */
export function CatalogCardImage({
  catalogId,
  name,
  className,
  alt = name,
  loading = 'lazy',
  style,
  title,
  imageUrl,
}: CatalogCardImageProps) {
  const { getCardImageCandidates } = useCardMedia()
  const candidates = useMemo(() => [
    ...new Set([
      imageUrl,
      ...getCardImageCandidates({ catalogId, name }),
    ].filter((url): url is string => Boolean(url))),
  ], [catalogId, getCardImageCandidates, imageUrl, name])
  const candidateKey = candidates.join('|')
  const [source, setSource] = useState({ key: candidateKey, index: 0 })

  useEffect(() => setSource({ key: candidateKey, index: 0 }), [candidateKey])

  const index = source.key === candidateKey ? source.index : 0
  const src = candidates[index]
  if (!src) {
    return (
      <span
        className={`grid h-full w-full place-items-center bg-muted p-1.5 text-center text-[10px] font-semibold leading-tight text-muted-foreground ${className ?? ''}`}
        aria-label={alt}
      >
        {name}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      title={title}
      loading={loading}
      decoding="async"
      draggable={false}
      onError={() => setSource({ key: candidateKey, index: index + 1 })}
    />
  )
}
