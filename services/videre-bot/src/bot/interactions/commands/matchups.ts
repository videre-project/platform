/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { EmbedBuilder } from '@discordjs/builders';
import { CommandOptionType } from 'slash-create/web';

import { FORMATS } from '@videreproject/constants';
import type { IMatchupMatrix, IMetagame } from '@videre-api/db/queries';

import { Timestamp } from '@bot/utils/formatters/date';
import type { Column} from '@bot/utils/formatters/table';
import { formatTable } from '@bot/utils/formatters/table';
import Bindings, { type APIResponse, Query } from '@bot/bindings';
import { ErrorEmbed } from '@bot/responses';

import { search } from '^/interactions/autocomplete';
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
    align: 'left',
  },
  {
    key: 'games',
    label: 'Games',
    align: 'right'
  },
  {
    key: 'winrate',
    label: 'Game Win % (CI)',
    align: 'right'
  },
];

export default new Command({
  name: 'matchups',
  description: 'Displays a breakdown of an archetype\'s matchups.',
  options: [
    {
      type: CommandOptionType.STRING,
      name: 'format',
      description: 'The specific format to query matchup data for.',
      choices: FORMATS.map((format) => ({ name: format, value: format })),
      required: true
    },
    {
      type: CommandOptionType.STRING,
      name: 'archetype',
      description: 'The archetype to query matchup data for.',
      required: true,
      autocomplete: true
    }
  ],
  autocomplete: async (ctx) => {
    switch (ctx.focused) {
      case 'archetype': {
        const query = new Query('/metagame', { format: ctx.options.format });
        const res = await Bindings.API(query);
        if (!res.ok) return [];

        const { data } = (await res.json()) as APIResponse<IMetagame[]>;
        return search(ctx, data.map(({ archetype }) => ({
          name: archetype,
          value: archetype
        })));
      }
    }
  },
  run: async (ctx) => {
    const query1 = new Query('/matchups', ctx.options);
    const res1 = await Bindings.API(query1);
    if (!res1.ok) return ErrorEmbed(res1);

    const { parameters, data } = (await res1.json()) as APIResponse<IMatchupMatrix[]>;
    const matchups = data[0].matchups.slice(0, 15);
    const max_ci_length = Math.max(...matchups.map(({ game_ci }) => game_ci.length));
    const table = formatTable(
      columns,
      matchups.map(({ archetype, game_count, game_winrate, game_ci }, i) => {
        const rank = i + 1;
        const ci = `(${game_ci})`.padStart(max_ci_length + 2, ' ');
        const winrate = `${game_winrate} ${ci}`;
        return { rank, archetype, games: game_count, winrate };
      })
    );

    const { format, archetype, min_date, max_date } = parameters;
    const description =
      `${format} matchups for **${archetype}** from ` +
      `${Timestamp(min_date)} to ${Timestamp(max_date)} ` +
      `([source](${res1.url})):\n` +
      table;

    const embed1 = new EmbedBuilder({
      title: 'Matchups',
      description,
      color: 0x204e8a
    });

    return {
      embeds: [embed1]
    };
  }
});
