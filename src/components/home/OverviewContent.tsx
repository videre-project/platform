/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useEffect, useState } from 'react';
import { Download, History } from 'lucide-react';
import { HeroWaveCanvas } from './HeroWaveCanvas';
import { HeroScreenshotsFan } from './HeroScreenshotsFan';

const TRACKER_SLUG = 'videre-project/Tracker';

const TRACKER_URL = `https://github.com/${TRACKER_SLUG}`
const TRACKER_PACKAGE_URL = `https://raw.githubusercontent.com/${TRACKER_SLUG}/main/package.json`;
const TRACKER_CHANGELOG_URL = `${TRACKER_URL}/releases/latest`;

export const OverviewContent: React.FC = () => {
  const [trackerVersion, setTrackerVersion] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(TRACKER_PACKAGE_URL, { cache: 'no-cache', signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((packageJson: { version?: unknown } | null) => {
        if (typeof packageJson?.version === 'string' && packageJson.version.trim()) {
          setTrackerVersion(packageJson.version.trim().replace(/^v/i, ''));
        }
      })
      .catch(() => {
        // Ignore any errors fetching the changelog.
      });

    return () => controller.abort();
  }, []);

  return (
    <section
      className="hero-section"
      style={{
        position: 'relative',
        overflowX: 'clip',
        overflowY: 'visible',
        marginTop: '-3.5rem', // Pull up behind sticky transparent header
        paddingTop: 'calc(3.5rem + var(--space-3xl))',
        paddingBottom: '2rem',
      }}
    >
      <div className="hero-art-background" aria-hidden="true" />
      <HeroWaveCanvas />

      {/* Hero Content */}
      <div
        className="container"
        style={{
          position: 'relative',
          zIndex: 10,
          paddingLeft: 'var(--space-lg)',
          paddingRight: 'var(--space-lg)',
        }}
      >
        {/* Headline & CTAs */}
        <div className="hero-intro" style={{ maxWidth: '760px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', lineHeight: 1.25 }}>
            Real-time game tracking and metagame intelligence for Magic: The Gathering Online.
          </h1>
          <p
            className="text-sm text-muted"
            style={{ lineHeight: 1.7, marginBottom: 'var(--space-xl)' }}
          >
            Videre Tracker is an open-source desktop app for Magic: The Gathering Online players. It
            tracks your games, collection, and trades in real time, turning each match into a
            detailed history and complete action-by-action replay.
          </p>
          <div
            className="hero-actions"
            style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <a
              href={TRACKER_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              <Download size={14} /> Get Videre Tracker
            </a>
            <a
              href={TRACKER_CHANGELOG_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
              aria-label={trackerVersion ? `View Tracker ${trackerVersion} changelog` : 'View Tracker changelog'}
              style={{ position: 'relative', zIndex: 21, pointerEvents: 'auto' }}
            >
              <History size={14} /> Changelog{trackerVersion ? ` · v${trackerVersion}` : ''}
            </a>
          </div>
        </div>

        {/* Exploded, independently cropped product surfaces */}
        <HeroScreenshotsFan />
      </div>

      {/* Curved silhouette blends the artwork into the following section. */}
      <div className="hero-section-transition" aria-hidden="true" />
    </section>
  );
};
