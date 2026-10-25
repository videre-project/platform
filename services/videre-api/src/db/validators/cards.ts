/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Error as error } from '../../responses.ts';

import {
  CARD_ORDER_ALIASES,
  CARD_UNIQUE_ALIASES,
  parseCardOrderMode,
  parseCardUniqueMode,
  parseSortDirection
} from '../searchOptions.ts';
import { CARD_RARITIES, FORMATS, normalizeCardRarity } from '@videreproject/constants';

type ValidationParams = Record<string, unknown>;

const normalizeLookupKey = (value: string): string =>
  value.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

const FORMAT_CODES = new Map(
  FORMATS.map((format) => [normalizeLookupKey(format), format.toLowerCase()])
);

const LEGALITY_ALIASES = new Map([
  ['legal',      'legal'],
  ['not legal',  'not_legal'],
  ['notlegal',   'not_legal'],
  ['not_legal',  'not_legal'],
  ['banned',     'banned'],
  ['restricted', 'restricted'],
  ['suspended',  'suspended'],
]);

export const CardFormatValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const format = normalizeCardFormatCode(String(value));
  if (!format)
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = format;
};
CardFormatValidator.schema = { type: 'string' as const, enum: [...FORMAT_CODES.values()] };

export const normalizeCardFormatCode = (value: string): string | undefined =>
  FORMAT_CODES.get(normalizeLookupKey(value));

export const CardLegalityValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const legality = normalizeCardLegality(String(value));
  if (!legality)
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = legality;
};
CardLegalityValidator.schema = { type: 'string' as const, enum: [...new Set(LEGALITY_ALIASES.values())] };

export const normalizeCardLegality = (value: string): string | undefined =>
  LEGALITY_ALIASES.get(normalizeLookupKey(value));

export const CardRarityValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const rarity = normalizeCardRarity(String(value));
  if (!rarity)
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = rarity;
};
CardRarityValidator.schema = { type: 'string' as const, enum: [...CARD_RARITIES] };

export const CardSearchQueryValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const query = String(value);
  if (!/^[\p{L}\p{Nd}\p{P}\p{S}\s]+$/u.test(query))
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = query;
};
CardSearchQueryValidator.schema = { type: 'string' as const };

export const CardSortDirectionValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const direction = parseSortDirection(value);
  if (direction) {
    params[key] = direction;
    return;
  }

  return error(400, `Invalid ${key} specified: '${value}'`);
};
CardSortDirectionValidator.schema = { type: 'string' as const, enum: ['asc', 'desc'] };

export const CardSortOrderValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const order = parseCardOrderMode(value);
  if (!order)
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = order;
};
CardSortOrderValidator.schema = { type: 'string' as const, enum: [...new Set(CARD_ORDER_ALIASES.values())] };

export const CardUniqueModeValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const unique = parseCardUniqueMode(value);
  if (!unique)
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = unique;
};
CardUniqueModeValidator.schema = { type: 'string' as const, enum: [...new Set(CARD_UNIQUE_ALIASES.values())] };
