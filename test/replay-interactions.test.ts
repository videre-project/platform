/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import assert from 'node:assert/strict'
import test from 'node:test'

import { ReplayStateEngine } from '../packages/ui/src/state/ReplayStateEngine.ts'
import type { ReplayData, ReplayInteraction, ReplaySnapshot } from '../packages/ui/src/types/replay-types.ts'

function snapshot(nonce: number, interaction?: ReplayInteraction | null): ReplaySnapshot {
  return {
    index: 0, nonce, serverNonce: 123, timestamp: '2026-10-16T10:00:00Z',
    turnNumber: 2, currentPhase: 'PreCombatMain', promptedPlayer: 0,
    promptText: 'Cast spells and activate abilities.', promptOptions: [],
    zoneTransfers: [], cardChanges: [], playerChanges: [], actions: [], logs: [],
    interaction,
  }
}

function replay(snapshots: ReplaySnapshot[]): ReplayData {
  return {
    gameId: 1,
    players: [{
      playerIndex: 1, name: 'Opponent', playDraw: 'Draw', initialLife: 20,
      initialHandCount: 7, initialLibraryCount: 53, initialGraveyardCount: 0,
      initialManaPool: null, isActivePlayer: false, clockRemaining: 1200,
      userId: 42, avatarId: 0,
    }],
    cards: [11, 12].map(cardId => ({
      cardId, name: `Card ${cardId}`, rulesText: null, manaCost: null,
      catalogId: null, initialZone: 'Battlefield', initialPower: '2', initialToughness: '2',
      ownerId: 0, sourceId: null, isTapped: false, isToken: false, isLand: false,
      isActivatedAbility: false, isTriggeredAbility: false, firstSeenSnapshotIndex: 0,
    })),
    snapshots,
  }
}

const targeting: ReplayInteraction = {
  mode: 'SelectTargets', promptText: 'Choose a creature or player.',
  cards: [{
    logicalAddress: '18446744073709551615', cardId: 11, sourceId: 0,
    hasActions: true, isSelectable: false, isTargetable: true, isTargeted: false,
    actions: [{ $type: 'CardAction', name: 'Activate', actionId: 7 }],
  }],
  players: [{ playerIndex: 1, isTargetable: true, isTargeted: false, isActive: false }],
}

test('local captures replace flags and actions even when the server prompt is unchanged', () => {
  const selected = structuredClone(targeting)
  selected.cards[0].isTargetable = false
  selected.cards[0].isTargeted = true
  selected.cards[0].actions = []
  selected.players[0].isTargeted = true
  const engine = new ReplayStateEngine(replay([
    snapshot(900, targeting), snapshot(100, selected),
    snapshot(50, { mode: 'None', promptText: null, cards: [], players: [] }),
  ]))
  const first = engine.stepTo(0)
  assert.equal(first.cards.get(11)?.interaction?.isTargetable, true)
  assert.equal(first.cards.get(11)?.interaction?.actions[0].name, 'Activate')
  assert.equal(first.cards.get(11)?.isDimmed, false)
  assert.equal(first.cards.get(12)?.isDimmed, true)
  assert.equal(first.players.get(1)?.interaction?.isTargetable, true)

  const second = engine.stepForward()
  assert.equal(second.cards.get(11)?.interaction?.isTargeted, true)
  assert.deepEqual(second.cards.get(11)?.interaction?.actions, [])
  assert.equal(second.players.get(1)?.interaction?.isTargeted, true)
  assert.equal(first.cards.get(11)?.interaction?.isTargeted, false, 'retained boards must not change')

  const cleared = engine.stepForward()
  assert.equal(cleared.cards.get(11)?.interaction, undefined)
  assert.equal(cleared.players.get(1)?.interaction, undefined)
  assert.equal(cleared.cards.get(12)?.isDimmed, false)
  assert.equal(cleared.cards.size, 2, 'local captures must preserve gameplay state')
})

