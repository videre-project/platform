/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  compile,
  defineFilters,
  ident,
  lowerContains,
  orderBy,
  paramFilter,
  raw,
  sql,
  type CompiledSql,
  type SqlFragment
} from '@videreproject/sql-builder';
import { clampListLimit, clampOffset } from '../../../queryPolicy.ts';
import { normalizeSortDirection } from '../../searchOptions.ts';
import { table } from '@videreproject/sql-schema';

export type SetQueryParams = {
  readonly q?: string | null,
  readonly code?: string | null,
  readonly name?: string | null,
  readonly type?: string | null,
  readonly order?: string | null,
  readonly dir?: string | null,
  readonly limit?: number | null,
  readonly offset?: number | null,
};

const sets = table('sets', 's');

const setFilters = defineFilters<SetQueryParams>([
  paramFilter('q', (value) => sql`(
    ${sets.column('code')} ILIKE '%' || ${value} || '%'
    OR ${sets.column('name')} ILIKE '%' || ${value} || '%'
  )`),
  paramFilter('code', (value) => sql`upper(${sets.column('code')}) = upper(${value})`),
  paramFilter('name', (value) => lowerContains(sets.column('name'), value)),
  paramFilter('type', (value) => sql`lower(
    coalesce(${sets.column('set_type')}, '')
  ) = lower(${value})`),
]);

export const buildSetsQuery = (params: SetQueryParams): CompiledSql => {
  const orderMode = normalizeSetOrderMode(params.order);
  const orderDirection = normalizeSortDirection(
    params.dir,
    orderMode === 'released' ? 'desc' : 'asc'
  );
  const limit = clampListLimit(params.limit);
  const offset = clampOffset(params.offset);

  return compile(sql`
    WITH matching_sets AS MATERIALIZED (
      SELECT
        ${sets.column('code')},
        ${sets.column('name')},
        ${sets.column('release_date')},
        ${sets.column('age')},
        ${sets.column('set_type')}
      FROM ${sets.source}
      WHERE ${setPredicates(params)}
      ORDER BY ${setOrder('s', orderMode, orderDirection)}
      LIMIT ${limit}::int
      OFFSET ${offset}::int
    )
    SELECT
      ms.code,
      ms.name,
      ms.release_date,
      ms.age,
      ms.set_type,
      coalesce(c.card_count, 0) AS card_count,
      coalesce(c.token_count, 0) AS token_count,
      coalesce(p.product_count, 0) AS product_count
    FROM matching_sets ms
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE coalesce(c0.is_token, FALSE) = FALSE) AS card_count,
        count(*) FILTER (WHERE coalesce(c0.is_token, FALSE) = TRUE) AS token_count
      FROM cards c0
      WHERE c0.set_code = ms.code
    ) c ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*) AS product_count
      FROM products p0
      WHERE p0.set_code = ms.code
    ) p ON TRUE
    ORDER BY ${setOrder('ms', orderMode, orderDirection)}
  `);
};

export const buildSetCountQuery = (params: SetQueryParams): CompiledSql =>
  compile(sql`
    SELECT count(*)::bigint AS count
    FROM ${sets.source}
    WHERE ${setPredicates(params)}
  `);

function setPredicates(params: SetQueryParams): SqlFragment {
  return setFilters.where(params);
}

function setOrder(
  alias: 's' | 'ms',
  orderMode: ReturnType<typeof normalizeSetOrderMode>,
  direction: ReturnType<typeof normalizeSortDirection>
): SqlFragment {
  switch (orderMode) {
    case 'name':
      return orderBy([
        sql`${setOrderColumn(alias, 'name')} ${raw(direction)} NULLS LAST`,
        sql`${setOrderColumn(alias, 'release_date')} DESC NULLS LAST`,
        setOrderColumn(alias, 'code'),
      ]);
    case 'code':
      return sql`${setOrderColumn(alias, 'code')} ${raw(direction)} NULLS LAST`;
    case 'type':
      return orderBy([
        sql`${setOrderColumn(alias, 'set_type')} ${raw(direction)} NULLS LAST`,
        sql`${setOrderColumn(alias, 'release_date')} DESC NULLS LAST`,
        setOrderColumn(alias, 'code'),
      ]);
    default:
      return orderBy([
        sql`${setOrderColumn(alias, 'release_date')} ${raw(direction)} NULLS LAST`,
        setOrderColumn(alias, 'code'),
      ]);
  }
}

function setOrderColumn(
  alias: 's' | 'ms',
  column: 'code' | 'name' | 'release_date' | 'set_type'
): SqlFragment {
  return alias === 's' ? sets.column(column) : ident(alias, column);
}

function normalizeSetOrderMode(value?: string | null): 'name' | 'code' | 'type' | 'released' {
  switch (String(value ?? 'released').toLowerCase()) {
    case 'name':
      return 'name';
    case 'code':
    case 'set':
      return 'code';
    case 'type':
    case 'set_type':
      return 'type';
    default:
      return 'released';
  }
}
