/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type SqlValue = string | number | boolean | Date | null;

export type CompiledSql = {
  readonly text: string;
  readonly values: readonly SqlValue[];
};

export type SqlFragment = {
  readonly text: string;
  readonly values: readonly SqlValue[];
};

export type JsonObjectFields<TKey extends string = string> = Readonly<
  Record<TKey, SqlFragment | string>
>;

export type SelectFields<TKey extends string = string> = Readonly<
  Record<TKey, SqlFragment | string>
>;

export type SchemaDefinition = Record<string, readonly string[]>;

export type SchemaTableName<TSchema extends SchemaDefinition> = Extract<
  keyof TSchema,
  string
>;

export type SchemaColumnName<
  TSchema extends SchemaDefinition,
  TTableName extends SchemaTableName<TSchema>,
> = Extract<TSchema[TTableName][number], string>;

export type TableRef<
  TColumnName extends string = string,
  TAlias extends string = string,
> = {
  readonly alias: TAlias;
  readonly columns: readonly TColumnName[];
  readonly name: string;
  readonly source: SqlFragment;
  readonly column: (name: TColumnName) => SqlFragment;
};

export type QueryFilter<TParams> = (params: TParams) => SqlFragment | null;

export type DefinedFilters<TParams> = {
  readonly filters: readonly QueryFilter<TParams>[];
  readonly where: (params: TParams) => SqlFragment;
};

export type IntegerClampOptions = {
  readonly defaultValue: number;
  readonly max?: number;
  readonly min?: number;
};
