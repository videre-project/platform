/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../../primitives/Popover'
import { CardImage } from '../cards/CardImage'
import { useCardTooltipHover } from '../cards/CardTooltip'
import { DeckManaSymbols } from '../cards/DeckManaSymbols'
import { CARD_COLORS } from '../../utils/card-search-model'
import type { MatchDetailsCard } from '../../types/match'

export interface OpponentArchetypeContext {
  archetypes: { name: string; colors?: string[] | null }[]
  cards: MatchDetailsCard[]
}

export interface OpponentArchetypePickerProps {
  children: ReactNode
  value: string | null
  colors?: string[] | null
  label?: string
  error?: string | null
  loadContext?: (signal: AbortSignal) => Promise<OpponentArchetypeContext>
  onChange: (archetype: string, colors: string[] | null) => void | Promise<void>
}

export function ObservedOpponentCard({ card, compact = false }: { card: MatchDetailsCard; compact?: boolean }) {
  const hover = useCardTooltipHover({ catalogId: card.catalogId, name: card.name })
  return <span {...hover} className={`block shrink-0 overflow-hidden rounded-sm ${compact ? 'h-10 w-12' : 'h-14 w-10'}`}>
    <CardImage catalogId={card.catalogId} name={card.name} alt={card.name} className={`h-full w-full object-cover ${compact ? 'object-[center_25%]' : 'object-top'}`} />
  </span>
}

