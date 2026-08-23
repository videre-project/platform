/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ReplaceAll, BookOpen, CalendarDays, Check, Eye, ListOrdered, LockKeyhole, Minus, Swords, Trophy, Users, X } from 'lucide-react'
import { Button, CardTooltipProvider, DeckEditorVignette, Skeleton, getDisplayCardColors, getManaSymbolSvgPath, useCardTooltipHover, type DeckEditorCard } from '@videreproject/ui'

import { Footer } from '@/components/Footer'
import { Header, navigateTo } from '@/components/Header'
import { useEventDetails, useEventMatches, useSelectedDeckCardCatalog, type EventCard, type EventDeck, type EventStanding } from '@/hooks/useEvents'
import { formatCalendarDate, getCalendarDate } from '@/utils/calendarDate'
import { formatEventTitle } from '@/utils/eventFormatting'
import { openTrackerDeckImport } from '@/utils/trackerImport'
import './EventPages.css'

type DetailTab = 'matchups' | 'decklist' | 'sideboarding'

interface DeckCard {
  id: number
  name: string
  quantity: number
  manaValue: number | null
  manaCost: string | null
  typeLine: string | null
  imageUrl: string | null
}

const DECK_CARD_TUPLE = /^\((\d+),\s*(?:"([^"]*)"|([^,()]+)),\s*(\d+)\)$/

