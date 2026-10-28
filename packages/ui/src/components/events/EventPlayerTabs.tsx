/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { BookOpen, ReplaceAll, Swords } from 'lucide-react'
import { useRef } from 'react'

export function EventPlayerTabs({ activeTab, onChange, decklistDisabled = false, matchupsDisabled = false }: {
  activeTab: 'decklist' | 'matchups'
  onChange: (tab: 'decklist' | 'matchups') => void
  decklistDisabled?: boolean
  matchupsDisabled?: boolean
}) {
  const list = useRef<HTMLDivElement>(null)
  return <div ref={list} className="event-detail-sidebar-tabs" role="tablist" aria-label="Player details"
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      const buttons = [...(list.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])]
      const index = buttons.indexOf(event.target as HTMLButtonElement)
      if (index < 0) return
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next].click()
      buttons[next].focus()
    }}>
    <button type="button" role="tab" aria-selected={activeTab === 'decklist'} disabled={decklistDisabled}
      tabIndex={activeTab === 'decklist' ? 0 : -1}
      className={decklistDisabled ? 'is-disabled' : activeTab === 'decklist' ? 'is-active' : undefined}
      onClick={() => onChange('decklist')}><BookOpen size={16} />Decklist</button>
    <button type="button" role="tab" aria-selected={activeTab === 'matchups'} disabled={matchupsDisabled}
      tabIndex={activeTab === 'matchups' ? 0 : -1}
      className={matchupsDisabled ? 'is-disabled' : activeTab === 'matchups' ? 'is-active' : undefined}
      onClick={() => onChange('matchups')}><Swords size={16} />Matchups</button>
    <button type="button" role="tab" aria-selected={false} disabled className="is-disabled">
      <ReplaceAll size={16} />Sideboarding
    </button>
  </div>
}
