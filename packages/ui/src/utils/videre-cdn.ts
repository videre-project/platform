/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

const VIDERE_CDN_BASE_URL = "https://r2.videreproject.com"

function getAssetUrl(namespace: string, fileName: string): string {
  return `${VIDERE_CDN_BASE_URL}/${namespace}/${fileName}`
}

function normalizeCounterName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === "+1/+1") return "plus-one"
  if (trimmed === "-1/-1") return "minus-one"

  return trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
}

export function getManaSymbolUrl(fileName: string): string {
  return getAssetUrl("mana-symbols", fileName)
}

/** Returns the canonical Videre CDN image URL for an MTGO catalog product. */
export function getProductImageUrl(catalogId: number): string {
  return getAssetUrl('products', `${catalogId}-300px.png`)
}

export function getMtgoChatSymbolUrl(fileName: string): string {
  return getAssetUrl('mtgo-chat-symbols', fileName)
}

export function getCardCounterUrl(counterName: string): string | null {
  const normalizedName = normalizeCounterName(counterName)
  return normalizedName
    ? getAssetUrl("card-counters", `${normalizedName}.svg`)
    : null
}

export function getPlayerCounterUrl(counterName: string): string | null {
  const normalizedName = normalizeCounterName(counterName)
  return normalizedName
    ? getAssetUrl("player-counters", `${normalizedName}.png`)
    : null
}
