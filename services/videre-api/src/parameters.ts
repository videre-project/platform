/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { IRequest } from 'itty-router';

import type { Context } from './handler';
import { DEFAULT_LIST_LIMIT } from './queryPolicy';


/**
 * Default query parameter values.
 */
export const getDefault = (key: string) => (({
  min_date: new Date(new Date().setDate(new Date().getDate() - 31)),
  max_date: new Date(),
  limit: DEFAULT_LIST_LIMIT,
})[key]);

/**
 * Exposes path params, query params, and route defaults through one request
 * proxy so validators and handlers read from the same source.
 */
export const withParams = (req: IRequest, { params }: Context, ..._: any[]) => {
  req.proxy = new Proxy(req.proxy || req, {
    get: (obj, prop) => obj[prop] !== undefined
      ? obj[prop].bind?.(req) || obj[prop]
      : (
        params[prop as string] ??=
          obj?.params?.[prop] ??
          obj?.query?.[prop] ??
          getDefault(prop as string)
      ),
    set: (obj, prop, value) => {
      if (prop in params)
      {
        params[prop as string] = value;
        return true;
      }

      obj[prop] = value;
      return true;
    }
  })
}

/**
 * A middleware that filters request parameters by the given list of parameters.
 * @param params The list of parameters to include.
 * @returns A middleware that filters the request parameters.
 */
export const useParams = (params: string[]) => {
  return ({ proxy }: IRequest, ctx: Context, ..._: any[]) => {
    ctx.params = new Proxy(ctx.params, {
      get: (obj, prop) => (
        obj[prop as string] ??= params.includes(prop as string)
          ? obj[prop as string] || proxy[prop as string]
          : undefined
      ),
      set: (obj, prop, value) =>
        params.includes(prop as string)
        ? obj[prop as string] = value
        : false,
    });
  }
}
