/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { parseSortDirection } from '@/db/searchOptions';
import {
  assignIfMissing,
  stripQuotes,
  tokenizeSearchQuery as tokenize,
  type SearchParams
} from './searchQuery.ts';

const ORDER_KEYS = new Set([
  'name',
  'code',
  'set',
  'type',
  'set_type',
  'released',
  'release',
  'date'
]);

export const applySetSearchQuery = (params: SearchParams): SearchParams => {
  if (!params.q) {
    return params;
  }

  const next = { ...params };
  const textTerms: string[] = [];

  for (const token of tokenize(String(params.q))) {
    if (!applyToken(next, token)) {
      textTerms.push(stripQuotes(token));
    }
  }

  next.q = textTerms.length > 0 ? textTerms.join(' ') : undefined;
  return next;
}

const applyToken = (params: SearchParams, token: string): boolean => {
  const tagged = token.match(/^([A-Za-z_]+):(.+)$/);
  if (!tagged) {
    return false;
  }

  const [, rawKey, rawValue] = tagged;
  const key = rawKey.toLowerCase();
  const value = stripQuotes(rawValue);

  if (key === 'code' || key === 'set' || key === 'e' || key === 'edition') {
    assignIfMissing(params, 'code', value);
    return true;
  }

  if (key === 'name' || key === 'n') {
    assignIfMissing(params, 'name', value);
    return true;
  }

  if (key === 'type' || key === 'set_type') {
    assignIfMissing(params, 'type', value);
    return true;
  }

  if (key === 'order' || key === 'sort') {
    const normalizedOrder = normalizeOrder(value);
    if (normalizedOrder) {
      assignIfMissing(params, 'order', normalizedOrder);
      return true;
    }
  }

  if (key === 'dir' || key === 'direction') {
    const normalizedDirection = normalizeDirection(value);
    if (normalizedDirection) {
      assignIfMissing(params, 'dir', normalizedDirection);
      return true;
    }
  }

  return false;
}

const normalizeOrder = (value: string): string | undefined => {
  const key = value.toLowerCase();
  if (!ORDER_KEYS.has(key)) {
    return undefined;
  }

  if (key === 'set') {
    return 'code';
  }

  if (key === 'set_type') {
    return 'type';
  }

  if (key === 'release' || key === 'date') {
    return 'released';
  }

  return key;
}

const normalizeDirection = (value: string): string | undefined => {
  return parseSortDirection(value);
}
