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
import { computeBoardTransition, type BoardState, type CardState, type ReplayData } from '../src/types/replay-types'

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

function PendingTriggersFixture() {
  const initialBoard = useMemo(() => new ReplayStateEngine(replay).stepTo(61), [])
  const [pending, setPending] = useState(true)
  const board: BoardState = {
    ...initialBoard,
    interaction: {
      mode: 'SelectTargets', promptText: 'Choose target creature you control.', players: [],
      cards: pending ? [
        {
          logicalAddress: '11464', cardId: 346, sourceId: -1, zone: 'LocalTriggers',
          name: 'Luminarch Aspirant', catalogId: 82987,
          rulesText: 'At the beginning of combat on your turn, put a +1/+1 counter on target creature you control.',
          hasActions: true, isSelectable: false, isTargetable: false, isTargeted: false,
          isActive: true, actions: [],
        },
        {
          logicalAddress: '11465', cardId: -1, sourceId: -1, zone: 'OpponentTriggers',
          name: 'Soul Warden', rulesText: 'Whenever another creature enters, you gain 1 life.',
          hasActions: false, isSelectable: false, isTargetable: false, isTargeted: false,
          isActive: true, actions: [],
        },
      ] : [],
    },
  }
  return (
    <div className="h-full flex flex-col">
      <button type="button" onClick={() => setPending(false)}>Clear pending triggers</button>
      <div className="flex-1 min-h-0"><BoardView board={board} /></div>
    </div>
  )
}

export const PendingTriggeredAbilities: Story = {
  render: () => <PendingTriggersFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Neither ability has a gameplay card record. Scene identity is sufficient,
    // including an opponent's ability without an assigned card ID.
    const local = canvas.getByRole('region', { name: 'Your Triggered Abilities' })
    const opponent = canvas.getByRole('region', { name: "Opponent's Triggered Abilities" })
    await expect(within(local).getByText('Luminarch Aspirant')).toBeVisible()
    await expect(within(local).getByText(/put a \+1\/\+1 counter/)).toBeVisible()
    await expect(within(opponent).getByText('Soul Warden')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear pending triggers' }))
    await expect(canvas.queryByRole('region', { name: 'Your Triggered Abilities' })).toBeNull()
    await expect(canvas.queryByRole('region', { name: "Opponent's Triggered Abilities" })).toBeNull()
  },
}

function CombatHighlightFixture() {
  const initialBoard = useMemo(() => new ReplayStateEngine(replay).stepTo(61), [])
  const [mode, setMode] = useState<'attack' | 'block' | 'target'>('attack')
  const creature = initialBoard.cards.get(424)!
  const card: CardState = {
    ...creature,
    isAttacking: mode !== 'block',
    isBlocking: mode === 'block',
    interaction: {
      logicalAddress: '424', cardId: 424, sourceId: 0,
      hasActions: true, isSelectable: true,
      isTargetable: mode === 'target', isTargeted: false,
      actions: [{ $type: 'CardAction', actionId: 1, name: mode === 'block' ? "Don't block" : "Don't attack" }],
    },
  }
  const board: BoardState = {
    ...initialBoard,
    phase: mode === 'block' ? 'DeclareBlockers' : 'DeclareAttackers',
    interaction: {
      mode: mode === 'target' ? 'SelectTargets' : 'None',
      promptText: mode === 'target' ? 'Choose a creature.' : null,
      cards: [card.interaction!], players: [],
    },
    cards: new Map(initialBoard.cards).set(card.cardId, card),
    zones: new Map([...initialBoard.zones].map(([zone, cards]) =>
      [zone, cards.map(item => item.cardId === card.cardId ? card : item)])),
  }
  return (
    <div className="h-full flex flex-col">
      <div>
        <button type="button" onClick={() => setMode('block')}>Show blocker</button>
        <button type="button" onClick={() => setMode('target')}>Show targetable attacker</button>
      </div>
      <div className="flex-1 min-h-0"><BoardView board={board} /></div>
    </div>
  )
}

export const CombatHighlightPriority: Story = {
  render: () => <CombatHighlightFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = () => canvasElement.querySelector('[data-card-id="424"]')
    await expect(card()).toHaveClass('ring-red-500')
    await expect(card()).not.toHaveClass('ring-white/80')
    await userEvent.click(canvas.getByRole('button', { name: 'Show blocker' }))
    await expect(card()).toHaveClass('ring-blue-500/70')
    await userEvent.click(canvas.getByRole('button', { name: 'Show targetable attacker' }))
    await expect(card()).toHaveClass('ring-amber-300')
    await expect(card()).not.toHaveClass('ring-red-500')
  },
}
