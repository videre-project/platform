/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Preview } from '@storybook/react-vite'

import { CardTooltipProvider } from '../src/components/cards/CardTooltip'
import './storybook.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Videre theme',
      defaultValue: 'dark',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'dark', title: 'Dark' },
          { value: 'light', title: 'Light' },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const dark = context.globals.theme !== 'light'
      document.documentElement.classList.toggle('dark', dark)
      document.body.classList.toggle('dark', dark)
      return (
        <CardTooltipProvider>
          <div className="videre-ui min-h-screen bg-background text-foreground">
            <Story />
          </div>
        </CardTooltipProvider>
      )
    },
  ],
  parameters: {
    a11y: {
      test: 'error',
    },
    backgrounds: { disable: true },
    controls: { expanded: true },
    options: { storySort: { order: ['Primitives', 'Cards', 'Collection', 'Trades', 'Match', 'Replay'] } },
  },
}

export default preview
