/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { join, raw, sql, toFragment, toFragmentOrParam } from './fragments.ts';
import type { SqlFragment, SqlValue } from './types.ts';

export const and = (
  fragments: readonly (SqlFragment | false | null | undefined)[],
): SqlFragment => {
  const predicates = fragments.filter(isPresentFragment);
  return predicates.length === 0
    ? raw('TRUE')
    : join(predicates.map((fragment) => sql`(${fragment})`), raw('\n  AND '));
};

export const or = (
  fragments: readonly (SqlFragment | false | null | undefined)[],
): SqlFragment => {
  const predicates = fragments.filter(isPresentFragment);
  return predicates.length === 0
    ? raw('FALSE')
    : join(predicates.map((fragment) => sql`(${fragment})`), raw('\n  OR '));
};

export const optional = (
  value: unknown,
  fragment: SqlFragment,
): SqlFragment | null =>
  value === undefined || value === null || value === '' ? null : fragment;

export const eq = (
  left: SqlFragment | string,
  right: SqlFragment | SqlValue,
): SqlFragment =>
  sql`${toFragment(left)} = ${toFragmentOrParam(right)}`;

export const ilikeContains = (
  left: SqlFragment | string,
  value: SqlValue,
): SqlFragment =>
  sql`${toFragment(left)} ILIKE '%' || ${value} || '%'`;

export const lowerContains = (
  left: SqlFragment | string,
  value: SqlValue,
): SqlFragment =>
  sql`lower(coalesce(${toFragment(left)}, '')) LIKE '%' || lower(${value}) || '%'`;

export const exists = (query: SqlFragment): SqlFragment =>
  sql`EXISTS (${query})`;

export const notExists = (query: SqlFragment): SqlFragment =>
  sql`NOT EXISTS (${query})`;

function isPresentFragment(
  value: SqlFragment | false | null | undefined,
): value is SqlFragment {
  return value !== false && value !== null && value !== undefined;
}
