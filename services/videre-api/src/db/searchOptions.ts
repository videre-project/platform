/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type SortDirection = 'asc' | 'desc';
export type CardOrderDirection = SortDirection;

export type CardUniqueMode = 'cards' | 'prints';

export type CardOrderMode = 'rank' | 'name' | 'mana_value' | 'set' | 'released';

const CARD_UNIQUE_ALIASES = new Map<string, CardUniqueMode>([
  ['prints',    'prints'],
  ['printings', 'prints'],
  ['cards',     'cards'],
  ['card',      'cards'],
  ['oracle',    'cards'],
  ['oracles',   'cards'],
]);

const CARD_ORDER_ALIASES = new Map<string, CardOrderMode>([
  ['rank',       'rank'],
  ['relevance',  'rank'],
  ['name',       'name'],
  ['mv',         'mana_value'],
  ['cmc',        'mana_value'],
  ['mana',       'mana_value'],
  ['mana_value', 'mana_value'],
  ['set',        'set'],
  ['released',   'released'],
  ['release',    'released'],
]);

export function parseSortDirection(value: unknown): SortDirection | undefined {
  switch (String(value ?? '').toLowerCase()) {
    case 'asc':
    case 'ascending':
      return 'asc';
    case 'desc':
    case 'descending':
      return 'desc';
    default:
      return undefined;
  }
}

export function normalizeSortDirection(
  value: unknown,
  defaultDirection: SortDirection = 'asc'
): SortDirection {
  return parseSortDirection(value) ?? defaultDirection;
}

export function parseCardUniqueMode(value: unknown): CardUniqueMode | undefined {
  return CARD_UNIQUE_ALIASES.get(String(value ?? '').toLowerCase());
}

export function normalizeCardUniqueMode(
  value: unknown,
  defaultMode: CardUniqueMode = 'prints'
): CardUniqueMode {
  return parseCardUniqueMode(value) ?? defaultMode;
}

export function parseCardOrderMode(value: unknown): CardOrderMode | undefined {
  return CARD_ORDER_ALIASES.get(String(value ?? '').toLowerCase());
}

export function normalizeCardOrderMode(
  value: unknown,
  defaultMode: CardOrderMode
): CardOrderMode {
  return parseCardOrderMode(value) ?? defaultMode;
}
