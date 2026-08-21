/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { lazy, Suspense, useEffect, useState } from 'react';

import HomePage from './pages/HomePage';
import { OgImagePreview } from './pages/OgImagePreview';

const ApiReferencePage = lazy(() => import('./pages/ApiReferencePage'));
const MetagamePage = lazy(() => import('./pages/MetagamePage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage'));
const MetagameOgImagePage = lazy(() => import('./pages/MetagameOgImagePage'));

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

  if (pathname === '/metagame' || pathname === '/metagame/') {
    return (
      <Suspense fallback={<ApiReferenceLoading />}>
        <MetagamePage />
      </Suspense>
    );
  }

  if (pathname === '/events' || pathname === '/events/') {
    return (
      <Suspense fallback={<ApiReferenceLoading />}>
        <EventsPage />
      </Suspense>
    );
  }

  const eventMatch = pathname.match(/^\/events\/(-?\d+)\/?$/);
  if (eventMatch) {
    return (
      <Suspense fallback={<ApiReferenceLoading />}>
        <EventDetailsPage eventId={Number(eventMatch[1])} />
      </Suspense>
    );
  }

  if (pathname === '/__og-image') {
    return <OgImagePreview />;
  }

  if (pathname === '/__og/metagame' || pathname === '/__og/metagame/') {
    return (
      <Suspense fallback={<ApiReferenceLoading />}>
        <MetagameOgImagePage />
      </Suspense>
    );
  }

  return <HomePage />;
};

export default App;
