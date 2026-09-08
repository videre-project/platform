/** Local render test for the article OG card (native takumi backend).
 *  Bundled by esbuild and run with Node; see scripts/test-article-og.mjs. **/

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { render } from 'takumi-js'

import { ArticleOgCard } from '../src/components/articles/ArticleOgCard'

// Run from the project root (see scripts/test-article-og.mjs).
const projectRoot = process.cwd()
const article = {
  title: 'Measuring Format Health',
  description: 'Analyzing 5 million games of MTGO through field diversity and matchup polarity.',
  author: {
    name: 'Qonfused',
    handle: '@TheQonfused',
    avatar: 'https://github.com/Qonfused.png',
  },
  published: 'Sep 5, 2026',
  readTime: '29 min read',
  tags: ['Modern', 'Metagame Analysis', 'Polarity', 'Homogeneity', 'MTGO', 'Sideboarding'],
  thumbnail: 'https://videreproject.com/articles/polarity-atlas.png',
}

function loadStylesheets() {
  const assets = path.join(projectRoot, 'dist', 'assets')
  const fontData = readFileSync(path.join(projectRoot, 'public', 'fonts', 'inter-latin.woff2'))
  const fontUrl = `data:font/woff2;base64,${fontData.toString('base64')}`
  const wanted = readdirSync(assets).filter(name => (
    name.endsWith('.css')
    && (name.startsWith('index-') || name.startsWith('ArticleOgImagePage-'))
  ))
  return wanted.map(name => (
    readFileSync(path.join(assets, name), 'utf8').replaceAll('/fonts/inter-latin.woff2', fontUrl)
  ))
}

async function main() {
  const images: Array<{ src: string; data: Uint8Array }> = []
  const thumbnailBytes = readFileSync(path.join(projectRoot, 'public', 'articles', 'polarity-atlas.png'))
  images.push({ src: article.thumbnail as string, data: thumbnailBytes })

  let avatar = article.author?.avatar
  if (avatar) {
    try {
      const response = await fetch(avatar)
      if (response.ok) images.push({ src: avatar, data: new Uint8Array(await response.arrayBuffer()) })
      else avatar = undefined
    } catch {
      avatar = undefined
    }
  }

  const markup = renderToStaticMarkup(React.createElement(
    'main',
    { className: 'article-og-image' },
    React.createElement(ArticleOgCard, {
      title: article.title,
      description: article.description,
      author: { name: article.author!.name, handle: article.author!.handle, avatar },
      published: article.published,
      readTime: article.readTime,
      tags: article.tags,
      thumbnail: article.thumbnail,
    }),
  ))

  const image = await render(markup, {
    width: 1200,
    height: 630,
    stylesheets: loadStylesheets(),
    fontFamilies: ['Inter'],
    images,
  })

  const out = path.join(projectRoot, 'artifacts', 'article-og-preview.png')
  mkdirSync(path.dirname(out), { recursive: true })
  writeFileSync(out, image)
  console.log(`Wrote ${out} (${image.length} bytes)`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
