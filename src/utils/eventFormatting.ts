/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

interface EventTitleParts {
  id: number
  name: string
  date: string
  kind: string
}

function formatLeagueTitleDate(date: string) {
  const value = new Date(date)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function formatEventTitle(event: EventTitleParts) {
  return event.kind.toLowerCase().includes('league')
    ? `${event.name} ${formatLeagueTitleDate(event.date)}`
    : `${event.name} (#${event.id})`
}
