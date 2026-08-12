/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { ident, join, raw, sql, toFragment } from './fragments.ts';
import type { JsonObjectFields, SelectFields, SqlFragment } from './types.ts';

export const jsonBuildObject = <const TKey extends string>(
  fields: JsonObjectFields<TKey>,
): SqlFragment => {
  const entries = Object.entries(fields) as [TKey, SqlFragment | string][];
  return sql`json_build_object(${join(entries.flatMap(([key, value]) => [
    stringLiteral(key),
    toFragment(value),
  ]))})`;
};

const stringLiteral = (value: string): SqlFragment =>
  raw(`'${value.replaceAll("'", "''")}'`);

export const jsonBuildObjectFromColumns = <const TColumnName extends string>(
  alias: string,
  columns: readonly TColumnName[],
): SqlFragment => {
  const fields = Object.fromEntries(
    columns.map((column) => [column, ident(alias, column)]),
  ) as JsonObjectFields<TColumnName>;

  return jsonBuildObject(fields);
};

export const selectFields = <const TKey extends string>(
  fields: SelectFields<TKey>,
): SqlFragment => {
  const entries = Object.entries(fields) as [TKey, SqlFragment | string][];
  return join(entries.map(([key, value]) => {
    return sql`${toFragment(value)} AS ${ident(key)}`;
  }));
};
