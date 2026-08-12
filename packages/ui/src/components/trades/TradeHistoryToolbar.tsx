/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Search, X } from 'lucide-react'

import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../primitives/Select'
import type { TradeEscrowKind, TradeEscrowResult } from '../../types/trade'

export interface TradeHistoryToolbarProps {
  search: string
  kind: 'all' | TradeEscrowKind
  result: 'all' | TradeEscrowResult
  onSearchChange: (value: string) => void
  onKindChange: (value: 'all' | TradeEscrowKind) => void
  onResultChange: (value: 'all' | TradeEscrowResult) => void
  onClear: () => void
  disabled?: boolean
}

export function TradeHistoryToolbar({
  search,
  kind,
  result,
  onSearchChange,
  onKindChange,
  onResultChange,
  onClear,
  disabled = false,
}: TradeHistoryToolbarProps) {
  const filtersActive = search.trim().length > 0 || kind !== 'all' || result !== 'all'

  return (
    <div className="relative z-10 flex flex-wrap gap-2">
      <div className="relative min-w-[12rem] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          placeholder="Search partner or escrow"
          aria-label="Search trade history"
          className="h-9 pl-9"
          disabled={disabled}
        />
      </div>
      <Select value={kind} onValueChange={value => onKindChange(value as 'all' | TradeEscrowKind)} disabled={disabled}>
        <SelectTrigger className="h-9 w-36" aria-label="Filter trade type">
          <SelectValue placeholder="Trade type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All trade types</SelectItem>
          <SelectItem value="Player">Player trades</SelectItem>
          <SelectItem value="NonPlayer">Product escrows</SelectItem>
        </SelectContent>
      </Select>
      <Select value={result} onValueChange={value => onResultChange(value as 'all' | TradeEscrowResult)} disabled={disabled}>
        <SelectTrigger className="h-9 w-40" aria-label="Filter trade result">
          <SelectValue placeholder="Result" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All results</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
          <SelectItem value="InProgress">In progress</SelectItem>
          <SelectItem value="Cancelled">Cancelled</SelectItem>
          <SelectItem value="Failed">Failed</SelectItem>
          <SelectItem value="ClosedUnknown">Closed unknown</SelectItem>
          <SelectItem value="Interrupted">Interrupted</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={onClear}
        disabled={disabled || !filtersActive}
        aria-label="Clear trade history filters"
        title="Clear filters"
        className="h-9 w-9 shrink-0 gap-2 px-0 2xl:w-auto 2xl:px-3"
      >
        <X className="h-4 w-4" />
        <span className="hidden 2xl:inline">Clear</span>
      </Button>
    </div>
  )
}
