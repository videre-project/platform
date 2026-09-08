import { useEffect, useRef, useState, type ComponentType } from 'react'
import { ArrowLeft, ArrowRight, Clock, Tag } from 'lucide-react'

import { navigateTo } from '@/components/Header'
import { articles } from '@/content/articles'
import { SiteLayout } from '@/layouts/SiteLayout'
import { TableOfContents, MobileTableOfContents } from '@/components/articles/TableOfContents'
import { CardName } from '@/components/articles/CardName'
import { useTableOfContents } from '@/hooks/useTableOfContents'
import { useHumanEmDash } from '@/hooks/useHumanEmDash'
import './ArticlesPage.css'

export interface ArticleAuthor {
  name: string
  handle?: string
  url?: string
  avatar?: string
}

export interface ArticleFrontmatter {
  title: string
  dek?: string
  author?: ArticleAuthor | string
  authors?: string
  authorHandle?: string
  authorUrl?: string
  authorAvatar?: string
  tags?: string[] | string
  readTime?: string
  published?: string
  thumbnail?: string
}

interface ArticleModule {
  default: ComponentType
  frontmatter?: ArticleFrontmatter
}

const articleModules = import.meta.glob<ArticleModule>('../content/articles/*.mdx')

function ArticleCatalogView() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Articles | Videre Project'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <SiteLayout mainClassName="articles-page-main">
      <header className="articles-page-hero">
        <div className="container-wide">
          <div className="articles-page-heading">
            <div>
              <h1>Articles</h1>
              <p>Notes on competitive Magic, data quality, and the systems we use to understand a moving metagame.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container-wide">
        <section className="articles-page-results" aria-labelledby="articles-list-heading">
          <div className="articles-page-results-header">
            <div>
              <h2 id="articles-list-heading">Latest articles</h2>
              <p>Research and field notes from the Videre Project.</p>
            </div>
            <span>{articles.length} published article</span>
          </div>
          <div className="article-card-grid">
            {articles.map((article) => (
              <a
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="article-card"
                onClick={navigateTo(`/articles/${article.slug}`)}
              >
                <img className="article-card-thumbnail" src={article.thumbnail} alt="" />
                <div className="article-card-body">
                  <h3>{article.title}</h3>
                  <p>{article.description}</p>
                  {article.author && (
                    <div className="article-author-card">
                      {article.author.avatar && (
                        <img
                          src={article.author.avatar}
                          alt={article.author.name}
                          className="article-author-avatar"
                          loading="lazy"
                          onError={(e) => {
                            ;(e.currentTarget as HTMLElement).style.display = 'none'
                          }}
                        />
                      )}
                      <div className="article-author-info">
                        <div className="article-author-name-row">
                          <span className="article-author-name">{article.author.name}</span>
                          {article.author.handle && (
                            <span className="article-author-handle">{article.author.handle}</span>
                          )}
                        </div>
                        <div className="article-publish-details">
                          {article.published && <span>{article.published}</span>}
                          {article.published && <span className="meta-dot">·</span>}
                          <span className="article-read-time">
                            <Clock size={12} aria-hidden="true" />
                            <span>{article.readTime}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {article.tags && article.tags.length > 0 && (
                    <div className="article-tags-list">
                      {article.tags.map((tag, index) => (
                        <span key={index} className="article-tag-pill">
                          <Tag size={12} aria-hidden="true" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="article-card-link">
                    Read article <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  )
}

// Build the appendix's TOC sidebar, reusing the main sidebar's classes
// (.article-toc-sidebar / .article-toc-*) so it is the same kind of sticky
// sidebar as the article's. It lives in the band's reserved spacer column,
// aligned under the main TOC, and stays visible even while collapsed
// (clipped with the same fade the content uses, see CSS). The headings
// already carry ids assigned by the TOC scan, so we just link to them.
function buildAppendixTocSidebar(appendix: HTMLElement): HTMLElement | null {
  const heading = appendix.querySelector<HTMLElement>('h2')
  const sections = Array.from(appendix.querySelectorAll<HTMLElement>('h3'))
  if (!heading && sections.length === 0) return null

  const entries: Array<{ element: HTMLElement; level: number }> = []
  if (heading) {
    entries.push({ element: heading, level: 2 })
  }
  sections.forEach((section) => entries.push({ element: section, level: 3 }))

  const sidebar = document.createElement('aside')
  sidebar.className = 'article-toc-sidebar article-appendix-toc-sidebar'
  sidebar.setAttribute('aria-label', 'Appendix contents')

  const toc = document.createElement('nav')
  toc.className = 'article-toc-nav'
  toc.setAttribute('aria-label', 'Appendix contents')

  const header = document.createElement('div')
  header.className = 'article-toc-header'
  const headerLabel = document.createElement('span')
  headerLabel.textContent = 'Contents'
  header.appendChild(headerLabel)
  toc.appendChild(header)

  const container = document.createElement('div')
  container.className = 'article-toc-container'

  const activeBar = document.createElement('div')
  activeBar.className = 'article-toc-active-bar'
  activeBar.setAttribute('aria-hidden', 'true')
  activeBar.style.opacity = '0'
  container.appendChild(activeBar)

  const list = document.createElement('ul')
  list.className = 'article-toc-list'
  entries.forEach(({ element, level }) => {
    const text = element.textContent?.trim()
    if (!text) return
    let id = element.id
    if (!id) {
      id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
      element.id = id
    }
    const item = document.createElement('li')
    item.className = `article-toc-item article-toc-level-${level}`
    const link = document.createElement('a')
    link.href = `#${id}`
    link.className = 'article-toc-link'
    link.textContent = text
    link.addEventListener('click', (event) => {
      event.preventDefault()
      const top = element.getBoundingClientRect().top + window.scrollY - 90
      window.scrollTo({ top, behavior: 'smooth' })
      list
        .querySelectorAll<HTMLElement>('.article-toc-item.is-active')
        .forEach((el) => el.classList.remove('is-active'))
      item.classList.add('is-active')
      positionAppendixTocBar(toc)
    })
    item.appendChild(link)
    list.appendChild(item)
  })
  container.appendChild(list)
  toc.appendChild(container)

  // Highlight the first entry; the bar is positioned on expand (the sidebar
  // is hidden while collapsed, so its geometry is only valid once expanded).
  const firstItem = list.querySelector<HTMLElement>('.article-toc-item')
  if (firstItem) {
    firstItem.classList.add('is-active')
  }
  sidebar.appendChild(toc)
  return sidebar
}

// Reposition the sliding active bar to the currently active appendix TOC item.
function positionAppendixTocBar(toc: HTMLElement) {
  const list = toc.querySelector<HTMLElement>('.article-toc-list')
  const bar = toc.querySelector<HTMLElement>('.article-toc-active-bar')
  if (!list || !bar) return
  const active = list.querySelector<HTMLElement>('.article-toc-item.is-active')
  if (!active) {
    bar.style.opacity = '0'
    return
  }
  const listRect = list.getBoundingClientRect()
  const activeRect = active.getBoundingClientRect()
  bar.style.transform = `translateY(${activeRect.top - listRect.top}px)`
  bar.style.height = `${activeRect.height}px`
  bar.style.opacity = '1'
}

function ArticleReaderView({ slug }: { slug: string }) {
  const [ArticleComponent, setArticleComponent] = useState<ComponentType<any> | null>(null)
  const [meta, setMeta] = useState<ArticleFrontmatter | null>(null)
  const [notFound, setNotFound] = useState(false)
  const articleContainerRef = useRef<HTMLDivElement>(null)
  const appendixBandRef = useRef<HTMLDivElement>(null)
  const { items: tocItems, activeId, scrollTo } = useTableOfContents(articleContainerRef, ArticleComponent)
  useHumanEmDash(articleContainerRef, ArticleComponent)

  // The appendix is authored inside the article (and wrapped in
  // <div class="article-appendix article-prose"> by the rehype plugin). Lift
  // it out of the 740px content column into a full-width band so its
  // background spans the page, echoing the hero header. The appendix is
  // collapsed by default behind a toggle.
  useEffect(() => {
    if (!ArticleComponent) return
    const container = articleContainerRef.current
    const band = appendixBandRef.current
    if (!container || !band) return

    const bodyWrapper = band.parentElement
    const appendix = container.querySelector<HTMLElement>('.article-appendix')
    if (!appendix) {
      // No appendix in this article: keep the band hidden.
      band.textContent = ''
      band.classList.remove('is-populated')
      bodyWrapper?.classList.remove('has-appendix')
      return
    }

    // Clear any appendix left over from a previous article, then move the
    // current one into the full-width band and reveal it.
    band.classList.add('is-populated')
    bodyWrapper?.classList.add('has-appendix')
    band.textContent = ''
    band.appendChild(appendix)

    // Mirror the article's layout so the appendix aligns with the reading
    // column: a 740px column plus a spacer that reserves the TOC sidebar's
    // width. The spacer hosts the appendix's own sticky TOC sidebar.
    const column = document.createElement('div')
    column.className = 'article-appendix-column'
    const spacer = document.createElement('div')
    spacer.className = 'article-appendix-spacer'

    // The wrapper carries article-prose (added by the rehype plugin) so the
    // lifted content keeps the article typography. Move it onto the content
    // column so the TOC sidebar in the spacer is not styled by the body
    // rules (.article-prose a, .article-prose li, ...).
    appendix.classList.remove('article-prose')
    column.classList.add('article-prose')
    const appendixToc = buildAppendixTocSidebar(appendix)
    if (appendixToc) {
      spacer.appendChild(appendixToc)
    }
    appendix.appendChild(column)
    appendix.appendChild(spacer)

    // Capture the original children. The leading "Appendix" heading stays in
    // the flow (it is the first thing in the preview, so the collapsed state
    // still signals there is an appendix).
    const originalChildren = Array.from(appendix.childNodes).filter(
      (node) => node !== column && node !== spacer
    )

    // The body is wrapped in a collapsible container that is always in the
    // DOM. The collapsed state clips it to a short preview with a fade (see
    // CSS); the expanded state reveals it in full. Keeping the heading inside
    // the clip box means the preview and the TOC sidebar's clip start at the
    // same position, so their fades line up.
    const content = document.createElement('div')
    content.className = 'article-appendix-content'
    column.appendChild(content)
    originalChildren.forEach((node) => {
      content.appendChild(node)
    })

    // Build the toggle (centered, no caret) as a DOM node rather than a React
    // element so it is not reconciled against the managed appendix subtree.
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'article-appendix-toggle'
    toggle.setAttribute('aria-expanded', 'false')

    const label = document.createElement('span')
    label.className = 'article-appendix-toggle-label'
    label.textContent = 'Read the appendix'
    toggle.appendChild(label)

    const toggleWrap = document.createElement('div')
    toggleWrap.className = 'article-appendix-toggle-wrap'
    toggleWrap.appendChild(toggle)
    column.appendChild(toggleWrap)

    // Keep the active item in the appendix TOC in sync with a heading. Pass
    // null to fall back to the first entry (used when collapsed, where the
    // body is clipped and only the leading heading is meaningful).
    const setAppendixActive = (headingEl: HTMLElement | null) => {
      if (!appendixToc) return
      const list = appendixToc.querySelector<HTMLElement>('.article-toc-list')
      if (!list) return
      list
        .querySelectorAll<HTMLElement>('.article-toc-item.is-active')
        .forEach((el) => el.classList.remove('is-active'))
      const item = headingEl
        ? Array.from(list.querySelectorAll<HTMLElement>('.article-toc-item')).find(
            (li) => li.querySelector('a')?.getAttribute('href') === `#${headingEl.id}`
          )
        : list.querySelector<HTMLElement>('.article-toc-item')
      if (item) {
        item.classList.add('is-active')
        positionAppendixTocBar(appendixToc)
      }
    }

    // Scroll-spy: as the (expanded) appendix scrolls, highlight the heading
    // currently in view, mirroring the main sidebar's behavior.
    const tocHeadings = Array.from(appendix.querySelectorAll<HTMLElement>('h2, h3'))
    const spy = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) {
          setAppendixActive(visible[0].target as HTMLElement)
          return
        }
        // Fallback: the last heading that has scrolled above the top of the
        // viewport.
        let current: HTMLElement | null = null
        for (const el of tocHeadings) {
          if (el.getBoundingClientRect().top <= 120) current = el
          else break
        }
        setAppendixActive(current)
      },
      { rootMargin: '-80px 0px -65% 0px', threshold: [0, 1] }
    )
    tocHeadings.forEach((el) => spy.observe(el))

    const setExpanded = (expanded: boolean) => {
      band.classList.toggle('is-expanded', expanded)
      toggle.setAttribute('aria-expanded', String(expanded))
      label.textContent = expanded ? 'Hide the appendix' : 'Read the appendix'
      requestAnimationFrame(() => {
        if (!appendixToc) return
        if (expanded) {
          // The layout just reflowed; align the bar with the current scroll
          // position (the observer also settles on the new intersections).
          positionAppendixTocBar(appendixToc)
        } else {
          setAppendixActive(null)
        }
      })
    }
    toggle.addEventListener('click', () =>
      setExpanded(!band.classList.contains('is-expanded'))
    )

    return () => {
      spy.disconnect()
      band.textContent = ''
      band.classList.remove('is-populated', 'is-expanded')
      bodyWrapper?.classList.remove('has-appendix')
    }
  }, [ArticleComponent])

  useEffect(() => {
    const importPath = `../content/articles/${slug}.mdx`
    const loader = articleModules[importPath]

    if (!loader) {
      setNotFound(true)
      return
    }

    let isMounted = true

    loader()
      .then((mod: ArticleModule) => {
        if (!isMounted) return
        setArticleComponent(() => mod.default)
        setMeta(mod.frontmatter || null)
        if (mod.frontmatter?.title) {
          document.title = `${mod.frontmatter.title} | Videre Project`
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load article:', err)
        if (isMounted) setNotFound(true)
      })

    return () => {
      isMounted = false
    }
  }, [slug])

  if (notFound) {
    return (
      <SiteLayout mainClassName="article-page-main">
        <header className="article-hero-header">
          <div className="article-hero-container">
            <div className="article-hero-topbar">
              <a className="article-back-link" href="/articles" onClick={navigateTo('/articles')}>
                <ArrowLeft size={15} aria-hidden="true" />
                <span>All articles</span>
              </a>
            </div>
            <h1 className="article-hero-title">Article not found</h1>
            <p className="article-hero-dek">The requested article could not be found.</p>
          </div>
        </header>
      </SiteLayout>
    )
  }

  if (!ArticleComponent || !meta) {
    return (
      <SiteLayout mainClassName="article-page-main">
        <header className="article-hero-header">
          <div className="article-hero-container">
            <div className="article-hero-topbar">
              <a className="article-back-link" href="/articles" onClick={navigateTo('/articles')}>
                <ArrowLeft size={15} aria-hidden="true" />
                <span>All articles</span>
              </a>
            </div>
            <h1 className="article-hero-title">Loading article…</h1>
          </div>
        </header>
      </SiteLayout>
    )
  }

  const authorName =
    (typeof meta.author === 'object' ? meta.author?.name : meta.author) ||
    meta.authors ||
    'Qonfused'

  const authorHandle =
    (typeof meta.author === 'object' ? meta.author?.handle : undefined) ||
    meta.authorHandle ||
    '@TheQonfused'

  const authorUrl =
    (typeof meta.author === 'object' ? meta.author?.url : undefined) ||
    meta.authorUrl ||
    (authorHandle ? `https://x.com/${authorHandle.replace(/^@/, '')}` : undefined)

  const authorAvatar =
    (typeof meta.author === 'object' ? meta.author?.avatar : undefined) ||
    meta.authorAvatar ||
    'https://github.com/Qonfused.png'

  const tags: string[] = Array.isArray(meta.tags)
    ? meta.tags
    : typeof meta.tags === 'string'
      ? [meta.tags]
      : []

  return (
    <SiteLayout mainClassName="article-page-main">
      <header className="article-hero-header">
        <div className="article-hero-container">
          <div className="article-hero-topbar">
            <a className="article-back-link" href="/articles" onClick={navigateTo('/articles')}>
              <ArrowLeft size={15} aria-hidden="true" />
              <span>All articles</span>
            </a>
          </div>

          <h1 className="article-hero-title">{meta.title}</h1>
          {meta.dek && <p className="article-hero-dek">{meta.dek}</p>}

          <div className="article-hero-meta-panel">
            <div className="article-author-card">
              <img
                src={authorAvatar}
                alt={authorName}
                className="article-author-avatar"
                onError={(e) => {
                  ;(e.currentTarget as HTMLElement).style.display = 'none'
                }}
              />
              <div className="article-author-info">
                <div className="article-author-name-row">
                  <span className="article-author-name">{authorName}</span>
                  {authorHandle && (
                    <a
                      href={authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="article-author-handle"
                    >
                      {authorHandle}
                    </a>
                  )}
                </div>
                <div className="article-publish-details">
                  {meta.published && <span>{meta.published}</span>}
                  {meta.published && <span className="meta-dot">·</span>}
                  <span className="article-read-time">
                    <Clock size={12} aria-hidden="true" />
                    <span>{meta.readTime || '15 min read'}</span>
                  </span>
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="article-tags-panel">
                <div className="article-tags-list">
                  {tags.map((tag, index) => (
                    <span key={index} className="article-tag-pill">
                      <Tag size={12} aria-hidden="true" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="article-body-wrapper">
        <div className="article-layout-container">
          <div ref={articleContainerRef} className="article-main-content">
            {tocItems.length > 0 && (
              <MobileTableOfContents
                items={tocItems}
                activeId={activeId}
                onSelect={scrollTo}
              />
            )}
            <article className="article-prose">
              <ArticleComponent components={{ em: CardName }} />
            </article>
          </div>
          {tocItems.length > 0 && (
            <aside className="article-toc-sidebar" aria-label="Table of contents">
              <TableOfContents items={tocItems} activeId={activeId} onSelect={scrollTo} />
            </aside>
          )}
        </div>
        <div ref={appendixBandRef} className="article-appendix-band" />
      </div>
    </SiteLayout>
  )
}

export default function ArticlesPage({ slug }: { slug?: string }) {
  if (slug) {
    return <ArticleReaderView slug={slug} />
  }
  return <ArticleCatalogView />
}
