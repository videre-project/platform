/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import { Badge } from '../src/primitives/Badge'
import { Button } from '../src/primitives/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../src/primitives/Card'
import { Input } from '../src/primitives/Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../src/primitives/Select'
import { Skeleton } from '../src/primitives/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../src/primitives/Table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../src/primitives/Tooltip'

const meta = {
  title: 'Primitives/Canonical states',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ButtonsAndBadges: Story = {
  render: () => (
    <div className="flex items-center gap-3 rounded-lg border border-sidebar-border/60 bg-card p-6">
      <Button>Primary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button disabled>Disabled</Button>
      <Badge>Win</Badge>
      <Badge variant="secondary">1–2</Badge>
      <Badge variant="destructive">Loss</Badge>
    </div>
  ),
}

export const SelectInteraction: Story = {
  args: { onChange: fn() },
  render: args => (
    <Select defaultValue="price" onValueChange={args.onChange}>
      <SelectTrigger className="h-8 w-[116px]" aria-label="Sort collection by">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">Name</SelectItem>
        <SelectItem value="quantity">Quantity</SelectItem>
        <SelectItem value="price">Price</SelectItem>
      </SelectContent>
    </Select>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('combobox'))
    await userEvent.click(within(document.body).getByRole('option', { name: 'Name' }))
    await expect(args.onChange).toHaveBeenCalledWith('name')
  },
}

export const OpenSelect: Story = {
  parameters: { a11y: { disable: true } },
  render: () => (
    <div className="h-52 pt-4">
      <Select value="price" open>
        <SelectTrigger className="h-8 w-[116px]" aria-label="Sort collection by"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name</SelectItem>
          <SelectItem value="quantity">Quantity</SelectItem>
          <SelectItem value="price">Price</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const TooltipState: Story = {
  render: () => (
    <TooltipProvider delayDuration={0}>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild><Button variant="outline">Card details</Button></TooltipTrigger>
        <TooltipContent>Open the selected card’s details</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
}

export const InputCardTableAndSkeleton: Story = {
  render: () => (
    <Card className="w-[560px]">
      <CardHeader>
        <CardTitle>Recorded trade</CardTitle>
        <CardDescription>Canonical container and form primitives</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input aria-label="Fixture search" placeholder="Search history" />
        <Table>
          <TableHeader><TableRow><TableHead>Partner</TableHead><TableHead>Result</TableHead></TableRow></TableHeader>
          <TableBody><TableRow><TableCell>FblthpTradeBot</TableCell><TableCell>Completed</TableCell></TableRow></TableBody>
        </Table>
        <Skeleton className="h-8 w-full" role="status" aria-label="Loading history" />
      </CardContent>
    </Card>
  ),
}
