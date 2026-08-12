/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { ident, join, sql } from './fragments.ts';
import type {
  SchemaColumnName,
  SchemaDefinition,
  SchemaTableName,
  SqlFragment,
  TableRef,
} from './types.ts';

export const defineSchema = <const TSchema extends SchemaDefinition>(
  schema: TSchema,
) => ({
  table: <
    const TTableName extends SchemaTableName<TSchema>,
    const TAlias extends string,
  >(
    name: TTableName,
    alias: TAlias,
  ): TableRef<SchemaColumnName<TSchema, TTableName>, TAlias> => {
    const columns = schema[name] as unknown as readonly SchemaColumnName<
      TSchema,
      TTableName
    >[];

    return {
      alias,
      columns,
      name,
      source: sql`${ident(name)} ${ident(alias)}`,
      column: (columnName) => ident(alias, columnName),
    };
  },
});

export const tableColumns = <TColumnName extends string>(
  table: TableRef<TColumnName>,
  columns: readonly TColumnName[],
): SqlFragment => join(columns.map((column) => table.column(column)));

export const tableColumnFields = <
  TColumnName extends string,
  const TSelectedColumnName extends TColumnName,
>(
  table: TableRef<TColumnName>,
  columns: readonly TSelectedColumnName[],
): Readonly<Record<TSelectedColumnName, SqlFragment>> =>
  Object.fromEntries(
    columns.map((column) => [column, table.column(column)]),
  ) as Readonly<Record<TSelectedColumnName, SqlFragment>>;
