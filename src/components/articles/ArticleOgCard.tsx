/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
**/

import { ArrowRight, Clock, Tag } from 'lucide-react'

import './ArticleOgCard.css'

export interface ArticleOgCardAuthor {
  name: string
  handle?: string
  avatar?: string
}

export interface ArticleOgCardProps {
  title: string
  description?: string
  author?: ArticleOgCardAuthor
  published?: string
  readTime?: string
  tags?: string[]
  /** The <img> src for the thumbnail. Pass an absolute URL when rendering
   *  through takumi so it matches a pre-fetched image source. */
  thumbnail?: string
}

/**
 * A 1200x630 OpenGraph card for an article, matching the catalog card layout:
 * title, description, author block, tag pills, a "Read article" footer, and a
 * contained thumbnail on the right. It is pure HTML/CSS so the same markup
 * renders in the browser preview and through takumi for the OG image.
 */
export function ArticleOgCard({
  title,
  description,
  author,
  published,
  readTime,
  tags,
  thumbnail,
}: ArticleOgCardProps) {
  const hasTags = Boolean(tags && tags.length > 0)
  const avatar = author?.avatar

  return (
    <div className="article-og-card">
      <div className="article-og-card-body">
        <h1 className="article-og-card-title">{title}</h1>
        {description ? (
          <p className="article-og-card-description">{description}</p>
        ) : null}
        {author ? (
          <div className="article-og-card-author">
            {avatar ? (
              <img className="article-og-card-avatar" src={avatar} alt={author.name} />
            ) : null}
            <div className="article-og-card-author-info">
              <div className="article-og-card-author-name-row">
                <span className="article-og-card-author-name">{author.name}</span>
                {author.handle ? (
                  <span className="article-og-card-author-handle">{author.handle}</span>
                ) : null}
              </div>
              {published || readTime ? (
                <div className="article-og-card-publish">
                  {published ? <span>{published}</span> : null}
                  {published && readTime ? (
                    <span className="article-og-card-meta-dot">·</span>
                  ) : null}
                  {readTime ? (
                    <span className="article-og-card-read-time">
                      <Clock size={14} aria-hidden="true" />
                      <span>{readTime}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {hasTags ? (
          <div className="article-og-card-tags">
            {tags!.map((tag, index) => (
              <span key={index} className="article-og-card-tag">
                <Tag size={14} aria-hidden="true" />
                <span>{tag}</span>
              </span>
            ))}
          </div>
        ) : null}
        <div className="article-og-card-footer">
          <span className="article-og-card-read">
            Read article <ArrowRight size={16} aria-hidden="true" />
          </span>
          <span className="article-og-card-domain">videreproject.com</span>
        </div>
      </div>
      {thumbnail ? (
        <div className="article-og-card-thumbnail-wrap">
          <img className="article-og-card-thumbnail" src={thumbnail} alt="" />
        </div>
      ) : null}
    </div>
  )
}
