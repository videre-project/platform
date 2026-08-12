/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { copyFile, mkdir } from 'node:fs/promises'

await mkdir(new URL('../dist/', import.meta.url), { recursive: true })
await mkdir(new URL('../dist/assets/', import.meta.url), { recursive: true })
await copyFile(
  new URL('../src/theme.css', import.meta.url),
  new URL('../dist/theme.css', import.meta.url),
)
await copyFile(
  new URL('../src/assets/backface.png', import.meta.url),
  new URL('../dist/assets/backface.png', import.meta.url),
)
await copyFile(
  new URL('../src/assets/m15-frame.png', import.meta.url),
  new URL('../dist/assets/m15-frame.png', import.meta.url),
)
