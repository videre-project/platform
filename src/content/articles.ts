/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export interface ArticleAuthorSummary {
  name: string
  handle?: string
  avatar?: string
}

export interface ArticleSummary {
  slug: string
  title: string
  description: string
  thumbnail: string
  readTime: string
  published: string
  tags?: string[]
  author?: ArticleAuthorSummary
}

interface ArticleModule {
  frontmatter?: {
    title?: string
    dek?: string
    author?: {
      name?: string
      handle?: string
      url?: string
      avatar?: string
    } | string
    authors?: string
    tags?: string[]
    readTime?: string
    published?: string
    thumbnail?: string
  }
}

const articleModules = import.meta.glob<ArticleModule>('./articles/*.mdx', { eager: true })

export const articles: ArticleSummary[] = Object.entries(articleModules).map(([filePath, mod]) => {
  const slug = filePath.replace(/^.*\/([^/]+)\.mdx$/, '$1')
  const fm = mod.frontmatter || {}
  return {
    slug,
    title: fm.title || slug,
    description: fm.dek || '',
    thumbnail: fm.thumbnail || `/articles/${slug}-thumbnail.png`,
    readTime: fm.readTime || '10 min read',
    published: fm.published || '',
    tags: fm.tags || [],
    author:
      typeof fm.author === 'object'
        ? { name: fm.author.name || '', handle: fm.author.handle, avatar: fm.author.avatar }
        : fm.author || fm.authors
          ? { name: fm.author || fm.authors || '' }
          : undefined,
  }
})
