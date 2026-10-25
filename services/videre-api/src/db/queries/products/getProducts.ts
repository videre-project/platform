/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { fromCompiledQuery } from '../compiledQuery.ts';

import { buildProductCountQuery, buildProductsQuery } from './buildProductsQuery.ts';

export interface IProduct {
  /**
   * @multipleOf 1
   * @minimum 1
   */
  id: number,
  set_code: string | null,
  set_name: string | null,
  name: string | null,
  description: string | null,
  object_type: string | null,
  /**
   * @multipleOf 1
   */
  texture_number: number | null,
  is_tradable: boolean | null,
  /**
   * @format uri
   */
  image_url: string,
  in_collection?: boolean
};

export interface IProductCount {
  count: number
};

export const getProducts = fromCompiledQuery<IProduct>(buildProductsQuery);

export const getProductCount = fromCompiledQuery<IProductCount>(buildProductCountQuery);
