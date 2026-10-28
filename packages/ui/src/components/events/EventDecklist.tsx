/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Eye } from 'lucide-react'

import { useCardTooltipHover } from '../cards/CardTooltip'
import { Button } from '../../primitives/Button'
import type { EventDecklistCard as DeckCard } from '../../types/events'
import { getManaSymbolSvgPath } from '../../utils/mana-symbols'

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

/** The event decklist presentation shared by the website and Tracker. */
export function EventDecklist({ mainboard, sideboard: unsortedSideboard, onPreview }: {
  mainboard: DeckCard[]
  sideboard: DeckCard[]
  onPreview?: () => void
}) {
  const sideboard = sortDeckCards(unsortedSideboard)
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
      {onPreview ? <Button type="button" variant="outline" size="sm" className="event-detail-view-deck" onClick={onPreview}><Eye size={14} />Preview</Button> : null}
    </div>
    {DECK_CARD_GROUPS.map(group => <DeckCardGroup key={group.label} label={group.label} icon={group.icon} cards={groupedMainboard.get(group.label) ?? []} />)}
    <DeckCardGroup label="Other" cards={groupedMainboard.get('Other') ?? []} />
    <DeckCardGroup label="Sideboard" cards={sideboard} boardHeading />
  </div>
}
