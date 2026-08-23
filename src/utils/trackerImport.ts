export interface TrackerImportCard {
  catalogId: number
  name: string
  quantity: number
  cmc: number
  colors: string[]
  types: string[]
  rarity: string
}

export interface TrackerImportRequest {
  name: string
  format: string
  archetype?: string
  mainboard: TrackerImportCard[]
  sideboard: TrackerImportCard[]
}

function encodePayload(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

/** Opens the local Tracker URL handler without mutating the MTGO collection. */
export function openTrackerDeckImport(request: TrackerImportRequest) {
  const payload = encodePayload(JSON.stringify(request))
  window.location.assign(`videre://import/deck?payload=${payload}`)
}
