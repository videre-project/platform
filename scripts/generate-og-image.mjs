/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { chromium } from 'playwright'

const port = 4173
const host = '127.0.0.1'
const url = `http://${host}:${port}/__og-image`
const outputPath = path.resolve('dist/og-image.png')

const isListening = () => new Promise(resolve => {
  const socket = net.createConnection({ host, port })
  socket.once('connect', () => {
    socket.destroy()
    resolve(true)
  })
  socket.once('error', () => resolve(false))
})

const waitForServer = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isListening()) return
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`Vite preview did not start on ${host}:${port}`)
}

const server = spawn('pnpm', ['exec', 'vite', 'preview', '--host', host, '--port', String(port)], {
  stdio: 'ignore',
})

try {
  await waitForServer()

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1,
    })
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.evaluate(() => globalThis.document.fonts.ready)
    await page.waitForFunction(() => Array.from(globalThis.document.images).every(image => image.complete))
    await page.waitForTimeout(300)
    await page.screenshot({ path: outputPath, type: 'png' })
  } finally {
    await browser.close()
  }
} finally {
  server.kill('SIGTERM')
}