function formatDate(date: string) {
  return formatCalendarDate(date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

function formatMatchRound(round: number, swissRounds: number) {
  const playoffRound = round - swissRounds
  if (playoffRound === 1) return 'QF'
  if (playoffRound === 2) return 'SF'
  if (playoffRound === 3) return 'F'
  return `R${round}`
}

function standingKey(standing: EventStanding) {
  return `${standing.rank}-${standing.player}`
}

function MatchResultIcon({ result }: { result: string }) {
  if (result === 'win') return <span className="event-detail-match-result is-win" aria-label="Win"><Check size={13} /></span>
  if (result === 'loss') return <span className="event-detail-match-result is-loss" aria-label="Loss"><X size={13} /></span>
  return <span className="event-detail-match-result is-draw" aria-label="Draw"><Minus size={13} /></span>
}

function ManaSymbols({ colors }: { colors?: readonly string[] | null }) {
  if (!colors) return null
  return <span className="event-detail-match-symbols" aria-label="Mana symbols">{getDisplayCardColors(colors).map(color => <img key={color} src={getManaSymbolSvgPath(color) ?? undefined} alt={color} />)}</span>
}

function parseDeckCards(entries: unknown[] | undefined, cardCatalog: Record<number, {
  display_name?: string
  name: string
  image_url?: string
  oracle_id?: string
  mana_cost: string | null
  mana_value: number | null
  type_line: string | null
  faces?: Array<{ mana_cost: string | null; mana_value: number | null; type_line: string | null }>
}>): DeckCard[] {
  const cards = new Map<string, DeckCard>()

  for (const entry of entries ?? []) {
    if (typeof entry !== 'string') continue
    const match = entry.match(DECK_CARD_TUPLE)
    if (!match) continue
    const id = Number(match[1])
    const card = cardCatalog[id]
    const name = card?.display_name ?? card?.name ?? match[2] ?? match[3] ?? 'Unknown card'
    const parsedCard: DeckCard = {
      id,
      name,
      quantity: Number(match[4]),
      manaValue: card?.mana_value ?? card?.faces?.[0]?.mana_value ?? null,
      manaCost: card?.mana_cost || card?.faces?.map(face => face.mana_cost).filter(Boolean).join(' // ') || null,
      typeLine: card?.type_line ?? card?.faces?.[0]?.type_line ?? null,
      imageUrl: card?.image_url ?? null,
    }
    const key = card?.oracle_id ?? name.trim().toLocaleLowerCase()
    const existing = cards.get(key)
    cards.set(key, existing
      ? { ...existing, quantity: existing.quantity + parsedCard.quantity }
      : parsedCard)
  }

  return [...cards.values()]
}

function toEditorCards(deck: EventDeck | undefined, cardCatalog: Record<number, EventCard>): DeckEditorCard[] {
  if (!deck) return []

  const mainboard = parseDeckCards(deck.mainboard, cardCatalog)
  const sideboard = parseDeckCards(deck.sideboard, cardCatalog)
  return [
    ...mainboard.map(card => ({ card, zone: 'Mainboard' as const })),
    ...sideboard.map(card => ({ card, zone: 'Sideboard' as const })),
  ].map(({ card, zone }, index) => {
    const metadata = cardCatalog[card.id]
    const typeLine = card.typeLine ?? ''
    return {
      index,
      originalIndex: index,
      catalogId: card.id,
      name: card.name,
      quantity: card.quantity,
      cmc: card.manaValue ?? 0,
      colors: metadata?.colors ?? [],
      types: typeLine.split('—', 1)[0].trim().split(/\s+/).filter(Boolean),
      rarity: 'common',
      zone,
      imageUrl: card.imageUrl,
    }
  })
}

function buildDeckListText(cards: DeckEditorCard[]) {
  const buildSection = (zone: DeckEditorCard['zone']) => cards
    .filter(card => card.zone === zone)
    .map(card => `${card.quantity} ${card.name}`)
  const mainboard = buildSection('Mainboard')
  const sideboard = buildSection('Sideboard')
  return sideboard.length > 0 ? [...mainboard, '', ...sideboard].join('\n') : mainboard.join('\n')
}

function getDeckFileName(deckName: string) {
  const stem = deckName
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${stem || 'deck'}.txt`
}

const DECK_CARD_GROUPS: Array<{ label: string; icon: string; type: string }> = [
  { label: 'Creatures', icon: 'creature', type: 'Creature' },
  { label: 'Sorceries', icon: 'sorcery', type: 'Sorcery' },
  { label: 'Instants', icon: 'instant', type: 'Instant' },
  { label: 'Artifacts', icon: 'artifact', type: 'Artifact' },
  { label: 'Enchantments', icon: 'enchantment', type: 'Enchantment' },
  { label: 'Planeswalkers', icon: 'planeswalker', type: 'Planeswalker' },
  { label: 'Lands', icon: 'land', type: 'Land' },
]

function sortDeckCards(cards: DeckCard[]) {
  return [...cards].sort((left, right) => {
    if (left.manaValue == null && right.manaValue != null) return 1
    if (left.manaValue != null && right.manaValue == null) return -1
    if (left.manaValue != null && right.manaValue != null && left.manaValue !== right.manaValue) {
      return left.manaValue - right.manaValue
    }
    return left.name.localeCompare(right.name)
  })
}

function getDeckCardGroup(card: DeckCard) {
  if (card.typeLine?.includes('Land')) return 'Lands'
  return DECK_CARD_GROUPS.find(group => card.typeLine?.includes(group.type))?.label ?? 'Other'
}

function ManaCost({ cost, isLand }: { cost: string | null; isLand: boolean }) {
  if (!cost) return isLand ? null : <span className="event-detail-deck-card-mana-empty">—</span>

  return <span className="event-detail-deck-card-mana" aria-label={`Mana cost ${cost}`}>
    {cost.split(/(\{[^}]+\}|\/\/)/g).filter(Boolean).map((part, index) => {
      if (part === '//') return <span key={`${part}-${index}`}>//</span>
      const symbol = part.match(/^\{(.+)\}$/)?.[1]
      const path = symbol ? getManaSymbolSvgPath(symbol) : null
      return path
        ? <img key={`${part}-${index}`} src={path} alt={part} />
        : <span key={`${part}-${index}`}>{part}</span>
    })}
  </span>
}

function DeckCardGroup({
  label,
  icon: Icon,
  cards,
  boardHeading = false,
}: {
  label: string
  icon?: string
  cards: DeckCard[]
  boardHeading?: boolean
}) {
  if (cards.length === 0) return null
  const count = cards.reduce((total, card) => total + card.quantity, 0)

  return <section className="event-detail-deck-group">
    <h3 className={boardHeading ? 'event-detail-deck-board-heading' : undefined}>{Icon ? <span className={`ms ms-${Icon}`} aria-hidden="true" /> : null}{label} ({count})</h3>
    <div className="event-detail-deck-card-list">
      {cards.map(card => <DeckCardRow card={card} key={`${card.id}-${card.name}`} />)}
    </div>
  </section>
}

function DeckCardRow({ card }: { card: DeckCard }) {
  const tooltipHandlers = useCardTooltipHover({ catalogId: card.id, name: card.name, imageUrl: card.imageUrl })

  return <div className="event-detail-deck-card" {...tooltipHandlers}>
    <span className="event-detail-deck-card-quantity">{card.quantity}</span>
    <strong>{card.name}</strong>
    <ManaCost cost={card.manaCost} isLand={card.typeLine?.includes('Land') ?? false} />
  </div>
}

function getStandingsBottom(
  table: HTMLElement | null,
  scrollbar: HTMLElement | null,
) {
  if (!table) return null

  let bottom = table.getBoundingClientRect().bottom
  const hasDesktopScrollbar = window.innerWidth >= 880
    && window.innerWidth < 1200
    && table.scrollWidth > table.clientWidth + 1

  if (hasDesktopScrollbar && scrollbar) bottom += scrollbar.offsetHeight
  return bottom
}

function syncSidebarPanelViewport(panel: HTMLElement, standingsBottom: number | null) {
  if (window.innerWidth < 880) {
    panel.style.minHeight = ''
    panel.style.maxHeight = ''
    panel.style.overflowY = ''
    return
  }

  const panelTop = panel.getBoundingClientRect().top
  const pageMain = panel.closest<HTMLElement>('.event-detail-page-main')
  const pageShell = panel.closest<HTMLElement>('.events-page-shell')
  const footer = pageShell?.querySelector<HTMLElement>('.site-footer')
  const mainBottomPadding = pageMain == null
    ? 0
    : Number.parseFloat(window.getComputedStyle(pageMain).paddingBottom)
  const footerHeight = footer?.getBoundingClientRect().height ?? 0
  const pageContentFloor = window.innerHeight - footerHeight - mainBottomPadding
  const contentBottom = Math.max(pageContentFloor, standingsBottom ?? pageContentFloor)
  const availableBottom = Math.min(window.innerHeight - 16, contentBottom)
  const desiredHeight = Math.max(0, availableBottom - panelTop)
  panel.style.minHeight = `${desiredHeight}px`
  panel.style.maxHeight = `${desiredHeight}px`
  panel.style.overflowY = 'auto'
}

function DetailTabs({
  detailTab,
  isLeagueEvent,
  onChange,
}: {
  detailTab: DetailTab
  isLeagueEvent: boolean
  onChange: (tab: DetailTab) => void
}) {
  return <div className="event-detail-sidebar-tabs" role="tablist" aria-label="Player details">
    <button type="button" role="tab" aria-selected={detailTab === 'decklist'} className={detailTab === 'decklist' ? 'is-active' : undefined} onClick={() => onChange('decklist')}><BookOpen size={16} />Decklist</button>
    <button
      type="button"
      role="tab"
      aria-selected={detailTab === 'matchups'}
      aria-disabled={isLeagueEvent}
      className={`${detailTab === 'matchups' ? 'is-active ' : ''}${isLeagueEvent ? 'is-disabled' : ''}`}
      disabled={isLeagueEvent}
      onClick={() => onChange('matchups')}
    >
      <Swords size={16} />Matchups
    </button>
    <button type="button" role="tab" aria-selected={false} aria-disabled="true" className="is-disabled" disabled>
      <ReplaceAll size={16} />Sideboarding
    </button>
  </div>
}

function MatchupsPanel({
  matches,
  eventRounds,
  deckColors,
}: {
  matches: ReturnType<typeof useEventMatches>
  eventRounds: number
  deckColors: Record<number, string[]>
}) {
  if (matches.error) return <div className="events-page-state is-error">{matches.error}</div>
  if (matches.loading) return <div key="loading" className="event-detail-match-list" aria-label="Loading matchups">{Array.from({ length: 6 }, (_, index) => <div className="event-detail-match-skeleton" key={index}><Skeleton className="h-4 w-7" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>)}</div>
  if (matches.data.length === 0) return <div className="event-detail-empty">No matchups recorded for this player.</div>

  return <>
    <div key="header" className="event-detail-match-header" aria-hidden="true"><span><ListOrdered size={14} /></span><span>Player</span><span>Archetype</span></div>
    <div key="matches" className="event-detail-match-list">
      {matches.data.map(match => {
        const opponentArchetype = match.opponent_archetype?.trim() || null
        return <div className="event-detail-match" key={`${match.id}-${match.round}`}>
        <span className="event-detail-match-round"><span>{formatMatchRound(match.round, eventRounds)}</span><MatchResultIcon result={match.result} /></span>
        <div className="event-detail-match-player"><strong>{match.opponent ?? 'Bye'}</strong><small>{match.record}</small></div>
        <div className="event-detail-match-archetype"><strong className={opponentArchetype ? undefined : 'is-unknown'}>{opponentArchetype ?? 'Unknown'}</strong><small><ManaSymbols colors={match.opponent_deck_id == null ? null : deckColors[match.opponent_deck_id]} /></small></div>
      </div>
      })}
    </div>
  </>
}

export default function EventDetailsPage({ eventId }: { eventId: number }) {
  const { data, loading, error } = useEventDetails(eventId)
  const [isMobileViewport, setIsMobileViewport] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 879px)').matches)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [showDeckPreview, setShowDeckPreview] = useState(false)
  const [copiedDeckList, setCopiedDeckList] = useState(false)
  const [desktopTableEdgeFade, setDesktopTableEdgeFade] = useState({ left: false, right: false })
  const [mobileTableEdgeFade, setMobileTableEdgeFade] = useState({ left: false, right: false })
  const [detailTab, setDetailTab] = useState<DetailTab>('decklist')
  const [showSidebarScrollFade, setShowSidebarScrollFade] = useState(false)
  const [isEventMetaWrapped, setIsEventMetaWrapped] = useState(false)
  const eventMetaRef = useRef<HTMLParagraphElement>(null)
  const pageMainRef = useRef<HTMLElement>(null)
  const standingsSectionRef = useRef<HTMLElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const sidebarAnchorRef = useRef<HTMLDivElement>(null)
  const mobileTableScrollRefs = useRef<HTMLDivElement[]>([])
  const desktopTableScrollRef = useRef<HTMLDivElement>(null)
  const desktopTableScrollbarRef = useRef<HTMLDivElement>(null)
  const desktopTableWheelFrameRef = useRef<number | null>(null)
  const desktopTableWheelTargetRef = useRef(0)
  const isLeagueEvent = data?.event?.kind.toLowerCase().includes('league') ?? false
  const matches = useEventMatches(isLeagueEvent ? null : eventId, isLeagueEvent ? null : selectedPlayer)
  const selectedDeck = data?.decks.find(deck => deck.player === selectedPlayer)
  const selectedDeckCardCatalog = useSelectedDeckCardCatalog(selectedDeck, data?.cardCatalog)
  const selectedEditorCards = useMemo(
    () => toEditorCards(selectedDeck, selectedDeckCardCatalog),
    [selectedDeck, selectedDeckCardCatalog],
  )
  const selectedStanding = data?.standings.find(standing => standing.player === selectedPlayer)
  const deckListText = useMemo(() => buildDeckListText(selectedEditorCards), [selectedEditorCards])
  const canExportDeckList = selectedEditorCards.length > 0
  const selectedDeckName = selectedDeck?.deck_name || selectedDeck?.player || 'Event deck'
  const selectStanding = (player: string) => {
    setSelectedPlayer(current => isMobileViewport && current === player ? null : player)
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 879px)')
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches)
    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  useEffect(() => {
    if (!data?.standings.length) {
      setSelectedPlayer(null)
      return
    }

    setSelectedPlayer(current => {
      if (isMobileViewport) return current && data.standings.some(row => row.player === current) ? current : null
      return current && data.standings.some(row => row.player === current)
        ? current
        : data.standings[0].player
    })
  }, [data?.standings, isMobileViewport])

  useEffect(() => {
    setDetailTab('decklist')
  }, [isLeagueEvent])

  useEffect(() => {
    setShowDeckPreview(false)
    setCopiedDeckList(false)
  }, [selectedPlayer])

  const copyDeckList = useCallback(async () => {
    if (!canExportDeckList) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(deckListText)
      } else {
        throw new Error('Clipboard API unavailable')
      }
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = deckListText
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }

    setCopiedDeckList(true)
    window.setTimeout(() => setCopiedDeckList(false), 1600)
  }, [canExportDeckList, deckListText])

  const downloadDeckList = useCallback(() => {
    if (!canExportDeckList) return

    const blob = new Blob([deckListText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = getDeckFileName(selectedDeckName)
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }, [canExportDeckList, deckListText, selectedDeckName])

  const importDeckToTracker = useCallback(() => {
    if (!data?.event || selectedEditorCards.length === 0) return

    openTrackerDeckImport({
      name: selectedDeckName,
      format: data.event.format,
      archetype: selectedStanding?.archetype || selectedDeck?.archetype || undefined,
      mainboard: selectedEditorCards
        .filter(card => card.zone === 'Mainboard')
        .map(({ catalogId, name, quantity, cmc, colors, types, rarity }) => ({
          catalogId,
          name,
          quantity,
          cmc,
          colors: [...colors],
          types: [...types],
          rarity,
        })),
      sideboard: selectedEditorCards
        .filter(card => card.zone === 'Sideboard')
        .map(({ catalogId, name, quantity, cmc, colors, types, rarity }) => ({
          catalogId,
          name,
          quantity,
          cmc,
          colors: [...colors],
          types: [...types],
          rarity,
        })),
    })
    setShowDeckPreview(false)
  }, [data?.event, selectedDeck?.archetype, selectedDeckName, selectedEditorCards, selectedStanding?.archetype])

  useLayoutEffect(() => {
    const metadata = eventMetaRef.current
    if (!metadata) return

    const updateMetadataLayout = () => {
      const styles = window.getComputedStyle(metadata)
      const fontSize = Number.parseFloat(styles.fontSize)
      const inlineGap = fontSize * 0.45
      const children = Array.from(metadata.children) as HTMLElement[]
      const requiredWidth = children.reduce((width, child) => {
        const intrinsicWidth = child.classList.contains('event-detail-meta-separator')
          ? Math.max(child.scrollWidth, inlineGap)
          : child.scrollWidth
        return width + intrinsicWidth
      }, 0) + inlineGap * Math.max(0, children.length - 1)
      const shouldWrap = requiredWidth > metadata.clientWidth + 1
      setIsEventMetaWrapped(current => current === shouldWrap ? current : shouldWrap)
    }

    updateMetadataLayout()
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateMetadataLayout)
    resizeObserver?.observe(metadata)

    return () => resizeObserver?.disconnect()
  }, [data?.event?.id, isMobileViewport])

  useEffect(() => {
    if (isMobileViewport) return

    let frame = 0
    const updateTableScrollbar = () => {
      if (frame) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const wrapper = desktopTableScrollRef.current
        const scrollbar = desktopTableScrollbarRef.current
        const content = scrollbar?.firstElementChild as HTMLElement | null
        if (!wrapper || !scrollbar || !content) return

        const rect = wrapper.getBoundingClientRect()
        const left = Math.max(0, rect.left)
        const right = Math.min(window.innerWidth, rect.right)
        const width = right - left
        const isVisible = rect.bottom > 0 && rect.top < window.innerHeight && width > 0
        const hasOverflow = wrapper.scrollWidth > wrapper.clientWidth + 1

        scrollbar.style.display = isVisible && hasOverflow ? 'block' : 'none'
        if (!isVisible || !hasOverflow) return

        scrollbar.style.left = `${left}px`
        scrollbar.style.width = `${width}px`
        scrollbar.style.top = `${Math.min(rect.bottom, window.innerHeight - scrollbar.offsetHeight)}px`
        scrollbar.style.bottom = 'auto'
        content.style.width = `${wrapper.scrollWidth}px`
      })
    }

    updateTableScrollbar()
    window.addEventListener('scroll', updateTableScrollbar, { passive: true })
    window.addEventListener('resize', updateTableScrollbar)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', updateTableScrollbar)
      window.removeEventListener('resize', updateTableScrollbar)
    }
  }, [data?.event?.id, data?.standings.length, isMobileViewport])

  useEffect(() => {
    const pageMain = pageMainRef.current
    const standingsSection = standingsSectionRef.current
    const sidebar = sidebarRef.current
    const anchor = sidebarAnchorRef.current
    if (!pageMain || !standingsSection || !sidebar || !anchor) return

    const updateSidebarState = () => {
      window.requestAnimationFrame(() => {
        const panel = detailTab === 'decklist'
          ? sidebar.querySelector<HTMLElement>('.event-detail-decklist')
          : sidebar.querySelector<HTMLElement>('.event-detail-match-list')
        const anchorRect = anchor.getBoundingClientRect()
        const shouldStick = window.innerWidth >= 880 && anchorRect.top <= 68

        pageMain.style.setProperty('--event-detail-main-viewport-top', `${pageMain.getBoundingClientRect().top}px`)
        sidebar.style.setProperty('--event-detail-sidebar-left', `${anchorRect.left}px`)
        sidebar.style.setProperty('--event-detail-sidebar-width', `${anchorRect.width}px`)
        sidebar.classList.toggle('is-viewport-stuck', shouldStick)
        sidebar.classList.toggle('is-header-stuck', shouldStick)
        standingsSection.classList.toggle('is-header-stuck', shouldStick)

        if (panel) syncSidebarPanelViewport(
          panel,
          getStandingsBottom(desktopTableScrollRef.current, desktopTableScrollbarRef.current),
        )
      })
    }

    updateSidebarState()
    window.addEventListener('scroll', updateSidebarState, { passive: true })
    window.addEventListener('resize', updateSidebarState)
    return () => {
      pageMain.style.removeProperty('--event-detail-main-viewport-top')
      standingsSection.classList.remove('is-header-stuck')
      sidebar.classList.remove('is-viewport-stuck')
      sidebar.classList.remove('is-header-stuck')
      sidebar.style.removeProperty('--event-detail-sidebar-left')
      sidebar.style.removeProperty('--event-detail-sidebar-width')
      window.removeEventListener('scroll', updateSidebarState)
      window.removeEventListener('resize', updateSidebarState)
    }
  }, [data?.event?.id, detailTab])

  useLayoutEffect(() => {
    const panel = sidebarRef.current?.querySelector<HTMLElement>(detailTab === 'decklist' ? '.event-detail-decklist' : '.event-detail-match-list')
    if (!panel) return

    syncSidebarPanelViewport(
      panel,
      getStandingsBottom(desktopTableScrollRef.current, desktopTableScrollbarRef.current),
    )
  }, [detailTab, matches.data.length, matches.loading, selectedPlayer])

  useEffect(() => {
    if (isMobileViewport) {
      setShowSidebarScrollFade(false)
      return
    }

    const panel = sidebarRef.current?.querySelector<HTMLElement>(
      detailTab === 'decklist' ? '.event-detail-decklist' : '.event-detail-match-list',
    )
    if (!panel) {
      setShowSidebarScrollFade(false)
      return
    }

    const updateFade = () => {
      const hasOverflow = panel.scrollHeight > panel.clientHeight + 1
      const isAtBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 1
      setShowSidebarScrollFade(hasOverflow && !isAtBottom)
    }
    const frame = window.requestAnimationFrame(updateFade)
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(updateFade)

    panel.addEventListener('scroll', updateFade, { passive: true })
    resizeObserver?.observe(panel)
    Array.from(panel.children).forEach(child => resizeObserver?.observe(child))

    return () => {
      window.cancelAnimationFrame(frame)
      panel.removeEventListener('scroll', updateFade)
      resizeObserver?.disconnect()
    }
  }, [data?.event?.id, detailTab, isMobileViewport, matches.data.length, matches.loading, selectedPlayer])

  const syncMobileTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const source = event.currentTarget
    const left = source.scrollLeft
    mobileTableScrollRefs.current.forEach(target => {
      if (target && target !== source && target.scrollLeft !== left) target.scrollLeft = left
    })
  }

  const syncDesktopTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    desktopTableScrollRef.current?.style.setProperty('--event-detail-table-scroll-left', `${event.currentTarget.scrollLeft}px`)
    if (desktopTableWheelFrameRef.current == null) desktopTableWheelTargetRef.current = event.currentTarget.scrollLeft
  }

  const beginDesktopTableScrollbarDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (desktopTableWheelFrameRef.current != null) {
      window.cancelAnimationFrame(desktopTableWheelFrameRef.current)
      desktopTableWheelFrameRef.current = null
    }

    desktopTableWheelTargetRef.current = event.currentTarget.scrollLeft
  }

  const scrollDesktopTableWithWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const scrollbar = desktopTableScrollbarRef.current
    if (!scrollbar) return

    const isScrollbar = event.currentTarget === scrollbar
    const rawDelta = Math.abs(event.deltaX) > 0
      ? event.deltaX
      : event.shiftKey || isScrollbar
        ? event.deltaY
        : 0
    if (rawDelta === 0) return

    event.preventDefault()
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? scrollbar.clientWidth
        : 1
    const delta = Math.max(-32, Math.min(32, rawDelta * unit * 0.4))
    const maximum = scrollbar.scrollWidth - scrollbar.clientWidth
    desktopTableWheelTargetRef.current = Math.max(0, Math.min(maximum, desktopTableWheelTargetRef.current + delta))

    if (desktopTableWheelFrameRef.current != null) return

    const animate = () => {
      const target = desktopTableWheelTargetRef.current
      const distance = target - scrollbar.scrollLeft
      if (Math.abs(distance) < 0.5) {
        scrollbar.scrollLeft = target
        desktopTableWheelFrameRef.current = null
        return
      }

      scrollbar.scrollLeft += distance * 0.28
      desktopTableWheelFrameRef.current = window.requestAnimationFrame(animate)
    }

    desktopTableWheelFrameRef.current = window.requestAnimationFrame(animate)
  }

  useEffect(() => () => {
    if (desktopTableWheelFrameRef.current != null) window.cancelAnimationFrame(desktopTableWheelFrameRef.current)
  }, [])

  const renderStandingRow = (row: EventStanding, index: number) => <tr
    key={`${standingKey(row)}-${index}`}
    className={row.player === selectedPlayer ? 'is-selected' : undefined}
    tabIndex={0}
    aria-selected={row.player === selectedPlayer}
    aria-expanded={isMobileViewport ? row.player === selectedPlayer : undefined}
    onClick={() => selectStanding(row.player)}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        selectStanding(row.player)
      }
    }}
  >
    {!isLeagueEvent && <td>{row.rank}</td>}
    <td className="event-detail-player">{row.player}</td>
    <td className="event-detail-archetype-cell"><div className="event-detail-table-archetype"><span className={row.archetype?.trim() ? undefined : 'is-unknown'}>{row.archetype?.trim() || 'Unknown'}</span><ManaSymbols colors={row.deck_id == null ? null : data?.deckColors[row.deck_id]} /></div></td>
    <td>{row.record}</td>
    {!isLeagueEvent && <><td>{row.points}</td><td>{row.omwp == null ? '—' : `${row.omwp.toFixed(2)}%`}</td><td>{row.gwp == null ? '—' : `${row.gwp.toFixed(2)}%`}</td></>}
  </tr>

  const renderMobileStandingTable = (rows: EventStanding[], includeHeader: boolean, scrollIndex: number) =>
    <div
      className="event-detail-mobile-table-scroll"
      ref={element => {
        if (element) mobileTableScrollRefs.current[scrollIndex] = element
      }}
      onScroll={syncMobileTableScroll}
    >
      <table className={`event-detail-table${isLeagueEvent ? ' is-decklists' : ''}`}>
        {includeHeader && <thead><tr>{!isLeagueEvent && <th>#</th>}<th>Player</th><th>Archetype</th><th>Record</th>{!isLeagueEvent && <><th>Points</th><th>OMW%</th><th>GW%</th></>}</tr></thead>}
        <tbody>{rows.map(renderStandingRow)}</tbody>
      </table>
    </div>

  const renderMobileDetailPanel = () => {
    if (!selectedPlayer || !data) return null
    return <div className="event-detail-inline-deck">
      <div className="event-detail-inline-tabs"><DetailTabs detailTab={detailTab} isLeagueEvent={isLeagueEvent} onChange={setDetailTab} /></div>
      {detailTab === 'decklist' && <DecklistPanel deck={selectedDeck} cardCatalog={selectedDeckCardCatalog} onViewDeck={() => setShowDeckPreview(true)} />}
      {detailTab === 'matchups' && !isLeagueEvent && <MatchupsPanel matches={matches} eventRounds={data.event?.rounds ?? 0} deckColors={data.deckColors} />}
    </div>
  }

  useEffect(() => {
    const previousTitle = document.title
    document.title = data?.event ? `${formatEventTitle(data.event)} | Videre Project` : 'Event | Videre Project'
    return () => { document.title = previousTitle }
  }, [data?.event])

  return (
    <CardTooltipProvider>
      <div className="events-page-shell">
        <Header />
        <main ref={pageMainRef} className="event-detail-page-main">
          <div className="container-wide">
          {error ? <div className="events-page-state is-error">{error}</div> : loading ? <EventDetailsSkeleton /> : !data?.event ? <div className="events-page-state">Event not found.</div> : (
            <>
              <Button variant="ghost" size="sm" className="event-detail-back" onClick={navigateTo('/events')}><ArrowLeft size={16} /> Events</Button>
              <header className="event-detail-heading">
                <div>
                  <h1>{formatEventTitle(data.event)}</h1>
                  <p ref={eventMetaRef} className={isEventMetaWrapped ? 'is-wrapped' : undefined}>
                    <span className="event-detail-meta-item event-detail-meta-date"><CalendarDays size={15} /><time dateTime={getCalendarDate(data.event.date)}>{formatDate(data.event.date)}</time></span>
                    <span className="event-detail-meta-separator" aria-hidden="true">·</span>
                    <span className="event-detail-meta-item event-detail-meta-players"><Users size={15} />{data.event.players} players</span>
                    <span className="event-detail-meta-separator" aria-hidden="true">·</span>
                    <span className="event-detail-meta-item event-detail-meta-rounds">{data.event.rounds} rounds</span>
                  </p>
                </div>
              </header>

              <div className="event-detail-grid">
                <section ref={standingsSectionRef} className="event-detail-section">
                  <div className="event-detail-section-heading"><div>{isLeagueEvent ? <BookOpen size={18} /> : <Trophy size={18} />}<h2>{isLeagueEvent ? 'Decklists' : 'Standings'}</h2></div></div>
                  {isMobileViewport ? <div className="event-detail-mobile-standings">
                    {selectedPlayer == null ? renderMobileStandingTable(data.standings, true, 0) : <>
                      {renderMobileStandingTable(data.standings.slice(0, data.standings.findIndex(row => row.player === selectedPlayer) + 1), true, 0)}
                      {renderMobileDetailPanel()}
                      {data.standings.findIndex(row => row.player === selectedPlayer) < data.standings.length - 1 && renderMobileStandingTable(data.standings.slice(data.standings.findIndex(row => row.player === selectedPlayer) + 1), false, 1)}
                    </>}
                  </div> : <>
                    {!isLeagueEvent && <div
                      className="event-detail-table-scrollbar"
                      ref={desktopTableScrollbarRef}
                      onScroll={syncDesktopTableScroll}
                      onWheel={scrollDesktopTableWithWheel}
                      onPointerDown={beginDesktopTableScrollbarDrag}
                      aria-label="Scroll standings table horizontally"
                    >
                      <div className="event-detail-table-scrollbar-content" />
                    </div>}
                    <div className="event-detail-table-wrap" ref={desktopTableScrollRef} onWheel={scrollDesktopTableWithWheel}>
                      <table className={`event-detail-table${isLeagueEvent ? ' is-decklists' : ''}`}><thead><tr>{!isLeagueEvent && <th>#</th>}<th>Player</th><th>Archetype</th><th>Record</th>{!isLeagueEvent && <><th>Points</th><th>OMW%</th><th>GW%</th></>}</tr></thead><tbody>{data.standings.map(renderStandingRow)}</tbody></table>
                    </div>
                  </>}
                </section>

                <div ref={sidebarAnchorRef} className="event-detail-sidebar-anchor">
                  <section ref={sidebarRef} className={`event-detail-section event-detail-sidebar${isLeagueEvent ? ' is-league' : ''}`}>
                    <div className="event-detail-section-heading"><div><DetailTabs detailTab={detailTab} isLeagueEvent={isLeagueEvent} onChange={setDetailTab} /></div></div>
                    {detailTab === 'matchups' && !isLeagueEvent && <MatchupsPanel matches={matches} eventRounds={data.event.rounds} deckColors={data.deckColors} />}
                    {detailTab === 'decklist' && <DecklistPanel deck={selectedDeck} cardCatalog={selectedDeckCardCatalog} onViewDeck={() => setShowDeckPreview(true)} />}
                    {showSidebarScrollFade && <div className="event-detail-sidebar-scroll-fade" aria-hidden="true" />}
                  </section>
                </div>
              </div>
            </>
          )}
          </div>
        </main>
        <DeckEditorVignette
          open={showDeckPreview && selectedDeck != null}
          onOpenChange={open => setShowDeckPreview(open)}
          deckName={selectedDeckName}
          archetype={selectedStanding?.archetype || selectedDeck?.archetype || undefined}
          colors={selectedDeck ? data?.deckColors[selectedDeck.id] : undefined}
          timestamp={data?.event?.date}
          mainCount={selectedEditorCards.filter(card => card.zone === 'Mainboard').reduce((total, card) => total + card.quantity, 0)}
          sideCount={selectedEditorCards.filter(card => card.zone === 'Sideboard').reduce((total, card) => total + card.quantity, 0)}
          cards={selectedEditorCards}
          onCopyList={copyDeckList}
          onExportList={downloadDeckList}
          canExport={canExportDeckList}
          copiedList={copiedDeckList}
          showImport
          onImport={importDeckToTracker}
          onClose={() => setShowDeckPreview(false)}
          sidePanelLockedContent={(
            <div className="flex max-w-56 flex-col items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <LockKeyhole className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Import to build with this deck</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Card search, history, and editing unlock after this deck is saved to Tracker.
                </p>
              </div>
            </div>
          )}
        />
        <Footer />
      </div>
    </CardTooltipProvider>
  )
}

function DecklistPanel({ deck, cardCatalog, onViewDeck }: {
  deck: EventDeck | undefined
  cardCatalog: Record<number, {
    display_name?: string
    oracle_id?: string
    name: string
    mana_cost: string | null
    mana_value: number | null
    type_line: string | null
    faces?: Array<{ mana_cost: string | null; mana_value: number | null; type_line: string | null }>
  }>
  onViewDeck?: () => void
}) {
  if (!deck) return <div className="event-detail-empty">No decklist recorded for this player.</div>

  const mainboard = parseDeckCards(deck.mainboard, cardCatalog)
  const sideboard = sortDeckCards(parseDeckCards(deck.sideboard, cardCatalog))
  const mainboardCount = mainboard.reduce((total, card) => total + card.quantity, 0)
  const groupedMainboard = new Map<string, DeckCard[]>()
  mainboard.forEach(card => {
    const group = getDeckCardGroup(card)
    groupedMainboard.set(group, [...(groupedMainboard.get(group) ?? []), card])
  })

  groupedMainboard.forEach((cards, group) => groupedMainboard.set(group, sortDeckCards(cards)))

  return <div className="event-detail-decklist">
    <div className="event-detail-decklist-heading">
      <h3 className="event-detail-deck-board-heading">Mainboard ({mainboardCount})</h3>
      {onViewDeck ? <Button type="button" variant="outline" size="sm" className="event-detail-view-deck" onClick={onViewDeck}><Eye size={14} />Preview</Button> : null}
    </div>
    {DECK_CARD_GROUPS.map(group => <DeckCardGroup key={group.label} label={group.label} icon={group.icon} cards={groupedMainboard.get(group.label) ?? []} />)}
    <DeckCardGroup label="Other" cards={groupedMainboard.get('Other') ?? []} />
    <DeckCardGroup label="Sideboard" cards={sideboard} boardHeading />
  </div>
}

function EventDetailsSkeleton() {
  return <div className="event-detail-skeleton"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-2/3" /><Skeleton className="h-5 w-96 max-w-full" /><div className="event-detail-grid"><Skeleton className="h-[480px]" /><Skeleton className="h-[480px]" /></div></div>
}
