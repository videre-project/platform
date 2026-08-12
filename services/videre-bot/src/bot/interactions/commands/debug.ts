/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  CommandOptionType,
  ComponentType,
  TextInputStyle
} from 'slash-create/web';

import { Command } from './index';


export default new Command({
  name: 'test',
  description: 'Test command for testing Cloudflare Workers',
  options: [
    {
      type: CommandOptionType.STRING,
      name: 'archetype',
      description: 'Enter an archetype to test the command.',
      required: true,
      autocomplete: true
    }
  ],
  throttling: {
    usages: 1,
    duration: 10
  },
  run: async (ctx) => {
    // return `> ${ctx.options.archetype}\nHello, ${ctx.user.username}!`;
    ctx.sendModal({
      title: 'Test',
      custom_id: 'foo',
      components: [
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              label: 'Text Input',
              style: TextInputStyle.SHORT,
              custom_id: 'text_input',
              placeholder: 'Type something...'
            }
          ]
        },
        {
          type: ComponentType.ACTION_ROW,
          components: [
            {
              type: ComponentType.TEXT_INPUT,
              label: 'Long Text Input',
              style: TextInputStyle.PARAGRAPH,
              custom_id: 'long_text_input',
              placeholder: 'Type something...'
            }
          ]
        }
      ]
    });
  }
});
