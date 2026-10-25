/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Error as error } from './responses.ts';
import type { IRequest } from 'itty-router';
import type { OpenAPIV3 } from 'openapi-types';

import type { Context } from './handler';
import { getDefault } from './parameters';

export type ParameterValidator = ((params: any, key: string, value: any) => Response | void) & {
  required?: boolean,
  schema?: OpenAPIV3.SchemaObject,
};

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
export const Required = <T extends ParameterValidator>(obj: T): T & { required: true } => {
  return new Proxy(obj, {
    apply: (target, thisArg, [params, key, value]) => {
      if (value === undefined)
        return error(400, `Missing required parameter: ${key}`);

      return target(params, key, value);
    },
    get: (target, prop) => {
      if (prop === 'required') return true;
      return Reflect.get(target, prop);
    }
  }) as T & { required: true };
}

/**
 * Marks a parameter as optional.
 * @param obj The parameter to mark as optional.
 * @returns The parametervalidator function.
 */
export const Optional = <T extends ParameterValidator>(obj: T): T & { optional: true } => {
  return new Proxy(obj, {
    apply: (target, thisArg, [params, key, value]) => {
      if (value === undefined && getDefault(key) === undefined)
        return error(500, `Missing default for optional parameter: ${key}`);

      return target(params, key, value);
    },
    get: (target, prop) => {
      if (prop === 'optional') return true;
      return Reflect.get(target, prop);
    }
  }) as T & { optional: true };
}

/**
 * Verifies all parameters in a request.
 * @param map A map of parameter names to validation functions.
 * @returns A middleware function that validates the given parameters.
 */
export const withValidation = (
  map: Record<string, ParameterValidator>
) => {
  return Object.assign(({ proxy }: IRequest, { params }: Context, ..._: any[]) => {
    for (const [key, validator] of Object.entries(map)) {
      const value = proxy?.params?.[key] ?? proxy?.query?.[key] ?? getDefault(key);
      if (validator?.required || value !== undefined) {
        const result = validator(params, key, value);
        if (result) return result;
      }
    }
  }, { validators: map });
}
