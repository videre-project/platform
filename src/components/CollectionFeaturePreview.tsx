/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import { CollectionLayout } from '@videreproject/ui';
import {
  COLLECTION_SHOWCASE_CARDS,
  COLLECTION_SHOWCASE_PRODUCTS,
} from '@videreproject/ui/fixtures';
import { ScaledUiPreview } from './ScaledUiPreview';

export const CollectionFeaturePreview: React.FC = () => (
  <section id="collection-value" className="container product-feature-section">
    <div className="product-feature-copy">
      <h2>See what your MTGO collection is worth</h2>
      <p className="text-sm text-muted">
        Videre Tracker keeps a current inventory of your cards and sealed products, values the
        collection at current market prices, and records detailed price history for every card.
      </p>
    </div>
    <div className="website-ui-preview-frame">
      <ScaledUiPreview width={1120} height={680}>
        <CollectionLayout
          cards={COLLECTION_SHOWCASE_CARDS}
          products={COLLECTION_SHOWCASE_PRODUCTS}
          gridScrollable={false}
          onCloseDetails={() => {}}
          detailsCloseDisabled
          initialSelectedCatalogId={147729}
          initialSortMode="price"
          initialSortDirection="desc"
          className="website-ui-desktop-preview bg-background pt-4"
        />
      </ScaledUiPreview>
    </div>
  </section>
);
