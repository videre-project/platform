/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type {
  TradeAttributionStatus,
  TradeEscrowItemRole,
  TradeEscrowKind,
  TradeEscrowResult,
  TradeHistoryDetail,
  TradeHistoryError,
  TradeHistoryItem,
  TradeHistoryMessage,
  TradeHistorySummary,
} from '../types/trade'

interface TradeFixtureInput {
  id: number
  escrowId: number
  kind: TradeEscrowKind
  productName?: string
  partnerId?: number
  partnerName?: string
  partnerAvatar?: TradeHistorySummary['partnerAvatar']
  startedAt: string
  closedAt?: string
  state: number
  stateName: string
  result: TradeEscrowResult
  attributionStatus: TradeAttributionStatus
  token: string
  accountId?: number
  items: TradeHistoryItem[]
  messages?: TradeHistoryMessage[]
  errors?: TradeHistoryError[]
}

const item = (
  role: TradeEscrowItemRole,
  catalogId: number,
  quantity: number,
  metadata: Omit<TradeHistoryItem, 'role' | 'catalogId' | 'quantity'> = {},
): TradeHistoryItem => ({
  role,
  catalogId,
  quantity,
  ...metadata,
})

function summarize(items: TradeHistoryItem[], role: TradeEscrowItemRole) {
  const matching = items.filter(candidate => candidate.role === role && candidate.quantity > 0)
  return {
    quantity: matching.reduce((total, candidate) => total + candidate.quantity, 0),
    catalogCount: new Set(matching.map(candidate => candidate.catalogId)).size,
  }
}

function trade(input: TradeFixtureInput): TradeHistoryDetail {
  const completed = input.result === 'Completed'
  const outgoing = completed ? summarize(input.items, 'LocalOffer') : { quantity: 0, catalogCount: 0 }
  const incomingRole: TradeEscrowItemRole = input.kind === 'Player' ? 'RemoteOffer' : 'InferredOutput'
  const incoming = completed ? summarize(input.items, incomingRole) : { quantity: 0, catalogCount: 0 }

  const summary: TradeHistorySummary = {
    id: input.id,
    escrowId: input.escrowId,
    kind: input.kind,
    productName: input.productName,
    partnerId: input.partnerId,
    partnerName: input.partnerName,
    partnerAvatar: input.partnerAvatar,
    startedAt: input.startedAt,
    closedAt: input.closedAt,
    state: input.state,
    stateName: input.stateName,
    result: input.result,
    attributionStatus: input.attributionStatus,
    outgoingQuantity: outgoing.quantity,
    outgoingCatalogCount: outgoing.catalogCount,
    incomingQuantity: incoming.quantity,
    incomingCatalogCount: incoming.catalogCount,
  }

  return {
    summary,
    token: input.token,
    accountId: input.accountId ?? 1,
    items: input.items,
    effects: completed
      ? input.items
          .filter(candidate => candidate.role === 'LocalOffer' || candidate.role === incomingRole)
          .map(candidate => ({
            catalogId: candidate.catalogId,
            quantity: candidate.role === 'LocalOffer' ? -candidate.quantity : candidate.quantity,
            isInferred: false,
          }))
      : [],
    messages: input.messages ?? [],
    errors: input.errors ?? [],
  }
}

