/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import { ApiPreview } from '@/components/api/ApiPreview';
import { SiteLayout } from '@/layouts/SiteLayout';

/** Dedicated API reference surface, kept separate from the marketing overview. */
export const ApiReferencePage: React.FC = () => {
  return (
    <SiteLayout mainStyle={{ paddingTop: 'var(--space-lg)' }}>
        <ApiPreview />
    </SiteLayout>
  );
};

export default ApiReferencePage;
