/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const functionsRoot = path.join(projectRoot, 'functions')

await rm(functionsRoot, { recursive: true, force: true })
await mkdir(path.join(functionsRoot, 'og'), { recursive: true })

const assetDirectory = path.join(projectRoot, 'dist', 'assets')
const assetNames = await readdir(assetDirectory)
const cssNames = assetNames.filter(name => (
  name.startsWith('index-')
  || name.startsWith('MetagamePage-')
  || name.startsWith('MetagameOgImagePage-')
) && name.endsWith('.css'))
const fontData = await readFile(path.join(projectRoot, 'public', 'fonts', 'inter-latin.woff2'))
const fontUrl = `data:font/woff2;base64,${fontData.toString('base64')}`
const fontBase64 = fontData.toString('base64')
const stylesheets = await Promise.all(cssNames.map(async name => (
  (await readFile(path.join(assetDirectory, name), 'utf8'))
    .replaceAll('/fonts/inter-latin.woff2', fontUrl)
)))

stylesheets.push(`
  .metagame-chart-section.is-static-render .metagame-matrix-header > span > span {
    width: max-content;
    max-width: none;
    overflow: visible;
    text-overflow: clip;
  }
`)

await writeFile(
  path.join(functionsRoot, 'metagame.ts'),
  "export { onRequestGet } from '../src/functions/metagame'\n",
)
await writeFile(
  path.join(functionsRoot, 'og', 'metagame.png.ts'),
  `import {
  onRequestGet as renderMetagameImage,
  onRequestHead as renderMetagameImageHead,
} from '../../src/functions/og/metagame.png'

const metagameStyles = ${JSON.stringify(stylesheets)}
const metagameFontBase64 = ${JSON.stringify(fontBase64)}

export function onRequestGet(context) {
  return renderMetagameImage({ ...context, metagameStyles, metagameFontBase64 })
}

export function onRequestHead(context) {
  return renderMetagameImageHead(context)
}
`,
)

console.log('Staged Pages Function entrypoints in /functions')