const details = [
  trade({
    id: 6106,
    escrowId: 982441,
    kind: 'Player',
    partnerId: 71001,
    partnerName: 'FblthpTradeBot',
    partnerAvatar: {
      productCatalogId: 125478,
      productName: 'Avatar - Fblthp, Lost on the Range',
    },
    startedAt: '2026-08-08T19:42:13.000Z',
    closedAt: '2026-08-08T19:43:02.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6106',
    items: [
      item('LocalOffer', 900005, 12, { name: 'Event Ticket', objectType: 'Currency' }),
      item('RemoteOffer', 42436, 1, { name: 'Delver of Secrets', setCode: 'ISD', rarity: 'common' }),
      item('RemoteOffer', 67014, 2, { name: 'Counterspell', setCode: 'EMA', rarity: 'common' }),
      item('RemoteOffer', 102620, 1, { name: 'Tolarian Terror', setCode: 'DMU', rarity: 'common' }),
    ],
    messages: [{
      id: 1,
      timestamp: '2026-08-08T19:42:41.000Z',
      senderId: 71001,
      senderName: 'FblthpTradeBot',
      text: 'Thanks for your purchase. Please confirm the 12-ticket total when ready.',
    }],
  }),
  trade({
    id: 6105,
    escrowId: 982405,
    kind: 'NonPlayer',
    productName: 'Treasure Chest Booster',
    startedAt: '2026-08-08T18:16:04.000Z',
    closedAt: '2026-08-08T18:16:22.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6105',
    items: [
      item('LocalOffer', 900001, 1, { name: 'Treasure Chest Booster', objectType: 'Booster' }),
      item('InferredOutput', 38197, 1, { name: 'Mox Opal', setCode: 'SOM', rarity: 'mythic' }),
      item('InferredOutput', 106379, 1, { name: 'Archfiend of the Dross', setCode: 'ONE', rarity: 'rare' }),
      item('InferredOutput', 98553, 1, { name: 'Black Market Tycoon', setCode: 'SNC', rarity: 'rare' }),
      item('InferredOutput', 900006, 5, { name: 'Play Point', objectType: 'Currency' }),
    ],
  }),
  trade({
    id: 6104,
    escrowId: 982371,
    kind: 'Player',
    partnerId: 71018,
    partnerName: 'MoxMarketBot',
    partnerAvatar: {
      productCatalogId: 35842,
      productName: 'Avatar - Karn, Silver Golem',
    },
    startedAt: '2026-08-07T23:04:51.000Z',
    closedAt: '2026-08-07T23:05:37.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6104',
    items: [
      item('LocalOffer', 147651, 2, { name: 'Leonardo, Big Brother', setCode: 'TMT', rarity: 'common' }),
      item('LocalOffer', 153267, 1, { name: 'Spider-Man, Web-Slinger', setCode: 'SPM', rarity: 'common' }),
      item('RemoteOffer', 900005, 8, { name: 'Event Ticket', objectType: 'Currency' }),
    ],
  }),
  trade({
    id: 6103,
    escrowId: 982290,
    kind: 'NonPlayer',
    productName: "Marvel's Spider-Man Play Booster",
    startedAt: '2026-08-07T20:51:08.000Z',
    closedAt: '2026-08-07T20:51:31.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6103',
    items: [
      item('LocalOffer', 900003, 1, { name: "Marvel's Spider-Man Play Booster", setCode: 'SPM', objectType: 'Booster' }),
      item('InferredOutput', 153405, 1, { name: 'Masked Meower', setCode: 'SPM', rarity: 'common' }),
      item('InferredOutput', 153535, 1, { name: 'Skyward Spider', setCode: 'SPM', rarity: 'common' }),
      item('InferredOutput', 153539, 1, { name: 'Spider Manifestation', setCode: 'SPM', rarity: 'common' }),
      item('InferredOutput', 153267, 1, { name: 'Spider-Man, Web-Slinger', setCode: 'SPM', rarity: 'common' }),
      item('InferredOutput', 153597, 1, { name: 'Steel Wrecking Ball', setCode: 'SPM', rarity: 'common' }),
      item('InferredOutput', 153377, 1, { name: 'Swarm, Being of Bees', setCode: 'SPM', rarity: 'common' }),
      item('InferredOutput', 153293, 1, { name: 'Doc Ock, Sinister Scientist', setCode: 'SPM', rarity: 'common' }),
      item('InferredOutput', 153337, 1, { name: 'Alien Symbiosis', setCode: 'SPM', rarity: 'uncommon' }),
      item('InferredOutput', 153239, 1, { name: 'Aunt May', setCode: 'SPM', rarity: 'uncommon' }),
      item('InferredOutput', 153289, 1, { name: 'Chameleon, Master of Disguise', setCode: 'SPM', rarity: 'uncommon' }),
      item('InferredOutput', 153335, 1, { name: 'Agent Venom', setCode: 'SPM', rarity: 'rare' }),
      item('InferredOutput', 153341, 1, { name: 'Black Cat, Cunning Thief', setCode: 'SPM', rarity: 'rare', objectType: 'Wildcard' }),
      item('InferredOutput', 153286, 1, { name: 'Amazing Acrobatics', setCode: 'SPM', rarity: 'common', objectType: 'Traditional foil' }),
      item('InferredOutput', 153227, 1, { name: 'Island', setCode: 'SPM', rarity: 'common', objectType: 'Basic land' }),
    ],
  }),
  trade({
    id: 6102,
    escrowId: 982112,
    kind: 'Player',
    partnerId: 71124,
    partnerName: 'DraftTrade_42',
    partnerAvatar: {
      productCatalogId: 150290,
      productName: 'Avatar - Spellbook Seeker',
    },
    startedAt: '2026-08-06T22:14:32.000Z',
    closedAt: '2026-08-06T22:15:10.000Z',
    state: 7,
    stateName: 'Trade cancelled',
    result: 'Cancelled',
    attributionStatus: 'NotApplicable',
    token: 'trade-6102',
    items: [
      item('LocalOffer', 900005, 3, { name: 'Event Ticket', objectType: 'Currency' }),
      item('RemoteOffer', 900002, 1, { name: 'Teenage Mutant Ninja Turtles Booster', setCode: 'TMT', objectType: 'Booster' }),
    ],
  }),
  trade({
    id: 6101,
    escrowId: 981904,
    kind: 'Player',
    partnerId: 71203,
    partnerName: 'PauperStaplesBot',
    partnerAvatar: {
      productCatalogId: 93872,
      productName: 'Avatar - Delver of Secrets',
    },
    startedAt: '2026-08-05T17:33:20.000Z',
    closedAt: '2026-08-05T17:34:08.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6101',
    items: [
      item('LocalOffer', 900005, 5, { name: 'Event Ticket', objectType: 'Currency' }),
      item('RemoteOffer', 67014, 4, { name: 'Counterspell', setCode: 'EMA', rarity: 'common' }),
      item('RemoteOffer', 102620, 4, { name: 'Tolarian Terror', setCode: 'DMU', rarity: 'common' }),
    ],
  }),
  trade({
    id: 6100,
    escrowId: 981772,
    kind: 'NonPlayer',
    productName: 'Phyrexia: All Will Be One Draft Booster',
    startedAt: '2026-08-04T21:11:08.000Z',
    closedAt: '2026-08-04T21:11:29.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6100',
    items: [
      item('LocalOffer', 900007, 1, { name: 'Phyrexia: All Will Be One Draft Booster', setCode: 'ONE', objectType: 'Booster' }),
      item('InferredOutput', 106529, 1, { name: 'Adaptive Sporesinger', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106375, 1, { name: 'Annihilating Glare', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106377, 1, { name: 'Anoint with Affliction', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106295, 1, { name: "Aspirant's Ascent", setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106455, 1, { name: 'Axiom Engraver', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106457, 1, { name: 'Barbed Batterfist', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106223, 1, { name: 'Basilica Shepherd', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106663, 1, { name: 'Basilica Skullbomb', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106459, 1, { name: 'Bladegraft Aspirant', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106461, 1, { name: 'Blazing Crescendo', setCode: 'ONE', rarity: 'common' }),
      item('InferredOutput', 106217, 1, { name: 'Against All Odds', setCode: 'ONE', rarity: 'uncommon' }),
      item('InferredOutput', 106373, 1, { name: 'Ambulatory Edifice', setCode: 'ONE', rarity: 'uncommon' }),
      item('InferredOutput', 106167, 1, { name: 'Annex Sentry', setCode: 'ONE', rarity: 'uncommon' }),
      item('InferredOutput', 106379, 1, { name: 'Archfiend of the Dross', setCode: 'ONE', rarity: 'rare' }),
      item('InferredOutput', 106751, 1, { name: 'Island', setCode: 'ONE', rarity: 'common', objectType: 'Basic land' }),
    ],
  }),
  trade({
    id: 6099,
    escrowId: 981601,
    kind: 'NonPlayer',
    productName: 'Streets of New Capenna Draft Booster',
    startedAt: '2026-08-03T15:24:45.000Z',
    closedAt: '2026-08-03T15:25:03.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6099',
    items: [
      item('LocalOffer', 900008, 1, { name: 'Streets of New Capenna Draft Booster', setCode: 'SNC', objectType: 'Booster' }),
      item('InferredOutput', 98419, 1, { name: 'Antagonize', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98485, 1, { name: 'Attended Socialite', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98289, 1, { name: 'Backstreet Bruiser', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98223, 1, { name: 'Backup Agent', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98423, 1, { name: 'Big Score', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98555, 1, { name: 'Body Dropper', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98227, 1, { name: 'Boon of Safety', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98713, 1, { name: 'Botanical Plaza', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98491, 1, { name: 'Broken Wings', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98715, 1, { name: 'Brokers Hideout', setCode: 'SNC', rarity: 'common' }),
      item('InferredOutput', 98313, 1, { name: 'A Little Chat', setCode: 'SNC', rarity: 'uncommon' }),
      item('InferredOutput', 98221, 1, { name: 'Angelic Observer', setCode: 'SNC', rarity: 'uncommon' }),
      item('InferredOutput', 98321, 1, { name: "An Offer You Can't Refuse", setCode: 'SNC', rarity: 'uncommon' }),
      item('InferredOutput', 98551, 1, { name: 'Aven Heartstabber', setCode: 'SNC', rarity: 'rare' }),
      item('InferredOutput', 98205, 1, { name: 'Island', setCode: 'SNC', rarity: 'common', objectType: 'Basic land' }),
    ],
  }),
  trade({
    id: 6098,
    escrowId: 981442,
    kind: 'NonPlayer',
    productName: 'Treasure Chest Booster',
    startedAt: '2026-08-02T18:08:11.000Z',
    closedAt: '2026-08-02T18:08:30.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6098',
    items: [
      item('LocalOffer', 900001, 1, { name: 'Treasure Chest Booster', objectType: 'Booster' }),
      item('InferredOutput', 900006, 25, { name: 'Play Point', objectType: 'Currency' }),
      item('InferredOutput', 98239, 1, { name: 'Depopulate', setCode: 'SNC', rarity: 'rare' }),
      item('InferredOutput', 106533, 1, { name: 'Bloated Contaminator', setCode: 'ONE', rarity: 'rare' }),
    ],
  }),
  trade({
    id: 6097,
    escrowId: 981118,
    kind: 'Player',
    partnerId: 71342,
    partnerName: 'VintageSinglesBot',
    partnerAvatar: {
      productCatalogId: 52553,
      productName: 'Avatar - Black Lotus',
    },
    startedAt: '2026-08-01T16:42:18.000Z',
    closedAt: '2026-08-01T16:42:59.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6097',
    items: [
      item('LocalOffer', 900005, 4, { name: 'Event Ticket', objectType: 'Currency' }),
      item('RemoteOffer', 42436, 1, { name: 'Delver of Secrets', setCode: 'ISD', rarity: 'common' }),
      item('RemoteOffer', 67014, 1, { name: 'Counterspell', setCode: 'EMA', rarity: 'common' }),
    ],
  }),
  trade({
    id: 6096,
    escrowId: 980944,
    kind: 'NonPlayer',
    productName: 'Treasure Chest Booster',
    startedAt: '2026-07-31T20:18:07.000Z',
    closedAt: '2026-07-31T20:18:26.000Z',
    state: 5,
    stateName: 'Trade completed',
    result: 'Completed',
    attributionStatus: 'NotApplicable',
    token: 'trade-6096',
    items: [
      item('LocalOffer', 900001, 1, { name: 'Treasure Chest Booster', objectType: 'Booster' }),
      item('InferredOutput', 900006, 15, { name: 'Play Point', objectType: 'Currency' }),
      item('InferredOutput', 38197, 1, { name: 'Mox Opal', setCode: 'SOM', rarity: 'mythic' }),
      item('InferredOutput', 98553, 1, { name: 'Black Market Tycoon', setCode: 'SNC', rarity: 'rare' }),
    ],
  }),
]

export const TRADE_HISTORY_SHOWCASE_DETAILS: Readonly<Record<number, TradeHistoryDetail>> = Object.freeze(
  Object.fromEntries(details.map(detail => [detail.summary.id, detail])),
)

export const TRADE_HISTORY_SHOWCASE_TRADES: readonly TradeHistorySummary[] = Object.freeze(
  details.map(detail => detail.summary),
)

export const TRADE_HISTORY_SHOWCASE_DEFAULT_ID = 6106
export const TRADE_HISTORY_SHOWCASE_PRODUCT_ID = 6105
export const TRADE_HISTORY_SHOWCASE_SECOND_PRODUCT_ID = 6103
export const TRADE_HISTORY_SHOWCASE_CANCELLED_ID = 6102
