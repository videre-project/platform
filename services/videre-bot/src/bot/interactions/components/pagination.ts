/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { ComponentEdgeContext } from 'slash-create/web';

import type { Button } from './index';
import { type SelectMenu, ActionRow } from './index';


// Type of ordered array of 'SelectMenu', 'Button', and 'Button';
export type ButtonMapper = (data: any[]) => [SelectMenu, Button, Button];

export function paginateData(
  data: any[],
  mapper: ButtonMapper,
  page: number = 1
): ActionRow[] {
  const idx = (page - 1) * 25;
  const page_count = Math.ceil(data.length / 25);

  const [menu, button1, button2] = mapper(data.slice(idx, idx + 25));
  button1.data.disabled = page == 1;
  button2.data.disabled = page == page_count;

  // Update placeholder to reflect current page.
  let placeholder = menu.data.placeholder as string;
  if (placeholder.includes(' - Page '))
    placeholder?.replace(/(?<=Page )\d+/, page.toString());
  else
    placeholder += ` - Page ${page} of ${page_count}`;
  menu.data.placeholder = placeholder;

  const row1 = new ActionRow(menu);
  const row2 = new ActionRow(button1, button2);

  return [row1, row2];
}

export async function navigatePage(
  ctx: ComponentEdgeContext,
  data: any[],
  mapper: ButtonMapper,
  offset: number
) {
  const rows = ctx.message.components as any[];

  // Extract the page number from the placeholder.
  const placeholder = rows[0].components[0].placeholder as string;
  const page = parseInt(placeholder.match(/(?<=Page )\d+/) as any) + offset;

  const [ row1, row2 ] = paginateData(data, mapper, page);
  rows[0] = row1.toJSON();
  rows[1] = row2.toJSON();

  await ctx.editOriginal({ components: rows });
}
