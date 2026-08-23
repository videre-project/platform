/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  type ComponentType,
  type FormEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  ArrowLeft,
  CalendarClock,
  Clipboard,
  ClipboardCheck,
  Download,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Settings2,
  Tags,
  Upload,
  X,
} from 'lucide-react'

import { DeckBoard } from '../components/decks/DeckBoard'
import { DeckBuildSidePane } from '../components/decks/DeckBuildSidePane'
import { cn } from '../lib/cn'
import { Button } from '../primitives/Button'
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../primitives/Select'
import { Skeleton } from '../primitives/Skeleton'
import type {
  DeckEditorLayoutProps,
  DeckSidePanelView,
  DeckSortMode,
} from '../types/decks'

function formatDate(value?: string) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function HeaderMeta({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon?: ComponentType<{ className?: string }>
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-2 whitespace-nowrap text-sm',
        className,
      )}
    >
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 translate-y-px text-muted-foreground" />
      ) : null}
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium text-foreground">{children}</span>
    </span>
  )
}

function ArchetypeEditor({
  archetype,
  onArchetypeChange,
  saving = false,
  error,
}: {
  archetype: string
  onArchetypeChange?: (archetype: string) => void | Promise<void>
  saving?: boolean
  error?: string | null
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(archetype === 'Unclassified deck' ? '' : archetype)
  const [localSaving, setLocalSaving] = useState(false)

  const handleOpenChange = (open: boolean) => {
    setIsEditing(open)
    if (open) setValue(archetype === 'Unclassified deck' ? '' : archetype)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!onArchetypeChange) return
    setLocalSaving(true)
    try {
      await onArchetypeChange(value.trim())
      setIsEditing(false)
    } catch {
      // Host owns error reporting via archetypeError.
    } finally {
      setLocalSaving(false)
    }
  }

  if (!onArchetypeChange) {
    return <span className="truncate">{archetype}</span>
  }

  return (
    <Popover open={isEditing} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group/arch inline-flex max-w-full items-center gap-2 text-foreground focus:outline-none"
          title="Edit deck archetype"
          aria-label={`Edit deck archetype: ${archetype}`}
        >
          <span className="truncate">{archetype}</span>
          <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-colors group-hover/arch:text-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="text-xs font-medium text-muted-foreground">Edit Archetype</div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="e.g. Dimir Murktide"
              autoFocus
              className="h-7 flex-1 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              size="sm"
              type="submit"
              disabled={saving || localSaving}
              className="h-7 px-2.5 text-xs"
            >
              Save
            </Button>
          </div>
          {error ? <div className="text-[11px] text-destructive">{error}</div> : null}
        </form>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Deck editor chrome + board + tools pane.
 * Host owns mutations, history/detail fetch, card search fetch, portals, and drag persistence.
 */
export function DeckEditorLayout({
  deckName: _deckName = 'Deck',
  archetype = 'Unclassified deck',
  colors: _colors,
  timestamp,
  mainCount = 0,
  sideCount = 0,
  loadingHeader = false,
  cards,
  cardsLoading = false,
  diffMap,
  onDragEnd,
  sortMode: controlledSortMode,
  defaultSortMode = 'cmc',
  onSortModeChange,
  sideboardCollapsed: controlledSideboardCollapsed,
  defaultSideboardCollapsed = true,
  onSideboardCollapsedChange,
  toolsCollapsed: controlledToolsCollapsed,
  defaultToolsCollapsed = false,
  onToolsCollapsedChange,
  sidePanelView: controlledSidePanelView,
  defaultSidePanelView = 'cards',
  onSidePanelViewChange,
  historyData,
  historyLoading,
  historyError,
  selectedRevisionId,
  onSelectRevision,
  searchResults,
  searchLoading,
  searchError,
  onSearchQueryChange,
  cardFilters,
  onCardFiltersChange,
  onBack,
  onClose,
  onCopyList,
  onExportList,
  canExport = false,
  copiedList = false,
  onImportList,
  showImport = true,
  importDisabled = true,
  onArchetypeChange,
  archetypeSaving,
  archetypeError,
  sidePanelLockedContent,
  headerContext,
  className,
}: DeckEditorLayoutProps) {
  const [internalSortMode, setInternalSortMode] = useState<DeckSortMode>(defaultSortMode)
  const [internalSideboardCollapsed, setInternalSideboardCollapsed] = useState(
    defaultSideboardCollapsed,
  )
  const [internalToolsCollapsed, setInternalToolsCollapsed] = useState(defaultToolsCollapsed)
  const [internalSidePanelView, setInternalSidePanelView] =
    useState<DeckSidePanelView>(defaultSidePanelView)
  const [splitEditorHeaderControls, setSplitEditorHeaderControls] = useState(false)
  const [splitEditorStats, setSplitEditorStats] = useState(false)
  const editorHeaderRef = useRef<HTMLDivElement>(null)
  const editorStatsRef = useRef<HTMLDivElement>(null)
  const editorHeaderSingleRowProbeRef = useRef<HTMLDivElement>(null)
  const editorStatsSingleRowProbeRef = useRef<HTMLDivElement>(null)

  const sortMode = controlledSortMode ?? internalSortMode
  const isSideboardCollapsed = controlledSideboardCollapsed ?? internalSideboardCollapsed
  const isDeckToolsCollapsed = controlledToolsCollapsed ?? internalToolsCollapsed
  const sidePanelView = controlledSidePanelView ?? internalSidePanelView
  const splitHeaderLayout = splitEditorHeaderControls || splitEditorStats

  const handleSortModeChange = (mode: DeckSortMode) => {
    if (controlledSortMode === undefined) setInternalSortMode(mode)
    onSortModeChange?.(mode)
  }

  const handleSideboardCollapsedChange = (collapsed: boolean) => {
    if (controlledSideboardCollapsed === undefined) setInternalSideboardCollapsed(collapsed)
    onSideboardCollapsedChange?.(collapsed)
  }

  const handleToolsCollapsedChange = (collapsed: boolean) => {
    if (controlledToolsCollapsed === undefined) setInternalToolsCollapsed(collapsed)
    onToolsCollapsedChange?.(collapsed)
  }

  const handleSidePanelViewChange = (view: DeckSidePanelView) => {
    if (controlledSidePanelView === undefined) setInternalSidePanelView(view)
    onSidePanelViewChange?.(view)
  }

  useLayoutEffect(() => {
    const header = editorHeaderRef.current
    const stats = editorStatsRef.current
    const probe = editorHeaderSingleRowProbeRef.current
    const statsProbe = editorStatsSingleRowProbeRef.current
    if (!header || !stats || !probe || !statsProbe) return

    const measureHeaderFit = () => {
      const nextSplit = probe.offsetWidth > header.clientWidth
      const nextStatsSplit = !loadingHeader && statsProbe.offsetWidth > stats.clientWidth
      setSplitEditorHeaderControls(current => (current === nextSplit ? current : nextSplit))
      setSplitEditorStats(current => (current === nextStatsSplit ? current : nextStatsSplit))
    }

    measureHeaderFit()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measureHeaderFit)
    observer.observe(header)
    observer.observe(stats)
    observer.observe(probe)
    observer.observe(statsProbe)
    return () => observer.disconnect()
  }, [archetype, copiedList, loadingHeader, mainCount, sideCount, timestamp])

  const renderEditorControls = (controlClassName?: string) => (
    <div className={cn('flex shrink-0 flex-wrap items-center justify-end gap-2', controlClassName)}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sort</span>
        <Select value={sortMode} onValueChange={value => handleSortModeChange(value as DeckSortMode)}>
          <SelectTrigger
            className="h-8 w-[108px] border-sidebar-border/70 bg-background/70 text-sm"
            aria-label="Sort deck"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cmc">CMC</SelectItem>
            <SelectItem value="colors">Colors</SelectItem>
            <SelectItem value="types">Types</SelectItem>
            <SelectItem value="rarity">Rarity</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {sideCount > 0 ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleSideboardCollapsedChange(!isSideboardCollapsed)}
          className={cn(
            'h-8 border-sidebar-border/70 bg-background/70',
            !isSideboardCollapsed &&
              'bg-secondary/70 text-secondary-foreground hover:bg-secondary/80',
          )}
        >
          {isSideboardCollapsed ? (
            <PanelRightOpen className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
          Sideboard
        </Button>
      ) : null}
    </div>
  )

  const renderDeckActions = (actionsClassName?: string) => (
    <div
      className={cn(
        'grid w-80 max-w-full shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2',
        actionsClassName,
      )}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onCopyList}
        disabled={!canExport || !onCopyList}
        className="h-8 w-full justify-center border-sidebar-border/70 bg-background/70 px-2"
      >
        {copiedList ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
        {copiedList ? 'Copied' : 'Copy list'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onExportList}
        disabled={!canExport || !onExportList}
        className="h-8 w-full justify-center border-sidebar-border/70 bg-background/70 px-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>
      {showImport ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onImportList}
          disabled={importDisabled || !onImportList}
          title={importDisabled ? 'Deck import is not available yet' : 'Import deck list'}
          className="h-8 w-full justify-center border-sidebar-border/70 bg-background/70 px-2"
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
      ) : null}
      {onClose ? (
        <Button
          variant="outline"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 shrink-0 border-sidebar-border/70 bg-background/70"
          aria-label="Close deck preview"
          title="Close deck preview"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleToolsCollapsedChange(!isDeckToolsCollapsed)}
          className={cn(
            'h-8 w-8 shrink-0 border-sidebar-border/70 bg-background/70',
            !isDeckToolsCollapsed &&
              'bg-secondary/70 text-secondary-foreground hover:bg-secondary/80',
          )}
          aria-label={isDeckToolsCollapsed ? 'Show deck tools' : 'Hide deck tools'}
          title={isDeckToolsCollapsed ? 'Show deck tools' : 'Hide deck tools'}
          aria-pressed={!isDeckToolsCollapsed}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  const activeDiffMap = sidePanelView === 'history' ? diffMap : undefined

  return (
    <div
      className={cn(
        'videre-ui flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 pb-4 pt-1 font-sans',
        className,
      )}
      data-ui-layout="deck-editor"
    >
      {headerContext}

      <div className="flex flex-col gap-2 pt-0">
        <div
          ref={editorHeaderRef}
          className={cn(
            'relative grid min-w-0 items-start gap-x-4 gap-y-2',
            splitHeaderLayout
              ? 'grid-cols-[minmax(0,1fr)_20rem]'
              : 'grid-cols-[minmax(0,1fr)_auto]',
          )}
        >
          <div
            ref={editorHeaderSingleRowProbeRef}
            aria-hidden="true"
            {...({ inert: '' } as Record<string, string>)}
            className="pointer-events-none absolute left-0 top-0 -z-10 flex w-max max-w-none items-start gap-4 opacity-0"
          >
            <div className="flex min-w-max items-start gap-3">
              <div className="mt-0.5 h-8 w-8 shrink-0" />
              {!loadingHeader ? (
                <div ref={editorStatsSingleRowProbeRef} className="flex min-w-max flex-nowrap items-center gap-x-5 pt-1.5">
                  <HeaderMeta icon={Tags} label="Archetype" className="max-w-none">
                    {archetype}
                  </HeaderMeta>
                  <HeaderMeta icon={CalendarClock} label="Updated">
                    {formatDate(timestamp)}
                  </HeaderMeta>
                  <HeaderMeta label="Cards">
                    {mainCount} main / {sideCount} side
                  </HeaderMeta>
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {loadingHeader ? null : renderEditorControls('w-auto')}
              {renderDeckActions('w-80')}
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-3 overflow-hidden">
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
            ) : (
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                <ArrowLeft className="h-5 w-5 opacity-40" />
              </span>
            )}

            <div className="min-w-0 flex-1">
              {loadingHeader ? (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-[34rem] max-w-full" />
                  <Skeleton className="h-8 w-64" />
                </div>
              ) : (
                <div
                  ref={editorStatsRef}
                  className={cn(
                    'min-w-0 overflow-hidden',
                    splitEditorStats
                      ? 'grid grid-cols-[minmax(0,max-content)_minmax(0,max-content)] grid-rows-[2rem_2rem] items-center gap-x-5 gap-y-2 pt-0'
                      : 'flex flex-nowrap items-center gap-x-5 gap-y-2 pt-1.5',
                  )}
                >
                  <HeaderMeta
                    icon={Tags}
                    label="Archetype"
                    className={cn('max-w-[20rem]', splitEditorStats && 'col-span-2 max-w-full')}
                  >
                    <ArchetypeEditor
                      archetype={archetype}
                      onArchetypeChange={onArchetypeChange}
                      saving={archetypeSaving}
                      error={archetypeError}
                    />
                  </HeaderMeta>
                  <HeaderMeta icon={CalendarClock} label="Updated">
                    {formatDate(timestamp)}
                  </HeaderMeta>
                  <HeaderMeta label="Cards">
                    {mainCount} main / {sideCount} side
                  </HeaderMeta>
                </div>
              )}
            </div>
          </div>

          <div
            className={cn(
              'flex max-w-full shrink-0 items-end gap-2',
              splitHeaderLayout ? 'flex-col' : 'flex-row items-center gap-4',
            )}
          >
            {loadingHeader
              ? null
              : renderEditorControls(
                  splitHeaderLayout ? 'order-2 w-auto' : 'order-1 w-auto',
                )}
            {renderDeckActions(splitHeaderLayout ? 'order-1 w-80' : 'order-2 w-80')}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch gap-4">
        <DeckBoard
          cards={cards}
          loading={cardsLoading}
          sortMode={sortMode}
          onSortModeChange={handleSortModeChange}
          sideboardCollapsed={isSideboardCollapsed}
          onSideboardCollapsedChange={handleSideboardCollapsedChange}
          diffMap={activeDiffMap}
          onDragEnd={onDragEnd}
          showDeckStats={false}
          showHeader={false}
          className="h-full flex-1 gap-0 p-0"
        />
        <DeckBuildSidePane
          view={sidePanelView}
          onViewChange={handleSidePanelViewChange}
          isCollapsed={isDeckToolsCollapsed}
          historyData={historyData}
          historyLoading={historyLoading}
          historyError={historyError}
          selectedRevisionId={selectedRevisionId}
          onSelectRevision={onSelectRevision}
          searchResults={searchResults}
          searchLoading={searchLoading}
          searchError={searchError}
          onSearchQueryChange={onSearchQueryChange}
          cardFilters={cardFilters}
          onCardFiltersChange={onCardFiltersChange}
          lockedContent={sidePanelLockedContent}
        />
      </div>
    </div>
  )
}
