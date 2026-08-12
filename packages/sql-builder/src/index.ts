/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type {
  CompiledSql,
  DefinedFilters,
  IntegerClampOptions,
  JsonObjectFields,
  QueryFilter,
  SchemaColumnName,
  SchemaDefinition,
  SchemaTableName,
  SelectFields,
  SqlFragment,
  SqlValue,
  TableRef,
} from './types.ts';

export {
  compile,
  ident,
  join,
  orderBy,
  param,
  raw,
  sql,
} from './fragments.ts';

export {
  and,
  eq,
  exists,
  ilikeContains,
  lowerContains,
  notExists,
  optional,
  or,
} from './predicates.ts';

export {
  jsonBuildObject,
  jsonBuildObjectFromColumns,
  selectFields,
} from './json.ts';

export {
  SelectQuery,
  select,
} from './select.ts';

export {
  defineSchema,
  tableColumnFields,
  tableColumns,
} from './schema.ts';

export {
  defineFilters,
  isPresentValue,
  paramFilter,
} from './filters.ts';

export {
  clampInteger,
} from './utils.ts';