export function OpponentArchetypePicker({ children, value, colors, label = 'Classify opponent', error: externalError, loadContext, onChange }: OpponentArchetypePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [context, setContext] = useState<OpponentArchetypeContext>({ archetypes: [], cards: [] })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedColors, setSelectedColors] = useState<string[] | null>(colors ?? null)
  const [colorsChanged, setColorsChanged] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const loader = useRef(loadContext)
  useEffect(() => { loader.current = loadContext }, [loadContext])
  // Saving can re-render the host; only opening the picker starts a context read.
  useEffect(() => {
    if (!open || !loader.current) return
    const controller = new AbortController()
    setLoading(true)
    loader.current(controller.signal).then(data => { if (!controller.signal.aborted) setContext(data) })
      .catch(() => { if (!controller.signal.aborted) setError('Suggestions are unavailable. You can enter an archetype name.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [open])
  const changeOpen = (next: boolean) => {
    if (saving) return
    setOpen(next)
    if (next) {
      setQuery(''); setError(null); setContext({ archetypes: [], cards: [] })
      setSelectedColors(colors ?? null); setColorsChanged(false)
    }
  }
  const choose = async (name: string, suggestedColors?: string[] | null) => {
    if (saving) return
    setSaving(true); setError(null)
    try {
      await onChange(name, colorsChanged ? selectedColors : suggestedColors ?? null)
      setOpen(false)
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not update classification.') }
    finally { setSaving(false) }
  }
  const colorRank = (item: OpponentArchetypeContext['archetypes'][number]) => {
    const colors = item.colors
    if (selectedColors == null || colors == null) return 0
    const matches = selectedColors.length ? selectedColors.every(color => colors.includes(color)) : colors.length === 0
    if (!matches) return -1
    return colors.length === selectedColors.length ? 2 : 1
  }
  const search = query.trim().toLocaleLowerCase()
  const showUnclassified = 'unclassified'.includes(search)
  const filtered = context.archetypes.filter(item => item.name.toLocaleLowerCase() !== 'unclassified' && item.name.toLocaleLowerCase().includes(search))
    .sort((a, b) => colorRank(b) - colorRank(a) || a.name.localeCompare(b.name))
  const custom = search && search !== 'unclassified' && !context.archetypes.some(item => item.name.toLocaleLowerCase() === search)
  return <Popover open={open} onOpenChange={changeOpen}>
    <PopoverTrigger asChild>{children}</PopoverTrigger>
    <PopoverContent aria-label={label} align="start" onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
      className="w-80 max-w-[calc(100vw-2rem)] border-sidebar-border/70 p-0 font-sans text-popover-foreground">
      <div className="relative border-b border-sidebar-border/60">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input autoFocus aria-label="Search archetypes" placeholder="Search archetypes…" value={query} maxLength={120}
          onChange={event => setQuery(event.target.value)} disabled={saving}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') { event.preventDefault(); list.current?.querySelector<HTMLButtonElement>('[role="option"]')?.focus() }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (query.trim() && showUnclassified) void choose('')
              else if (query.trim() && filtered[0]) void choose(filtered[0].name, filtered[0].colors)
              else if (custom) void choose(query.trim())
              else if (colorsChanged) void choose(value ?? '')
            }
          }} className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none" />
      </div>
      <div className="flex items-center justify-between gap-2 border-b border-sidebar-border/60 px-3 py-2">
        {colorsChanged ? <button type="button" disabled={saving} onClick={() => void choose(value ?? '')}
          className="rounded text-[11px] font-medium underline underline-offset-2 outline-none focus-visible:ring-1 focus-visible:ring-ring">Apply colors</button>
          : <span className="text-[11px] text-muted-foreground">Deck colors</span>}
        <div role="group" aria-label="Deck colors" className="flex gap-1">{CARD_COLORS.map(color => {
          const selected = color === 'C' ? selectedColors?.length === 0 : selectedColors?.includes(color) ?? false
          return <button key={color} type="button" aria-label={color === 'C' ? 'Colorless' : `${color} deck color`} aria-pressed={selected} disabled={saving}
            onClick={() => { setColorsChanged(true); setSelectedColors(color === 'C' ? [] : CARD_COLORS.filter(symbol => symbol !== 'C' && (symbol === color ? !selected : selectedColors?.includes(symbol)))) }}
            className={`grid h-6 w-6 place-items-center rounded border outline-none focus-visible:ring-1 focus-visible:ring-ring ${selected ? 'border-primary/70 bg-secondary' : 'border-transparent hover:bg-muted'}`}>
            <DeckManaSymbols colors={[color]} />
          </button>
        })}</div>
      </div>
      {context.cards.length > 0 && <div className="border-b border-sidebar-border/60 px-3 py-2">
        <p className="mb-2 text-[11px] text-muted-foreground">Observed cards</p>
        <div className="flex gap-1 overflow-x-auto pb-1">{context.cards.slice(0, 12).map(card => <ObservedOpponentCard key={card.name} card={card} />)}</div>
      </div>}
      <div ref={list} role="listbox" aria-label="Archetypes" aria-busy={loading || saving} className="max-h-56 overflow-y-auto p-1"
        onKeyDown={event => {
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
          const options = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)'))
          const index = options.indexOf(event.target as HTMLButtonElement)
          if (index < 0) return
          event.preventDefault()
          options[event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus()
        }}>
        {showUnclassified && <button type="button" role="option" aria-selected={value === null || value === ''} disabled={saving} onClick={() => void choose('')}
          className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs outline-none disabled:opacity-50 ${value === null || value === '' ? 'bg-muted text-foreground' : 'hover:bg-muted/50 focus:bg-muted/50'}`}>
          <span className="flex-1">Unclassified</span>
        </button>}
        {filtered.map(option => <button key={option.name} type="button" role="option" aria-selected={option.name === value}
          disabled={saving} onClick={() => void choose(option.name, option.colors)}
          className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs outline-none disabled:opacity-50 ${option.name === value ? 'bg-muted text-foreground' : 'hover:bg-muted/50 focus:bg-muted/50'}`}>
          <span className="min-w-0 flex-1 truncate">{option.name}</span><DeckManaSymbols colors={option.colors} />
        </button>)}
        {custom && <button type="button" role="option" aria-selected="false" disabled={saving} onClick={() => void choose(query.trim())}
          className="w-full rounded px-2 py-2 text-left text-xs outline-none hover:bg-muted focus:bg-muted">Use “{query.trim()}”</button>}
        {loading && <p role="status" className="px-2 py-2 text-xs text-muted-foreground">Loading archetypes…</p>}
        {!loading && !filtered.length && !query && <p className="px-2 py-2 text-xs text-muted-foreground">Enter an archetype name.</p>}
      </div>
      {(error || externalError) && <p role="alert" className="border-t border-sidebar-border/60 px-3 py-2 text-xs text-destructive">{error || externalError}</p>}
    </PopoverContent>
  </Popover>
}
