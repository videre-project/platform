/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'tailwind-preset': 'tailwind.preset.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
})
