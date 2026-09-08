/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { load as parseYaml } from 'js-yaml'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const functionsRoot = path.join(projectRoot, 'functions')

await rm(functionsRoot, { recursive: true, force: true })
await mkdir(path.join(functionsRoot, 'og'), { recursive: true })
await mkdir(path.join(functionsRoot, 'articles'), { recursive: true })

const assetDirectory = path.join(projectRoot, 'dist', 'assets')
const assetNames = await readdir(assetDirectory)
const fontData = await readFile(path.join(projectRoot, 'public', 'fonts', 'inter-latin.woff2'))
const fontUrl = `data:font/woff2;base64,${fontData.toString('base64')}`
const fontBase64 = fontData.toString('base64')

// Collect the built CSS chunks a Pages function needs and inline the Inter
// font as a data URL so the renderer has no external asset to fetch.
async function collectStylesheets(prefixes) {
  const names = assetNames.filter(name => (
    prefixes.some(prefix => name.startsWith(prefix)) && name.endsWith('.css')
  ))
  return Promise.all(names.map(async name => (
    (await readFile(path.join(assetDirectory, name), 'utf8'))
      .replaceAll('/fonts/inter-latin.woff2', fontUrl)
  )))
}

const metagameStyles = await collectStylesheets([
  'index-',
  'MetagamePage-',
  'MetagameOgImagePage-',
])
metagameStyles.push(`
  .metagame-chart-section.is-static-render .metagame-matrix-header > span > span {
    width: max-content;
    max-width: none;
    overflow: visible;
    text-overflow: clip;
  }
`)

const articleStyles = await collectStylesheets([
  'index-',
  'ArticleOgCard-',
  'ArticleOgImagePage-',
])

// Build the article manifest from the MDX frontmatter so the Pages functions
// (bundled by wrangler, without Vite's import.meta.glob) know every article.
const articlesDirectory = path.join(projectRoot, 'src', 'content', 'articles')
const articleFileNames = await readdir(articlesDirectory)

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  return parseYaml(match[1]) || {}
}

function normalizeAuthor(frontmatter) {
  if (frontmatter.author && typeof frontmatter.author === 'object') {
    return {
      name: frontmatter.author.name || '',
      ...(frontmatter.author.handle ? { handle: frontmatter.author.handle } : {}),
      ...(frontmatter.author.avatar ? { avatar: frontmatter.author.avatar } : {}),
    }
  }
  if (typeof frontmatter.author === 'string') return { name: frontmatter.author }
  if (typeof frontmatter.authors === 'string') return { name: frontmatter.authors }
  return undefined
}

const articleManifest = (await Promise.all(articleFileNames
  .filter(name => name.endsWith('.mdx'))
  .map(async name => {
    const slug = name.replace(/\.mdx$/, '')
    const frontmatter = parseFrontmatter(await readFile(path.join(articlesDirectory, name), 'utf8'))
    const author = normalizeAuthor(frontmatter)
    return {
      slug,
      title: frontmatter.title || slug,
      description: frontmatter.dek || '',
      thumbnail: frontmatter.thumbnail || `/articles/${slug}-thumbnail.png`,
      readTime: frontmatter.readTime || '10 min read',
      published: frontmatter.published || '',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      ...(author ? { author } : {}),
    }
  })))
  .sort((a, b) => a.slug.localeCompare(b.slug))

const manifestJson = JSON.stringify(articleManifest)

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

const metagameStyles = ${JSON.stringify(metagameStyles)}
const metagameFontBase64 = ${JSON.stringify(fontBase64)}

export function onRequestGet(context) {
  return renderMetagameImage({ ...context, metagameStyles, metagameFontBase64 })
}

export function onRequestHead(context) {
  return renderMetagameImageHead(context)
}
`,
)
await writeFile(
  path.join(functionsRoot, 'og', 'article.png.ts'),
  `import {
  onRequestGet as renderArticleImage,
  onRequestHead as renderArticleImageHead,
} from '../../src/functions/og/article.png'

const articleStyles = ${JSON.stringify(articleStyles)}
const articleFontBase64 = ${JSON.stringify(fontBase64)}
const articleManifest = ${manifestJson}

export function onRequestGet(context) {
  return renderArticleImage({ ...context, articleStyles, articleFontBase64, articleManifest })
}

export function onRequestHead(context) {
  return renderArticleImageHead(context)
}
`,
)
await writeFile(
  path.join(functionsRoot, 'articles', '[slug].ts'),
  `import {
  onRequestGet as rewriteArticleMeta,
} from '../../src/functions/articles/[slug]'

const articleManifest = ${manifestJson}

export function onRequestGet(context) {
  return rewriteArticleMeta({ ...context, articleManifest })
}
`,
)

console.log(`Staged Pages Function entrypoints in /functions (${articleManifest.length} articles)`)
