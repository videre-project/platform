/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { error } from 'itty-router';
import type { IRequest } from 'itty-router';

import type { Context } from './handler';
import { getDefault } from './parameters';


/**
 * Merges multiple validation objects into one.
 * @param sources The objects to merge.
 * @returns The merged object.
 */
export const All = (...sources: object[]) => Object.assign({}, ...sources);

/**
 * Marks a parameter as required.
 * @param obj The parameter to mark as required.
 * @returns The parameter validator function.
 */
export const Required = (obj: any): any => {
  return new Proxy(obj, {
    apply: (target, thisArg, [params, key, value]) => {
      if (value === undefined)
        return error(400, `Missing required parameter: ${key}`);

      return target(params, key, value);
    },
    get: (target, prop) => {
      if (prop === 'required') return true;
      return target[prop];
    }
  });
}

/**
 * Marks a parameter as optional.
 * @param obj The parameter to mark as optional.
 * @returns The parametervalidator function.
 */
export const Optional = (obj: any): any => {
  return new Proxy(obj, {
    apply: (target, thisArg, [params, key, value]) => {
      if (value === undefined && getDefault(key) === undefined)
        return error(500, `Missing default for optional parameter: ${key}`);

      return target(params, key, value);
    },
    get: (target, prop) => {
      if (prop === 'optional') return true;
      return target[prop];
    }
  });
}

/**
 * Verifies all parameters in a request.
 * @param map A map of parameter names to validation functions.
 * @returns A middleware function that validates the given parameters.
 */
export const withValidation = (
  map: {
    [key in string]: (params: any, key: string, value: any) => Response | void
  }
) => {
  return ({ proxy }: IRequest, { params }: Context, ..._: any[]) => {
    for (const [key, validator] of Object.entries(map)) {
      const value = proxy?.params?.[key] ?? proxy?.query?.[key] ?? getDefault(key);
      // @ts-expect-error - Validator is a proxy that extends the function type.
      if (validator?.required || value !== undefined) {
        const result = validator(params, key, value);
        if (result) return result;
      }
    }
  }
}
