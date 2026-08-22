/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const functionsRoot = path.join(projectRoot, 'functions')

await rm(functionsRoot, { recursive: true, force: true })
await mkdir(path.join(functionsRoot, 'og'), { recursive: true })

await writeFile(
  path.join(functionsRoot, 'metagame.ts'),
  "export { onRequestGet } from '../src/functions/metagame'\n",
)
await writeFile(
  path.join(functionsRoot, 'og', 'metagame.png.ts'),
  "export { onRequestGet, onRequestHead } from '../../src/functions/og/metagame.png'\n",
)

console.log('Staged Pages Function entrypoints in /functions')
