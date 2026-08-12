/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ReactNode } from 'react'

import { BoardView } from '../components/replay/BoardView'
import { ReplayTimeline } from '../components/replay/ReplayTimeline'
import { cn } from '../lib/cn'
import type { BoardState, BoardTransition, ReplaySnapshot } from '../types/replay-types'

export interface ReplayLayoutProps {
  board: BoardState
  snapshots: ReplaySnapshot[]
  currentIndex: number
  onStepTo: (index: number) => void
  transition?: BoardTransition
  perspectivePlayer?: number
  promptText?: string
  promptOptions?: string | null
  headerContent?: ReactNode
  defaultAvatarUrl?: string
  cardBackUrl?: string
  cardFrameUrl?: string
  disableTopZoneHoverExpansion?: boolean
  className?: string
}

/** Canonical replay composition. Data loading, streaming, and state-engine ownership stay with the host. */
export function ReplayLayout({
  board,
  snapshots,
  currentIndex,
  onStepTo,
  transition,
  perspectivePlayer,
  promptText,
  promptOptions,
  headerContent,
  defaultAvatarUrl,
  cardBackUrl,
  cardFrameUrl,
  disableTopZoneHoverExpansion,
  className,
}: ReplayLayoutProps) {
  return (
    <div className={cn('videre-ui flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background font-sans text-foreground', className)} data-ui-layout="replay">
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-sidebar-border/60">
        <BoardView
          board={board}
          transition={transition}
          perspectivePlayer={perspectivePlayer}
          promptText={promptText}
          promptOptions={promptOptions}
          headerContent={headerContent}
          defaultAvatarUrl={defaultAvatarUrl}
          cardBackUrl={cardBackUrl}
          cardFrameUrl={cardFrameUrl}
          disableTopZoneHoverExpansion={disableTopZoneHoverExpansion}
        />
      </div>
      <div className="shrink-0">
        <ReplayTimeline snapshots={snapshots} currentIndex={currentIndex} onStepTo={onStepTo} />
      </div>
    </div>
  )
}
