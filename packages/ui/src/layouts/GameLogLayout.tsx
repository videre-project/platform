/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, Check, Copy, Filter } from 'lucide-react'

import { Badge } from '../primitives/Badge'
import { Button } from '../primitives/Button'
import { cn } from '../lib/cn'
import type {
  GameLogEntry,
  GameLogLayoutProps,
  GameLogTimePrecision,
  GameLogType,
  GameStateData,
} from '../types/game-log'
import {
  ALL_TYPES,
  formatDataAsText,
  formatLogDelta,
  formatLogTime,
  GameLogDataHeader,
  renderData,
  TYPE_CONFIG,
} from '../utils/game-log-rendering'

function TypeFilterBar({
  enabled,
  onToggle,
}: {
  enabled: Set<GameLogType>
  onToggle: (type: GameLogType) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
      {ALL_TYPES.map(type => {
        const cfg = TYPE_CONFIG[type]
        const active = enabled.has(type)
        return (
          <button
            key={type}
            type="button"
            onClick={() => onToggle(type)}
            aria-pressed={active}
            title={cfg.label}
            className={`rounded-sm border px-2 py-0.5 font-mono text-xs transition-colors ${
              active
                ? cfg.tone
                : 'border-sidebar-border/40 bg-background/20 text-muted-foreground hover:border-sidebar-border/60 hover:bg-muted/30 hover:text-foreground'
            }`}
          >
            {cfg.short}
          </button>
        )
      })}
    </div>
  )
}

function CopyLogButton({
  entries,
  timePrecision,
}: {
  entries: GameLogEntry[]
  timePrecision: GameLogTimePrecision
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    const lines: string[] = []
    let prevNonce = -1

    for (const entry of entries) {
      if (entry.nonce !== 0 && entry.nonce !== prevNonce && prevNonce !== -1) {
        lines.push('')
      }
      prevNonce = entry.nonce

      const time = formatLogTime(entry.ts, timePrecision)
      const cfg = TYPE_CONFIG[entry.gameLogType] ?? TYPE_CONFIG.LogMessage
      const tag = cfg.short.padEnd(6)
      const body = formatDataAsText(entry.gameLogType, entry.data)
      const bodyLines = body.split('\n')
      lines.push(`${time}  ${tag}  ${bodyLines[0]}`)
      for (let i = 1; i < bodyLines.length; i++) {
        lines.push(`${''.padEnd(time.length + 2)}${''.padEnd(8)}${bodyLines[i]}`)
      }
    }

    void navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [entries, timePrecision])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-auto flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      title="Copy log to clipboard"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function GameStateHeader({
  entry,
  timePrecision,
}: {
  entry: GameLogEntry
  timePrecision: GameLogTimePrecision
}) {
  try {
    const d: GameStateData = JSON.parse(entry.data)
    return (
      <tr className="border-t border-sidebar-border/60 bg-muted/30">
        <td colSpan={4} className="px-3 py-1.5">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="font-mono text-muted-foreground">
              {formatLogTime(entry.ts, timePrecision)}
            </span>
            <span className="font-semibold text-blue-400">Turn {d.turn}</span>
            <span className="text-blue-300/80">{d.phase}</span>
            {d.previousTurn != null ? (
              <span className="text-[10px] text-muted-foreground">
                (from Turn {d.previousTurn} {d.previousPhase})
              </span>
            ) : null}
          </div>
        </td>
      </tr>
    )
  } catch {
    return null
  }
}

function NonceSeparator() {
  return (
    <tr aria-hidden="true">
      <td colSpan={4} className="py-0">
        <div className="h-px bg-sidebar-border/60" />
      </td>
    </tr>
  )
}

function LogRow({
  entry,
  expanded,
  onToggle,
  timePrecision,
}: {
  entry: GameLogEntry
  expanded: boolean
  onToggle: () => void
  timePrecision: GameLogTimePrecision
}) {
  const cfg = TYPE_CONFIG[entry.gameLogType] ?? TYPE_CONFIG.LogMessage

  return (
    <tr
      className="group cursor-pointer transition-colors hover:bg-muted/50"
      onClick={onToggle}
    >
      <td className="w-[110px] shrink-0 select-none whitespace-nowrap px-3 py-1.5 align-top font-mono text-[11px] text-muted-foreground">
        {formatLogTime(entry.ts, timePrecision)}
      </td>
      <td className="w-[70px] shrink-0 select-none whitespace-nowrap px-2 py-1.5 text-right align-top font-mono text-[10px] text-muted-foreground">
        {formatLogDelta(entry.deltaMs)}
      </td>
      <td className="w-[70px] shrink-0 px-2 py-1.5 align-top">
        <span
          className={`inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${cfg.tone}`}
        >
          {cfg.short}
        </span>
      </td>
      <td className="break-words px-3 py-1.5 align-top text-[12px] leading-relaxed">
        {renderData(entry.gameLogType, entry.data)}
        {expanded ? (
          <pre className="mt-1.5 max-w-full overflow-x-auto whitespace-pre-wrap rounded border border-sidebar-border/60 bg-muted/50 p-2 text-[10px] leading-snug text-muted-foreground">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(entry.data), null, 2)
              } catch {
                return entry.data
              }
            })()}
          </pre>
        ) : null}
      </td>
    </tr>
  )
}

