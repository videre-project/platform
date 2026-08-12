/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useState } from 'react';
import { TradeHistoryLayout } from '@videreproject/ui';
import {
  TRADE_HISTORY_SHOWCASE_DEFAULT_ID,
  TRADE_HISTORY_SHOWCASE_DETAILS,
  TRADE_HISTORY_SHOWCASE_TRADES,
} from '@videreproject/ui/fixtures';
import { ScaledUiPreview } from './ScaledUiPreview';

const noop = () => {};

export const TradeHistoryFeaturePreview: React.FC = () => {
  const [selectedId, setSelectedId] = useState(TRADE_HISTORY_SHOWCASE_DEFAULT_ID);

  return (
    <section id="trade-history" className="container product-feature-section">
      <div className="product-feature-copy">
        <h2>Review your MTGO trades and product openings</h2>
        <p className="text-sm text-muted">
          Every trade and product opening leaves a complete record: what entered or left your
          collection, whether it completed, when it happened, its MTGO escrow ID, and the
          accompanying chat.
        </p>
      </div>
      <div className="website-ui-preview-frame">
        <ScaledUiPreview width={1120} height={680}>
          <TradeHistoryLayout
            trades={[...TRADE_HISTORY_SHOWCASE_TRADES]}
            selectedId={selectedId}
            detail={TRADE_HISTORY_SHOWCASE_DETAILS[selectedId] ?? null}
            onSelectedIdChange={setSelectedId}
            search=""
            kind="all"
            result="all"
            onSearchChange={noop}
            onKindChange={noop}
            onResultChange={noop}
            onClearFilters={noop}
            filtersDisabled
            className="website-ui-desktop-preview p-4"
          />
        </ScaledUiPreview>
      </div>
    </section>
  );
};
