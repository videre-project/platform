/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useState, type ReactNode } from 'react'

import { cn } from '../../lib/cn'
import { getProductImageUrl } from '../../utils/videre-cdn'

/**
 * The shared art rectangle in MTGO's 215x300 Vanguard product frame.
 * A centered square is selected from that rectangle for compact avatars.
 */
const VANGUARD_ART_CROP = {
  imageWidth: '158.09%',
  left: '-29.04%',
  top: '-27.21%',
} as const

export interface VanguardAvatarProps {
  catalogId: number
  name: string
  /** Allows a host to replace the default Videre product CDN URL. */
  imageUrl?: string | null
  alt?: string
  title?: string
  className?: string
  fallback?: ReactNode
  loading?: 'eager' | 'lazy'
}

/** Renders the art crop from an MTGO Vanguard avatar product image. */
export function VanguardAvatar({
  catalogId,
  name,
  imageUrl,
  alt = name,
  title,
  className,
  fallback = null,
  loading = 'lazy',
}: VanguardAvatarProps) {
  const resolvedImageUrl = imageUrl ?? getProductImageUrl(catalogId)
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const imageFailed = failedImageUrl === resolvedImageUrl

  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      className={cn('relative block overflow-hidden bg-muted', className)}
      title={title}
    >
      {imageFailed ? fallback : (
        <img
          src={resolvedImageUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
          loading={loading}
          decoding="async"
          className="pointer-events-none absolute h-auto max-w-none select-none"
          style={{
            width: VANGUARD_ART_CROP.imageWidth,
            left: VANGUARD_ART_CROP.left,
            top: VANGUARD_ART_CROP.top,
          }}
          onError={() => setFailedImageUrl(resolvedImageUrl)}
        />
      )}
    </span>
  )
}
