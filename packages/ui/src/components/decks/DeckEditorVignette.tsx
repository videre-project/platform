/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ReactNode } from 'react'

import { DeckEditorLayout } from '../../layouts/DeckEditorLayout'
import type { DeckEditorCard } from '../../types/decks'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../../primitives/Sheet'

export interface DeckEditorVignetteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckName: string
  archetype?: string
  colors?: readonly string[] | null
  timestamp?: string
  mainCount?: number
  sideCount?: number
  cards: DeckEditorCard[]
  cardsLoading?: boolean
  onClose: () => void
  onCopyList?: () => void
  onExportList?: () => void
  canExport?: boolean
  copiedList?: boolean
  onImport?: () => void
  showImport?: boolean
  importDisabled?: boolean
  sidePanelLockedContent?: ReactNode
  loadingOverlay?: ReactNode
  errorOverlay?: ReactNode
}

export function DeckEditorVignette({
  open,
  onOpenChange,
  deckName,
  archetype,
  colors,
  timestamp,
  mainCount,
  sideCount,
  cards,
  cardsLoading = false,
  onClose,
  onCopyList,
  onExportList,
  canExport = false,
  copiedList = false,
  onImport,
  showImport = true,
  importDisabled = false,
  sidePanelLockedContent,
  loadingOverlay,
  errorOverlay,
}: DeckEditorVignetteProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        motion="fade"
        className="inset-y-[3vh] right-[2vw] h-[94vh] w-[96vw] max-w-[96vw] gap-0 overflow-hidden rounded-xl border border-sidebar-border/70 p-0 sm:max-w-[96vw] [&>button]:hidden"
      >
        <SheetTitle className="sr-only">{deckName} preview</SheetTitle>
        <SheetDescription className="sr-only">
          Preview this deck in the deck editor.
        </SheetDescription>
        <DeckEditorLayout
          className="h-full pt-4"
          deckName={deckName}
          archetype={archetype}
          colors={colors}
          timestamp={timestamp}
          mainCount={mainCount}
          sideCount={sideCount}
          cards={cards}
          cardsLoading={cardsLoading}
          toolsCollapsed={false}
          onBack={onClose}
          onClose={onClose}
          onCopyList={onCopyList}
          onExportList={onExportList}
          canExport={canExport}
          copiedList={copiedList}
          onImportList={onImport}
          showImport={showImport}
          importDisabled={importDisabled}
          sidePanelLockedContent={sidePanelLockedContent}
        />
        {loadingOverlay}
        {errorOverlay}
      </SheetContent>
    </Sheet>
  )
}
