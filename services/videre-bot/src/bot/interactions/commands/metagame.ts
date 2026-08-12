/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { EmbedBuilder } from '@discordjs/builders';
import { CommandOptionType } from 'slash-create/web';

import { FORMATS } from '@videreproject/constants';
import type { IMetagame } from '@videre-api/db/queries';

import { Timestamp } from '@bot/utils/formatters/date';
import type { Column} from '@bot/utils/formatters/table';
import { formatTable } from '@bot/utils/formatters/table';
import Bindings, { type APIResponse, Query } from '@bot/bindings';
import { ErrorEmbed } from '@bot/responses';

import { Command } from './index';


/**
 * The columns to display in the metagame table.
 */
const columns: Column[] = [
  {
    key: 'rank',
    label: '#',
    align: 'right',
    separator: true
  },
  {
    key: 'archetype',
    label: 'Archetype',
    align: 'left'
  },
  {
    key: 'percentage',
    label: 'Meta %',
    align: 'right'
  },
  {
    key: 'winrate',
    label: 'Game Win % (CI)',
    align: 'right'
  },
];

export default new Command({
  name: 'metagame',
  description: 'Displays a breakdown of archetypes from the most recent events.',
  options: [
    {
      type: CommandOptionType.STRING,
      name: 'format',
      description: 'The specific format to query metagame data for.',
      choices: FORMATS.map((format) => ({ name: format, value: format })),
      required: true
    }
  ],
  run: async (ctx) => {
    const query1 = new Query('/metagame', ctx.options, { limit: 16 });
    const res1 = await Bindings.API(query1);
    if (!res1.ok) return ErrorEmbed(res1);

    const { parameters, data } = (await res1.json()) as APIResponse<IMetagame[]>;
    const max_ci_length = Math.max(...data.map(({ game_ci }) => game_ci.length));
    const table = formatTable(
      columns,
      data.map(({ archetype, percentage, game_winrate, game_ci }, i) => {
        const rank = i + 1;
        const ci = `(${game_ci})`.padStart(max_ci_length + 2, ' ');
        const winrate = `${game_winrate} ${ci}`;
        return { rank, archetype, percentage, winrate };
      })
    );

    const { format, min_date, max_date } = parameters;
    const description =
      `${format} results from ` +
      `${Timestamp(min_date)} to ${Timestamp(max_date)} ` +
      `([source](${res1.url})):\n` +
      table;

    const embed1 = new EmbedBuilder({
      title: 'Metagame',
      description,
      color: 0x204e8a
    });

    return {
      embeds: [embed1],
    };
  }
});
