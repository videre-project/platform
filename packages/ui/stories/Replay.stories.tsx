/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { useMemo, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ArrowLeft } from 'lucide-react'

import { BoardView } from '../src/components/replay/BoardView'
import { ReplayTimeline } from '../src/components/replay/ReplayTimeline'
import backfaceUrl from '../src/assets/backface.png'
import { REPLAY_SHOWCASE_DATA } from '../src/fixtures'
import { ReplayLayout } from '../src/layouts/ReplayLayout'
import { Button } from '../src/primitives/Button'
import { ReplayStateEngine } from '../src/state/ReplayStateEngine'
import { computeBoardTransition, type BoardState, type ReplayData } from '../src/types/replay-types'

const replay = REPLAY_SHOWCASE_DATA as unknown as ReplayData

function ReplayFixture({ initialIndex = 61 }: { initialIndex?: number }) {
  const engine = useMemo(() => new ReplayStateEngine(replay), [])
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [board, setBoard] = useState(() => engine.stepTo(initialIndex))
  const previous = useRef<BoardState | null>(board)
  const [transition, setTransition] = useState(() => computeBoardTransition(null, board))

  const stepTo = (index: number) => {
    const next = engine.jumpTo(index)
    setTransition(computeBoardTransition(previous.current, next))
    previous.current = next
    setBoard(next)
    setCurrentIndex(engine.currentIndex)
  }

  return (
    <ReplayLayout
      board={board}
      transition={transition}
      snapshots={replay.snapshots}
      currentIndex={currentIndex}
      onStepTo={stepTo}
      perspectivePlayer={replay.perspectivePlayerIndex ?? undefined}
      promptText={engine.currentSnapshot?.promptText}
      promptOptions={engine.currentSnapshot?.promptOptions}
      defaultAvatarUrl={backfaceUrl}
      headerContent={(
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -translate-y-[0.5px]" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 flex-col pt-0.5">
            <span className="truncate text-xs font-semibold text-muted-foreground">Game 2</span>
            <span className="text-[10px] text-muted-foreground/60">{replay.snapshots.length} snapshots</span>
          </div>
        </div>
      )}
    />
  )
}

const meta = {
  title: 'Replay/Replay layout',
  component: ReplayLayout,
  parameters: {
    layout: 'fullscreen',
    a11y: {
      config: { rules: [{ id: 'color-contrast', enabled: false }] },
    },
  },
  decorators: [(Story) => <div className="h-[680px] w-[1120px] overflow-hidden bg-background"><Story /></div>],
} satisfies Meta<typeof ReplayLayout>

export default meta
type Story = StoryObj<typeof meta>

export const InitialSnapshot: Story = { render: () => <ReplayFixture initialIndex={0} /> }
export const PromptSnapshot: Story = { render: () => <ReplayFixture initialIndex={61} /> }
export const FinalSnapshot: Story = { render: () => <ReplayFixture initialIndex={replay.snapshots.length - 1} /> }

export const TimelineInteraction: Story = {
  render: () => <ReplayFixture initialIndex={61} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const forward = canvas.getByTitle('Step forward')
    await expect(forward).toBeEnabled()
    await userEvent.click(forward)
  },
}

export const TopZonesHover: Story = {
  render: () => <ReplayFixture initialIndex={61} />,
  play: async ({ canvasElement }) => {
    const topZones = canvasElement.querySelector<HTMLElement>('[data-ui-replay-top-zones]')
    const drawer = topZones?.firstElementChild as HTMLElement | null
    await expect(topZones).not.toBeNull()
    await expect(drawer).not.toBeNull()
    await expect(topZones).toHaveAttribute('data-expanded', 'false')
    await expect(drawer).not.toHaveClass('border-b')
    await userEvent.hover(topZones!)
    await expect(topZones).toHaveAttribute('data-expanded', 'true')
    await expect(drawer).toHaveClass('border-b', 'border-sidebar-border/60')
    await userEvent.unhover(topZones!)
    await expect(topZones).toHaveAttribute('data-expanded', 'false')
    await expect(drawer).not.toHaveClass('border-b')
  },
}

export const TimelineOnly: Story = {
  render: () => <div className="w-[900px] pt-12"><ReplayTimeline snapshots={replay.snapshots} currentIndex={61} onStepTo={() => {}} /></div>,
}

export const BoardOnly: Story = {
  render: () => {
    const engine = new ReplayStateEngine(replay)
    const board = engine.stepTo(61)
    return <div className="h-[600px] w-[1050px]"><BoardView board={board} perspectivePlayer={0} promptText={engine.currentSnapshot?.promptText} promptOptions={engine.currentSnapshot?.promptOptions} /></div>
  },
}
