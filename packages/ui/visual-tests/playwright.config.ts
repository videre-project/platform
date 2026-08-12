/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const uiRoot = path.resolve(dirname, '..')

export default defineConfig({
  testDir: dirname,
  testMatch: 'parity.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: path.join(uiRoot, 'playwright-report'), open: 'never' }]],
  snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      threshold: 0.2,
      maxDiffPixelRatio: 0.002,
    },
  },
  use: {
    ...devices['Desktop Chrome'],
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'dark',
    contextOptions: {
      reducedMotion: 'reduce',
    },
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec storybook dev -p 6006 --no-open --ci',
    cwd: uiRoot,
    url: 'http://127.0.0.1:6006/index.json',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'shared', metadata: { target: 'shared' } },
  ],
})
