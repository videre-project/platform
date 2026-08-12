/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { AutocompleteContext, AutocompleteChoice } from 'slash-create/web';


/**
 * Searches for autocomplete options based on the provided context and mapper.
 * @param ctx - The AutocompleteContext object from the interaction.
 * @param choices - The array of AutocompleteChoice objects to search.
 * @returns An array of AutocompleteChoice objects matching the query.
 */
export function search(
  ctx: AutocompleteContext,
  choices: AutocompleteChoice[]
) {
  // Get the focused option and query string.
  const focus = ctx.focused!;
  const query = (ctx.options[focus] || '') as string;

  // Filter the options based on the fuzzy search results.
  const fuzzySearch = new RegExp(`.*${query.split('').join('.*')}.*`, 'i');
  const options = [] as AutocompleteChoice[];
  for (const { name, value } of choices) {
    if (!query.length || fuzzySearch.test(name))
      options.push({ name, value });
  }

  return options.slice(0, 25);
}
