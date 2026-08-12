/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Meta, StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'

import { CatalogCardImage } from '../src/components/cards/CatalogCardImage'
import { useCardTooltipHover } from '../src/components/cards/CardTooltip'

const meta = {
  title: 'Cards/Card images and tooltips',
  parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function TooltipCard({ edge = false }: { edge?: boolean }) {
  const handlers = useCardTooltipHover({ catalogId: 147729, name: 'Sewer-veillance Cam' })
  return (
    <div className={`flex h-[420px] w-[720px] items-center ${edge ? 'justify-end' : 'justify-center'}`}>
      <button {...handlers} type="button" aria-label="Preview Sewer-veillance Cam" className="h-[210px] w-[150px] overflow-hidden rounded-lg border border-sidebar-border/60">
        <CatalogCardImage catalogId={147729} name="Sewer-veillance Cam" className="h-full w-full object-cover" loading="eager" />
      </button>
    </div>
  )
}
export const LoadedCard: Story = { render: () => <TooltipCard /> }

export const TooltipNearRightEdge: Story = {
  render: () => <TooltipCard edge />,
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole('button', { name: /Preview/ }))
  },
}

export const FallbackCard: Story = {
  render: () => <div className="h-[210px] w-[150px] overflow-hidden rounded-lg"><CatalogCardImage catalogId={-1} name="Unavailable card" className="h-full w-full" /></div>,
}
