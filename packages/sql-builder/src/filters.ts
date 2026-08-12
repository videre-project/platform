/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { and } from './predicates.ts';
import type { DefinedFilters, QueryFilter, SqlFragment } from './types.ts';

export const defineFilters = <TParams>(
  filters: readonly QueryFilter<TParams>[],
): DefinedFilters<TParams> => ({
  filters,
  where: (params) => and(filters.map((filter) => filter(params))),
});

export const paramFilter = <TParams, TKey extends keyof TParams>(
  key: TKey,
  predicate: (
    value: NonNullable<TParams[TKey]>,
    params: TParams,
  ) => SqlFragment,
): QueryFilter<TParams> => (params) => {
  const value = params[key];
  return isPresentValue(value)
    ? predicate(value as NonNullable<TParams[TKey]>, params)
    : null;
};

export const isPresentValue = (value: unknown): boolean =>
  value !== undefined && value !== null && value !== '';
