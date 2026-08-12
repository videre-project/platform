/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type TradeEscrowKind = 'Player' | 'NonPlayer'
export type TradeEscrowResult = 'InProgress' | 'Completed' | 'Cancelled' | 'Failed' | 'ClosedUnknown' | 'Interrupted'
export type TradeAttributionStatus = 'NotApplicable' | 'Pending' | 'Inferred' | 'InferredAmbiguous' | 'Unavailable'
/** `InferredOutput` is the legacy API role for escrow-correlated product outputs. */
export type TradeEscrowItemRole = 'LocalOffer' | 'RemoteOffer' | 'InferredOutput'

export interface TradePartnerAvatar {
  /** Catalog ID of an MTGO Vanguard (`VAN`) avatar product. */
  productCatalogId: number
  productName: string
  /** Optional host-resolved URL; the Videre product CDN is used by default. */
  productImageUrl?: string | null
}

export interface TradeHistorySummary {
  id: number
  escrowId?: number
  kind: TradeEscrowKind
  /** Optional host-resolved product label for non-player escrows. */
  productName?: string
  partnerId?: number
  partnerName?: string
  partnerAvatar?: TradePartnerAvatar
  startedAt: string
  closedAt?: string
  state: number
  stateName?: string
  result: TradeEscrowResult
  attributionStatus: TradeAttributionStatus
  outgoingQuantity: number
  outgoingCatalogCount: number
  incomingQuantity: number
  incomingCatalogCount: number
}

export interface TradeHistoryItem {
  role: TradeEscrowItemRole
  catalogId: number
  quantity: number
  /** Optional host-resolved catalog metadata. */
  name?: string
  setCode?: string
  rarity?: 'common' | 'uncommon' | 'rare' | 'mythic' | 'special'
  objectType?: string
}

export interface TradeHistoryEffect {
  catalogId: number
  quantity: number
  /** Legacy API field; correlated product outputs are deterministic. */
  isInferred: boolean
}

export interface TradeHistoryMessage {
  id: number
  timestamp: string
  senderId?: number
  senderName?: string
  text: string
}

export interface TradeHistoryError {
  id: number
  observedAt: string
  errorCode: number
  errorName?: string
}

export interface TradeHistoryDetail {
  summary: TradeHistorySummary
  token: string
  accountId: number
  items: TradeHistoryItem[]
  effects: TradeHistoryEffect[]
  messages: TradeHistoryMessage[]
  errors: TradeHistoryError[]
}

export interface TradeHistoryLayoutProps {
  trades: TradeHistorySummary[]
  selectedId: number | null
  detail: TradeHistoryDetail | null
  onSelectedIdChange: (id: number) => void
  search: string
  kind: 'all' | TradeEscrowKind
  result: 'all' | TradeEscrowResult
  onSearchChange: (value: string) => void
  onKindChange: (value: 'all' | TradeEscrowKind) => void
  onResultChange: (value: 'all' | TradeEscrowResult) => void
  onClearFilters: () => void
  filtersDisabled?: boolean
  loading?: boolean
  loadingMore?: boolean
  detailLoading?: boolean
  error?: string | null
  detailError?: string | null
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
}
