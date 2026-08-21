/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import { ArrowRight, Download, Terminal } from 'lucide-react';
import { Button } from '@videreproject/ui';

/**
 * Concluding call-to-action rendered at the bottom of the landing page,
 * between the replay preview and the footer.
 *
 * Designed as a horizontal split banner (copy left / actions right) with an
 * emerald corner accent. Visually distinct from the hero's centered, cyan,
 * 3D-screenshot composition while keeping the two primary product actions.
 * Uses the @videreproject/ui Button primitive (asChild -> anchor) so the CTAs share
 * the library's variant/size language, and site design tokens for the panel.
 */
const openApiReference = (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  window.history.pushState({}, '', '/api-reference');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const UpgradeCallToAction: React.FC = () => (
  <section id="upgrade" className="upgrade-cta-section">
    <div className="container">
      <div className="upgrade-cta-panel">
        <div className="upgrade-cta-copy">
          <h2>Ready to upgrade your MTGO play?</h2>
          <p className="text-sm text-muted">
            An open platform for live match tracking, collection management, and metagame trends.
            Explore every match, deck, and event in one place.
            <br/>Open source, self-hostable, and free.
          </p>
        </div>

        <div className="upgrade-cta-actions">
          <Button asChild size="lg">
            <a
              href="https://github.com/videre-project/Tracker"
              target="_blank"
              rel="noreferrer"
            >
              <Download aria-hidden="true" /> Get Videre Tracker
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/api-reference" aria-label="Open API Reference" onClick={openApiReference}>
              <Terminal aria-hidden="true" /> Browse the API Reference
              <ArrowRight aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  </section>
);
