/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { lazy, Suspense } from 'react';
import { CardTooltipProvider } from '@videreproject/ui';

const CollectionFeaturePreview = lazy(async () => ({
  default: (await import('./CollectionFeaturePreview')).CollectionFeaturePreview,
}));
const TradeHistoryFeaturePreview = lazy(async () => ({
  default: (await import('./TradeHistoryFeaturePreview')).TradeHistoryFeaturePreview,
}));
const MetagameFan = lazy(async () => ({
  default: (await import('./MetagameFan')).MetagameFan,
}));
const MatchHistoryFeaturePreview = lazy(async () => ({
  default: (await import('./MatchHistoryFeaturePreview')).MatchHistoryFeaturePreview,
}));

function FeatureFallback({ minHeight }: { minHeight: number }) {
  return <div className="product-feature-chunk-fallback" style={{ minHeight }} aria-hidden="true" />;
}

export const ProductFeaturePreviews: React.FC = () => (
  <CardTooltipProvider>
    <div className="product-feature-previews">
      <Suspense fallback={<FeatureFallback minHeight={520} />}>
        <CollectionFeaturePreview />
      </Suspense>

      <Suspense fallback={<FeatureFallback minHeight={520} />}>
        <TradeHistoryFeaturePreview />
      </Suspense>

      <Suspense fallback={<FeatureFallback minHeight={520} />}>
        <MetagameFan />
      </Suspense>

      <Suspense fallback={<FeatureFallback minHeight={520} />}>
        <MatchHistoryFeaturePreview />
      </Suspense>
    </div>
  </CardTooltipProvider>
);
