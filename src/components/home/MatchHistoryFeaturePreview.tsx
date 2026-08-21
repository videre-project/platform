/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import { MatchDetailsLayout } from '@videreproject/ui';
import { MATCH_DETAILS_SHOWCASE } from '@videreproject/ui/fixtures';
import { ScaledUiPreview } from './ScaledUiPreview';

const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const MatchHistoryFeaturePreview: React.FC = () => (
  <section id="match-history" className="container product-feature-section">
    <div className="product-feature-copy">
      <h2>Review every game in an MTGO match</h2>
      <p className="text-sm text-muted">
        Each match keeps every game&apos;s opening hand, exact sideboard changes, result, and
        sequence of play together, with both a game log and an action-by-action replay.
      </p>
    </div>
    <div className="website-ui-preview-frame">
      <ScaledUiPreview width={1120} height={680}>
        <MatchDetailsLayout
          className="website-ui-desktop-preview pt-4"
          match={MATCH_DETAILS_SHOWCASE}
          initialGameId="game-2"
          onBack={() => scrollToSection('trade-history')}
          onWatchLive={() => scrollToSection('replay-engine')}
          onGameLog={() => scrollToSection('replay-engine')}
          onReplay={() => scrollToSection('replay-engine')}
        />
      </ScaledUiPreview>
    </div>
  </section>
);
