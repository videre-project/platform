/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
**/

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const entry = path.join(projectRoot, 'scripts', 'test-article-og-entry.ts')
const bundle = path.join(projectRoot, 'artifacts', 'test-article-og.bundle.cjs')

await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: bundle,
  external: ['takumi-js'],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
})

execFileSync(process.execPath, [bundle], { stdio: 'inherit', cwd: projectRoot })
