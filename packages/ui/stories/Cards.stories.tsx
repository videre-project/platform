/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test'

import { CatalogCardImage } from '../src/components/cards/CatalogCardImage'
import { useCardTooltipHover } from '../src/components/cards/CardTooltip'

const meta = {
  title: 'Cards/Card images and tooltips',
  parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function TooltipCard({ edge = false, doubleFaced = false }: { edge?: boolean; doubleFaced?: boolean }) {
  const handlers = useCardTooltipHover({ catalogId: 147729, name: 'Sewer-veillance Cam', otherFaceCatalogId: doubleFaced ? 57872 : null })
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
    const card = within(canvasElement).getByRole('button', { name: /Preview/ })
    await userEvent.hover(card)
    await expectAnchoredPreview(card)
  },
}

async function expectAnchoredPreview(card: HTMLElement) {
  const tooltip = await within(document.body).findByRole('tooltip', { name: 'Sewer-veillance Cam preview' })
  await waitFor(() => {
    const source = card.getBoundingClientRect()
    const preview = tooltip.getBoundingClientRect()
    const overlaps = preview.left < source.right && preview.right > source.left
      && preview.top < source.bottom && preview.bottom > source.top
    expect(overlaps).toBe(false)
    expect(preview.left).toBeGreaterThanOrEqual(11)
    expect(preview.right).toBeLessThanOrEqual(window.innerWidth - 11)
    expect(preview.top).toBeGreaterThanOrEqual(11)
    expect(preview.bottom).toBeLessThanOrEqual(window.innerHeight - 11)
  })
  await expect(tooltip.querySelector('[data-tooltip-caret]')).toBeVisible()
  return tooltip
}

export const AnchoredTooltip: Story = {
  render: () => <TooltipCard />,
  play: async ({ canvasElement }) => {
    const card = within(canvasElement).getByRole('button', { name: /Preview/ })
    await userEvent.hover(card)
    const tooltip = await expectAnchoredPreview(card)
    const originalPosition = tooltip.getBoundingClientRect()
    fireEvent.mouseMove(card, { clientX: card.getBoundingClientRect().right - 2, clientY: card.getBoundingClientRect().bottom - 2 })
    await expect(tooltip.getBoundingClientRect().x).toBe(originalPosition.x)
    await expect(tooltip.getBoundingClientRect().y).toBe(originalPosition.y)
    await userEvent.click(card)
    await expect(within(document.body).queryByRole('tooltip', { name: 'Sewer-veillance Cam preview' })).toBeNull()
  },
}

export const DoubleFacedTooltip: Story = {
  render: () => <TooltipCard doubleFaced />,
  play: async ({ canvasElement }) => {
    const card = within(canvasElement).getByRole('button', { name: /Preview/ })
    await userEvent.hover(card)
    const tooltip = await expectAnchoredPreview(card)
    await expect(tooltip.querySelector('[alt$="(Back Face)"], [aria-label$="(Back Face)"]')).not.toBeNull()
  },
}

export const FallbackCard: Story = {
  render: () => <div className="h-[210px] w-[150px] overflow-hidden rounded-lg"><CatalogCardImage catalogId={-1} name="Unavailable card" className="h-full w-full" /></div>,
}
