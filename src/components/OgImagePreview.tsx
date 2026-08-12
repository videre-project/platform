/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import { Header } from './Header';
import { OverviewContent } from './OverviewContent';

/**
 * Build-only composition for the social preview image.
 *
 * This intentionally reuses the production hero rather than maintaining a
 * second illustration, copy treatment, or screenshot crop system.
 */
export const OgImagePreview: React.FC = () => (
  <div className="og-image-preview">
    <Header />
    <OverviewContent />
  </div>
);