test('backward steps and reset restore the selection state at the replay cursor', () => {
  const engine = new ReplayStateEngine(replay([
    snapshot(1, targeting), snapshot(2, { mode: 'None', promptText: null, cards: [], players: [] }),
  ]))
  engine.stepTo(1)
  const previous = engine.stepBackward()
  assert.equal(previous.cards.get(11)?.interaction?.isTargetable, true)
  assert.equal(previous.players.get(1)?.interaction?.isTargetable, true)
  assert.equal(previous.cards.get(12)?.isDimmed, true)
  assert.equal(engine.reset().interaction, null)
  assert.equal(engine.stepTo(0).cards.get(11)?.interaction?.isTargetable, true)
})

test('older recordings and unavailable captures do not inherit prior highlights or dimming', () => {
  const engine = new ReplayStateEngine(replay([snapshot(1, targeting), snapshot(2)]))
  engine.stepTo(0)
  const board = engine.stepForward()
  assert.equal(board.interaction, null)
  assert.equal(board.cards.get(11)?.interaction, undefined)
  assert.equal(board.cards.get(12)?.isDimmed, false)
  assert.equal(board.players.get(1)?.interaction, undefined)
})

test('ambiguous scene identities cannot select a replay card by ID or SourceId', () => {
  const ambiguous = structuredClone(targeting)
  ambiguous.cards.push({ ...ambiguous.cards[0], logicalAddress: '2' })
  ambiguous.cards.push({ ...ambiguous.cards[0], logicalAddress: '3', cardId: 0, sourceId: 12 })
  const engine = new ReplayStateEngine(replay([snapshot(1, ambiguous)]))
  const board = engine.stepTo(0)
  assert.equal(board.cards.get(11)?.interaction, undefined)
  assert.equal(board.cards.get(12)?.interaction, undefined)
  assert.equal(board.cards.get(12)?.isDimmed, true)
  assert.equal(board.interaction?.cards.length, 3, 'unresolved captures remain available for inspection')
})

test('available actions do not imply that a card is selectable', () => {
  const capture = structuredClone(targeting)
  capture.mode = 'None'
  capture.cards[0].isTargetable = false
  const board = new ReplayStateEngine(replay([snapshot(1, capture)])).stepTo(0)
  assert.equal(board.cards.get(11)?.interaction?.hasActions, true)
  assert.equal(board.cards.get(11)?.interaction?.isSelectable, false)
  assert.equal(board.cards.get(11)?.isDimmed, false)
})

test('leaving an interaction mode restores brightness regardless of card actions or payment text', () => {
  const payment = structuredClone(targeting)
  payment.mode = 'None'
  payment.promptText = 'Pay {1W} for Thalia, Guardian of Thraben.'
  payment.cards[0].isTargetable = false
  payment.cards[0].isSelectable = true
  payment.cards.push({
    logicalAddress: '2', cardId: 12, sourceId: 0,
    hasActions: false, isSelectable: false, isTargetable: false, isTargeted: false, actions: [],
  })
  const unavailable = { ...payment, mode: 'Undefined' }
  const engine = new ReplayStateEngine(replay([
    snapshot(1, targeting), snapshot(2, payment), snapshot(3, unavailable),
  ]))
  assert.equal(engine.stepTo(0).cards.get(12)?.isDimmed, true)
  const board = engine.stepForward()
  assert.equal(board.cards.get(11)?.interaction?.isSelectable, true, 'eligibility remains available')
  assert.equal(board.cards.get(11)?.isDimmed, false)
  assert.equal(board.cards.get(12)?.interaction?.hasActions, false)
  assert.equal(board.cards.get(12)?.isDimmed, false, 'no action does not mean a card should dim')
  assert.equal(engine.stepBackward().cards.get(12)?.isDimmed, true)
  assert.equal(engine.stepTo(2).cards.get(12)?.isDimmed, false, 'undefined modes do not dim')
})

