/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { lazy, Suspense, type ReactNode } from 'react'

import { EcosystemOverview } from '@/components/home/EcosystemOverview'
import { FrequentlyAskedQuestions } from '@/components/home/FrequentlyAskedQuestions'
import { OverviewContent } from '@/components/home/OverviewContent'
import { UpgradeCallToAction } from '@/components/home/UpgradeCallToAction'
import { useNearViewport } from '@/hooks/useNearViewport'
import { SiteLayout } from '@/layouts/SiteLayout'
import './HomePage.css'

const DeferredProductFeaturePreviews = lazy(async () => ({
  default: (await import('@/components/home/ProductFeaturePreviews')).ProductFeaturePreviews,
}))
const DeferredReplayPreview = lazy(async () => ({
  default: (await import('@/components/home/ReplayPreview')).ReplayPreview,
}))

interface DeferredChunkProps {
  minHeight: number
  children: ReactNode
}

function DeferredChunk({ minHeight, children }: DeferredChunkProps) {
  const [ref, isNearViewport] = useNearViewport<HTMLDivElement>('500px 0px')

  return (
    <div
      ref={ref}
      className="deferred-chunk-shell"
      style={{ minHeight: isNearViewport ? undefined : minHeight }}
    >
      {isNearViewport ? (
        <Suspense
          fallback={
            <div className="deferred-chunk-fallback" style={{ minHeight }} aria-hidden="true" />
          }
        >
          {children}
        </Suspense>
      ) : null}
    </div>
  )
}

export default function HomePage() {
  return (
    <SiteLayout>
      <>
        <OverviewContent />
        <EcosystemOverview />
        <DeferredChunk minHeight={2400}>
          <DeferredProductFeaturePreviews />
        </DeferredChunk>
        <DeferredChunk minHeight={720}>
          <DeferredReplayPreview />
        </DeferredChunk>
        <FrequentlyAskedQuestions />
        <UpgradeCallToAction />
      </>
    </SiteLayout>
  )
}
