/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Header } from './components/Header';
import { OverviewContent } from './components/OverviewContent';
import { UpgradeCallToAction } from './components/UpgradeCallToAction';
import { EcosystemOverview } from './components/EcosystemOverview';
import { Footer } from './components/Footer';
import { FrequentlyAskedQuestions } from './components/FrequentlyAskedQuestions';
import { OgImagePreview } from './components/OgImagePreview';
import { useNearViewport } from './hooks/useNearViewport';

const ApiReferencePage = lazy(() => import('./components/ApiReferencePage'));
const ProductFeaturePreviews = lazy(async () => ({
  default: (await import('./components/ProductFeaturePreviews')).ProductFeaturePreviews,
}));
const ReplayPreview = lazy(async () => ({
  default: (await import('./components/ReplayPreview')).ReplayPreview,
}));

interface DeferredChunkProps {
  minHeight: number;
  children: ReactNode;
}

/** Defers below-the-fold feature chunks while reserving their page space. */
const DeferredChunk: React.FC<DeferredChunkProps> = ({ minHeight, children }) => {
  const [ref, isNearViewport] = useNearViewport<HTMLDivElement>('500px 0px');

  return (
    <div
      ref={ref}
      className="deferred-chunk-shell"
      style={{ minHeight: isNearViewport ? undefined : minHeight }}
    >
      {isNearViewport ? (
        <Suspense
          fallback={
            <div
              className="deferred-chunk-fallback"
              style={{ minHeight }}
              aria-hidden="true"
            />
          }
        >
          {children}
        </Suspense>
      ) : null}
    </div>
  );
};

const ApiReferenceLoading: React.FC = () => (
  <div
    role="status"
    aria-label="Loading API reference"
    style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--muted-foreground)',
      background: 'hsl(var(--background))',
    }}
  >
    Loading API reference…
  </div>
);

export const App: React.FC = () => {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (pathname === '/api-reference' || pathname === '/api-reference/') {
    return (
      <Suspense fallback={<ApiReferenceLoading />}>
        <ApiReferencePage />
      </Suspense>
    );
  }

  if (pathname === '/__og-image') {
    return <OgImagePreview />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />

      <main style={{ flex: 1 }}>
        <OverviewContent />
        <EcosystemOverview />
        <DeferredChunk minHeight={2400}>
          <ProductFeaturePreviews />
        </DeferredChunk>
        <DeferredChunk minHeight={720}>
          <ReplayPreview />
        </DeferredChunk>
        <FrequentlyAskedQuestions />
        <UpgradeCallToAction />
      </main>

      <Footer />
    </div>
  );
};

export default App;
