/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { fromCompiledQuery } from '../compiledQuery.ts';

import { buildSetCountQuery, buildSetsQuery } from './buildSetsQuery.ts';

export interface ISet {
  code: string,
  name: string | null,
  release_date: string | null,
  /** @multipleOf 1 */
  age: number | null,
  set_type: string | null,
  /** @multipleOf 1 */
  card_count: number,
  /** @multipleOf 1 */
  token_count: number,
  /** @multipleOf 1 */
  product_count: number
};

export interface ISetCount {
  count: number
};

export const getSets = fromCompiledQuery<ISet>(buildSetsQuery);

export const getSetCount = fromCompiledQuery<ISetCount>(buildSetCountQuery);
