/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
**/

import { AlertCircle } from 'lucide-react'

import { ArticleOgCard } from '@/components/articles/ArticleOgCard'
import { articles } from '@/content/articles'
import './ArticleOgImagePage.css'

function readArticleSlug(search: string) {
  return new URLSearchParams(search).get('slug')
}

export default function ArticleOgImagePage() {
  const slug = readArticleSlug(window.location.search)
  const article = slug ? articles.find(entry => entry.slug === slug) : undefined
  const origin = window.location.origin

  return (
    <main
      className="article-og-image"
      data-article-og-ready={article ? 'true' : undefined}
      aria-label={`${article?.title ?? 'article'} share image`}
    >
      {article ? (
        <ArticleOgCard
          title={article.title}
          description={article.description}
          author={
            article.author
              ? {
                  name: article.author.name,
                  handle: article.author.handle,
                  avatar: article.author.avatar
                    ? new URL(article.author.avatar, origin).toString()
                    : undefined,
                }
              : undefined
          }
          published={article.published}
          readTime={article.readTime}
          tags={article.tags}
          thumbnail={
            article.thumbnail
              ? new URL(article.thumbnail, origin).toString()
              : undefined
          }
        />
      ) : (
        <section className="article-og-error">
          <AlertCircle size={28} />
          <div>
            <h1>{slug ?? 'Article'}</h1>
            <p>No article was found for that slug.</p>
          </div>
        </section>
      )}
    </main>
  )
}
