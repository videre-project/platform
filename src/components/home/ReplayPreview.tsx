/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useState, useMemo } from 'react';
import { ReplayLayout, ReplayStateEngine, type ReplayData } from '@videreproject/ui';
import { REPLAY_SHOWCASE_DATA } from '@videreproject/ui/fixtures';
import { ScaledUiPreview } from './ScaledUiPreview';

const LIVE_REPLAY_DATA = REPLAY_SHOWCASE_DATA as unknown as ReplayData;

export const ReplayPreview: React.FC = () => {
  const INITIAL_SNAPSHOT_INDEX = 61; // Snapshot 61: Turn 3 Spell Pierce resolution prompt
  const engine = useMemo(() => new ReplayStateEngine(LIVE_REPLAY_DATA), []);
  const [snapshotIndex] = useState(INITIAL_SNAPSHOT_INDEX);
  const [boardState] = useState(() => engine.stepTo(INITIAL_SNAPSHOT_INDEX));

  // Disabled step-to handler to keep view frozen at snapshot 61
  const handleStepTo = () => {};

  return (
    <section id="replay-engine" className="replay-preview-section">
      <div className="container replay-preview-content">
        <div className="replay-preview-copy">
          <h2 style={{ marginBottom: '0.35rem' }}>
            Replay an MTGO game one action at a time
          </h2>
          <p className="text-sm text-muted">
            Videre Tracker reconstructs the battlefield and visible zones after every recorded
            action, letting you move through a game at your own pace. Each replay is built from game
            events and board states captured through{' '}
            <a
              href="https://github.com/videre-project/MTGOSDK"
              target="_blank"
              rel="noreferrer"
              style={{ color: 'hsl(var(--foreground))', textDecoration: 'underline', textUnderlineOffset: '3px' }}
            >
              MTGOSDK
            </a>
            .
          </p>
        </div>

        <div className="replay-preview-layout">
          <ScaledUiPreview width={1120} height={640}>
            <ReplayLayout
              board={boardState}
              snapshots={LIVE_REPLAY_DATA.snapshots}
              currentIndex={snapshotIndex}
              onStepTo={handleStepTo}
              perspectivePlayer={0}
              promptText={engine.currentSnapshot?.promptText}
              promptOptions={engine.currentSnapshot?.promptOptions}
              defaultAvatarUrl="/default-avatar.png"
              disableTopZoneHoverExpansion
            />
          </ScaledUiPreview>
        </div>

      </div>
    </section>
  );
};
