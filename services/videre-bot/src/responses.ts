/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { EmbedBuilder } from '@discordjs/builders';
import type { MessageOptions, MessageEmbedOptions } from 'slash-create/web';


/**
 * Generates an error embed for a Discord message.
 * @param error - The error response object.
 * @returns The message options containing the error embed.
 */
export function ErrorEmbed(error: Response): MessageOptions {
  const embed = new EmbedBuilder()
    .setColor(0xf44336)
    .setTitle('Error')
    .setDescription(error.statusText)
    .setTimestamp();

  return {
    ephemeral: true,
    embeds: [embed as MessageEmbedOptions]
  };
}
