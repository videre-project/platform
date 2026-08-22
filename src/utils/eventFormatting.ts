/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { getCalendarDate } from './calendarDate'

interface EventTitleParts {
  id: number
  name: string
  date: string
  kind: string
}

function formatLeagueTitleDate(date: string) {
  return getCalendarDate(date)
}

export function formatEventTitle(event: EventTitleParts) {
  return event.kind.toLowerCase().includes('league')
    ? `${event.name} ${formatLeagueTitleDate(event.date)}`
    : `${event.name} (#${event.id})`
}
