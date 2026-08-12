/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

// Replay data types — mirrors backend ReplayDataDTO structure

export interface ReplayData {
  gameId: number
  perspectivePlayerIndex?: number | null
  players: ReplayPlayer[]
  cards: ReplayCard[]
  snapshots: ReplaySnapshot[]
}

export interface ReplayPlayer {
  playerIndex: number
  name: string
  playDraw: string | null
  initialLife: number
  initialHandCount: number
  initialLibraryCount: number
  initialGraveyardCount: number
  initialManaPool: string | null
  isActivePlayer: boolean
  clockRemaining: number  // seconds
  userId: number
  avatarId: number
}

export interface ReplayCard {
  cardId: number
  name: string
  rulesText: string | null
  manaCost: string | null
  catalogId: number | null
  initialZone: string
  initialPower: string | null
  initialToughness: string | null
  ownerId: number
  sourceId: number | null
  isTapped: boolean
  isToken: boolean
  isLand: boolean
  isActivatedAbility: boolean
  isTriggeredAbility: boolean
  firstSeenSnapshotIndex: number
}

export interface ReplaySnapshot {
  index: number
  nonce: number
  timestamp: string
  turnNumber: number
  currentPhase: string
  promptedPlayer: number
  promptText: string
  /** JSON array of available prompt actions, e.g. [{"type":"ChooseOption","name":"OK"}] */
  promptOptions: string | null
  zoneTransfers: ZoneTransfer[]
  cardChanges: CardChange[]
  playerChanges: PlayerChange[]
  actions: ReplayAction[]
  logs: ReplayLog[]
}

export interface ZoneTransfer {
  cardId: number
  cardName: string
  fromZone: string | null
  toZone: string | null
  sourceId: number | null
  type: string // "Arrived" | "Departed" | "Moved"
}

export interface CardChange {
  cardId: number
  cardName: string
  property: string
  oldValue: string | null
  newValue: string | null
}

export interface PlayerChange {
  playerIndex: number
  playerName: string
  property: string
  oldValue: string | null
  newValue: string | null
}

export interface ReplayAction {
  actionType: string
  actionName: string | null
  cardId: number | null
  cardName: string | null
  targets: string | null
  data: string
  clientTimestamp: string
  nonce: number
}

export interface ReplayLog {
  timestamp: string
  data: string
}

// Reconstructed board state

export interface BoardState {
  snapshotIndex: number
  turn: number
  phase: string
  players: Map<number, PlayerState>
  zones: Map<string, CardState[]>
  cards: Map<number, CardState>
}

export interface PlayerState {
  playerIndex: number
  name: string
  life: number
  handCount: number
  libraryCount: number
  graveyardCount: number
  manaPool: string | null
  isActivePlayer: boolean
  hasPriority: boolean
  clockRemaining: number | null  // seconds
  counters: Record<string, number>
  avatarId: number
}

export interface CardState {
  cardId: number
  /** Stable identity across zone changes — the root ancestor cardId. */
  lineageId: number
  name: string
  initialName?: string
  rulesText: string | null
  manaCost: string | null
  catalogId: number | null
  textureId?: number | null
  zone: string
  power: string | null
  toughness: string | null
  initialPower: string | null
  initialToughness: string | null
  isTapped: boolean
  isAttacking: boolean
  isBlocking: boolean
  /** IDs of blockers blocking this attacker (from AttackingOrders) */
  attackingOrderIds: number[]
  /** IDs of attackers this blocker is blocking (from BlockingOrders) */
  blockingOrderIds: number[]
  counters: Record<string, number>
  abilities: string[]
  /** The card's innate abilities (baseline from the first Abilities change). */
  initialAbilities: string[]
  /** Granted abilities text shown in blue on the card in MTGO. */
  blueText: string | null
  /** Full type line, e.g. "Legendary Creature — Human Soldier". */
  typeLine: string | null
  controllerId: number
  ownerId: number
  isToken: boolean
  isLand: boolean
  isActivatedAbility: boolean
  isTriggeredAbility: boolean
  /** Card association map: association type -> list of target card IDs */
  associations: Record<string, number[]>
  /** The card ID this card is visually attached to (equipment target, aura target, exile-under parent). 0 = not attached. */
  attachedToId: number
  /** True if this card is exiled but displayed on the battlefield (exiled under a permanent). */
  isExiledOnBattlefield: boolean
}

export function getPlayerZoneCards(
  board: BoardState,
  zone: string,
  playerIndex: number
): CardState[] {
  const cards = board.zones.get(zone) ?? []
  return cards.filter(c => c.controllerId === playerIndex || (c.ownerId === playerIndex && (zone === "Hand" || zone === "Library" || zone === "Graveyard" || zone === "Exile")))
}

export function isCreature(card: CardState): boolean {
  if (card.isActivatedAbility || card.isTriggeredAbility) return false
  if (card.power != null || card.toughness != null) return true
  if (card.typeLine) {
    return card.typeLine.toLowerCase().includes("creature")
  }
  return false
}

// Board state diff for animations

export interface BoardTransition {
  movedCards: Map<number, { fromZone: string; toZone: string }>
  tappedCards: Set<number>
  untappedCards: Set<number>
  enteredCards: Set<number>
  exitedCards: Set<number>
}

export const EMPTY_TRANSITION: BoardTransition = {
  movedCards: new Map(),
  tappedCards: new Set(),
  untappedCards: new Set(),
  enteredCards: new Set(),
  exitedCards: new Set(),
}

export function computeBoardTransition(
  prev: BoardState | null,
  next: BoardState,
): BoardTransition {
  if (!prev) {
    return {
      movedCards: new Map(),
      tappedCards: new Set(),
      untappedCards: new Set(),
      enteredCards: new Set(next.cards.keys()),
      exitedCards: new Set(),
    }
  }

  const movedCards = new Map<number, { fromZone: string; toZone: string }>()
  const tappedCards = new Set<number>()
  const untappedCards = new Set<number>()
  const enteredCards = new Set<number>()
  const exitedCards = new Set<number>()

  const prevByLineage = new Map<number, CardState>()
  for (const [, card] of prev.cards) {
    prevByLineage.set(card.lineageId, card)
  }

  for (const [id, card] of next.cards) {
    const old = prev.cards.get(id)
    if (!old) {
      const ancestor = prevByLineage.get(card.lineageId)
      if (ancestor && ancestor.zone !== card.zone) {
        movedCards.set(id, { fromZone: ancestor.zone, toZone: card.zone })
      } else {
        enteredCards.add(id)
      }
      continue
    }
    if (old.zone !== card.zone) {
      movedCards.set(id, { fromZone: old.zone, toZone: card.zone })
    }
    if (!old.isTapped && card.isTapped) tappedCards.add(id)
    if (old.isTapped && !card.isTapped) untappedCards.add(id)
  }

  for (const id of prev.cards.keys()) {
    if (!next.cards.has(id)) exitedCards.add(id)
  }

  return { movedCards, tappedCards, untappedCards, enteredCards, exitedCards }
}