test('captured card activity controls brightness independently of mode and eligibility', () => {
  const payment = structuredClone(targeting)
  payment.mode = 'None'
  payment.cards[0].isActive = false
  const restored = structuredClone(payment)
  restored.mode = 'SelectTargets'
  restored.cards[0].isActive = true
  restored.cards[0].hasActions = false
  restored.cards[0].isTargetable = false
  const engine = new ReplayStateEngine(replay([snapshot(1, payment), snapshot(2, restored)]))
  assert.equal(engine.stepTo(0).cards.get(11)?.isDimmed, true,
    'MTGO can dim a card in None mode even while eligibility flags remain set')
  assert.equal(engine.stepForward().cards.get(11)?.isDimmed, false,
    'an active card stays bright even with no actions or targets')
  assert.equal(engine.stepBackward().cards.get(11)?.isDimmed, true)
})

test('reconnect arrivals preserve existing cards in both replay directions', () => {
  const first = snapshot(1)
  const move = snapshot(2)
  move.zoneTransfers = [{ cardId: 21, cardName: 'Card 11', sourceId: 11,
    fromZone: 'Battlefield', toZone: 'Hand', type: 'Moved' }]
  const reconnect = snapshot(3)
  reconnect.zoneTransfers = [{ cardId: 21, cardName: 'Card 11', sourceId: 21,
    fromZone: null, toZone: 'Hand', type: 'Arrived' }]
  const data = replay([first, move, reconnect])
  data.cards.push({ ...data.cards[0], cardId: 21, sourceId: 11,
    initialZone: 'Hand', firstSeenSnapshotIndex: 1 })
  const engine = new ReplayStateEngine(data)
  const handIds = (board: ReturnType<typeof engine.stepTo>) =>
    board.zones.get('Hand')?.map(card => card.cardId) ?? []
  assert.deepEqual(handIds(engine.stepTo(2)), [21])
  assert.deepEqual(handIds(engine.stepBackward()), [21], 'reversing an observation must not remove an existing card')
  const beforeMove = engine.stepBackward()
  assert.deepEqual(handIds(beforeMove), [])
  assert.deepEqual(beforeMove.zones.get('Battlefield')?.map(card => card.cardId).sort((a, b) => a - b), [11, 12])
  assert.deepEqual(handIds(engine.stepTo(2)), [21])
  assert.deepEqual(handIds(engine.jumpTo(0)), [])
  assert.deepEqual(handIds(engine.stepTo(2)), [21])
})

test('a card arriving again after departure is placed and undone without duplicating it', () => {
  const departure = snapshot(2)
  departure.zoneTransfers = [{ cardId: 11, cardName: 'Card 11', sourceId: null,
    fromZone: 'Battlefield', toZone: null, type: 'Departed' }]
  const reveal = snapshot(3)
  reveal.zoneTransfers = [{ cardId: 11, cardName: 'Card 11', sourceId: null,
    fromZone: null, toZone: 'Revealed', type: 'Arrived' }]
  const engine = new ReplayStateEngine(replay([snapshot(1), departure, reveal]))
  assert.deepEqual(engine.stepTo(2).zones.get('Revealed')?.map(card => card.cardId), [11])
  const departed = engine.stepBackward()
  assert.equal([...departed.zones.values()].flat().some(card => card.cardId === 11), false)
  assert.deepEqual(engine.stepForward().zones.get('Revealed')?.map(card => card.cardId), [11])
  assert.equal(engine.stepTo(0).zones.get('Battlefield')?.filter(card => card.cardId === 11).length, 1)
})

test('the card being cast stays bright while other inactive cards dim', () => {
  const payment = structuredClone(targeting)
  payment.mode = 'None'
  payment.cards[0].isActive = false
  payment.cards[0].isTargetable = false
  payment.cards[0].isBeingCast = true
  payment.cards.push({ ...payment.cards[0], cardId: 12, logicalAddress: '2', isBeingCast: false })
  const engine = new ReplayStateEngine(replay([snapshot(1, payment)]))
  const board = engine.stepTo(0)
  assert.equal(board.cards.get(11)?.isDimmed, false)
  assert.equal(board.cards.get(12)?.isDimmed, true)
})