export function GameLogLayout({
  entries,
  title = 'Game Log',
  matchId = null,
  connected = false,
  liveEventCount = 0,
  loading = false,
  emptyMessage = 'Waiting for game events...',
  loadingMessage = 'Loading historical events...',
  noMatchMessage = 'No events match the current filters.',
  timePrecision = 'milliseconds',
  onBack,
  className,
}: GameLogLayoutProps) {
  const [enabledTypes, setEnabledTypes] = useState<Set<GameLogType>>(() => new Set(ALL_TYPES))
  const [autoScroll, setAutoScroll] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(() => new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const result = entries.filter(e => enabledTypes.has(e.gameLogType))
    return result.map((entry, i) => ({
      ...entry,
      deltaMs: i > 0 ? entry.ts.getTime() - result[i - 1].ts.getTime() : null,
    }))
  }, [entries, enabledTypes])

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filtered, autoScroll])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const atBottom = scrollTop + clientHeight >= scrollHeight - 40
    setAutoScroll(atBottom)
  }, [])

  const toggleType = useCallback((type: GameLogType) => {
    setEnabledTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const toggleExpand = useCallback((seq: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(seq)) next.delete(seq)
      else next.add(seq)
      return next
    })
  }, [])

  return (
    <div
      className={cn(
        'videre-ui relative mx-auto flex h-[calc(100vh-2.5rem)] min-h-0 w-full max-w-7xl flex-col gap-4 overflow-hidden px-4 pb-4 pt-1 font-sans',
        className,
      )}
      data-ui-layout="game-log"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {onBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="mt-0.5 h-8 w-8 shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : null}
          <div className="min-w-0 pt-0.5">
            <h1 className="min-w-0 truncate text-xl font-semibold leading-7 tracking-tight">
              {title}
              {matchId != null ? (
                <span className="ml-2 font-normal text-muted-foreground">- Match #{matchId}</span>
              ) : null}
            </h1>
          </div>
        </div>
        <div className="flex h-8 items-center gap-3">
          <Badge
            variant={connected ? 'success' : 'secondary'}
            className="rounded-md font-mono text-[10px]"
          >
            {connected ? 'LIVE' : 'WAITING'}
          </Badge>
          <span className="font-mono text-[11px] text-muted-foreground">
            {entries.length} entries
            {liveEventCount > 0 ? ` (${liveEventCount} live)` : ''}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-sidebar-border/60 bg-card">
        <div className="flex shrink-0 items-center gap-3 border-b border-sidebar-border/60 bg-muted/30 px-3 py-2">
          <TypeFilterBar enabled={enabledTypes} onToggle={toggleType} />
          <CopyLogButton entries={filtered} timePrecision={timePrecision} />
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto bg-background"
        >
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {entries.length === 0
                ? loading
                  ? loadingMessage
                  : emptyMessage
                : noMatchMessage}
            </div>
          ) : (
            <table className="w-full min-w-[860px] font-mono">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-sidebar-border/60 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="w-[110px] px-3 py-1.5 text-left">Time</th>
                  <th className="w-[70px] px-2 py-1.5 text-right">Delta</th>
                  <th className="w-[70px] px-2 py-1.5 text-left">Type</th>
                  <th className="px-3 py-1.5 text-left">
                    <GameLogDataHeader />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => {
                  const prevNonce = idx > 0 ? filtered[idx - 1].nonce : entry.nonce
                  const nonceChanged =
                    idx > 0 && entry.nonce !== 0 && entry.nonce !== prevNonce

                  if (entry.gameLogType === 'GameState') {
                    return (
                      <GameStateHeader
                        key={entry.seq}
                        entry={entry}
                        timePrecision={timePrecision}
                      />
                    )
                  }

                  return (
                    <React.Fragment key={entry.seq}>
                      {nonceChanged ? <NonceSeparator /> : null}
                      <LogRow
                        entry={entry}
                        expanded={expandedRows.has(entry.seq)}
                        onToggle={() => toggleExpand(entry.seq)}
                        timePrecision={timePrecision}
                      />
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!autoScroll && filtered.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
          }}
          className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 rounded-full border border-sidebar-border/60 bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground shadow-lg transition-colors hover:bg-accent"
        >
          <ArrowDown className="h-3 w-3" />
          Resume auto-scroll
        </button>
      ) : null}
    </div>
  )
}
