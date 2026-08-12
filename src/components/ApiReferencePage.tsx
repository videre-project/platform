/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React from 'react';
import { Header } from './Header';
import { ApiPreview } from './ApiPreview';
import { Footer } from './Footer';

/** Dedicated API reference surface, kept separate from the marketing overview. */
export const ApiReferencePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1, paddingTop: 'var(--space-lg)' }}>
        <ApiPreview />
      </main>
      <Footer />
    </div>
  );
};

export default ApiReferencePage;
