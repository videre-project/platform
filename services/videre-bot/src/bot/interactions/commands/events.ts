/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { EmbedBuilder } from '@discordjs/builders';
import { type APISelectMenuOption, ButtonStyle } from 'discord-api-types/v10';
import { CommandOptionType } from 'slash-create/web';

import { FORMATS } from '@videreproject/constants';
import type { IEvent } from '@videre-api/db/queries';

import { toUSLocale, Timestamp } from '@bot/utils/formatters/date';
import Bindings, { type APIResponse, Query } from '@bot/bindings';
import { ErrorEmbed } from '@bot/responses';

import eventEmoji from '^/emojis/eventTypes';
import { Button, StringSelectMenu } from '../components';
import { type ButtonMapper, paginateData, navigatePage } from '../components/pagination';
import { setCallbackData, getCallbackData } from '../components/callbacks';
import { Command } from './index';


const eventMenuMapper: ButtonMapper = (data: IEvent[]) => {
  const eventOptions = data.map(({ id, name, kind, date, rounds, players }) => ({
    label: `${name} #${id}`,
    description: `${toUSLocale(date)} | ${rounds} rounds, ${players} players`,
    value: id.toString(),
    emoji: eventEmoji(kind),
  } satisfies APISelectMenuOption));

  return [
    new StringSelectMenu({
      custom_id: 'events/:event_id',
      placeholder: 'Filter by event(s)',
      max_values: 1,
      options: eventOptions,
    }),
    new Button({
      custom_id: 'events/left-1',
      label: '←',
      style: ButtonStyle.Secondary,
    }),
    new Button({
      custom_id: 'events/right+1',
      label: ' -> ',
      style: ButtonStyle.Secondary,
    })
  ]
}

export default new Command({
  name: 'events',
  description: 'Displays a list of online event results published from MTGO.',
  options: [
    {
      type: CommandOptionType.STRING,
      name: 'format',
      description: 'The specific format to query event data for.',
      choices: FORMATS.map((format) => ({ name: format, value: format }))
    }
  ],
  run: async (ctx) => {
    const query = new Query('/events', ctx.options);
    const res = await Bindings.API(query);
    if (!res.ok) return ErrorEmbed(res);

    const { parameters, data } = (await res.json()) as APIResponse<IEvent[]>;
    const eventPagination = paginateData(data, eventMenuMapper, 1);

    const { format, min_date, max_date } = parameters;
    const description =
      'Showing events from ' +
      `${Timestamp(min_date)} to ${Timestamp(max_date)} ` +
      (format ? `for ${format}.` : 'across all formats.');

    const embed1 = new EmbedBuilder({
      title: 'Events',
      description,
      color: 0x204e8a
    });

    const message = {
      embeds: [embed1],
      components: [...eventPagination]
    };

    return setCallbackData(message, query);
  },
  callbacks: {
    components: {
      'events/:event_id': async (ctx) => {
        ctx.send('You selected: ' + ctx.values.toString());
      },
      'events/left-1': async (ctx) => {
        const data = await getCallbackData<IEvent>(ctx);
        await navigatePage(ctx, data, eventMenuMapper, -1);
      },
      'events/right+1': async (ctx) => {
        const data = await getCallbackData<IEvent>(ctx);
        await navigatePage(ctx, data, eventMenuMapper, +1);
      }
    }
  },
});
