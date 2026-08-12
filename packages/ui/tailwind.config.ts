/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Config } from 'tailwindcss'

import viderePreset from './tailwind.preset'

export default {
  presets: [viderePreset],
  content: [
    './src/**/*.{ts,tsx}',
    './stories/**/*.{ts,tsx}',
    './.storybook/**/*.{ts,tsx}',
  ],
} satisfies Config
