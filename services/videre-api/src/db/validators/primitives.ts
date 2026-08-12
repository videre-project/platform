/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { error } from 'itty-router';

type ValidationParams = Record<string, unknown>;

/**
 * Accepts the boolean spellings commonly used in query strings.
 */
export const BooleanValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const normalized = String(value).toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    params[key] = true;
    return;
  }

  if (['false', '0', 'no'].includes(normalized)) {
    params[key] = false;
    return;
  }

  return error(400, `Invalid ${key} specified: '${value}'`);
};

export const DateValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const date = new Date(String(value));
  if (isNaN(date.getTime()))
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = date;
};

export const NumberValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const number = Number(value);
  if (isNaN(number))
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = number;
};

export const StringValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const string = String(value);
  if (!/^[\p{L}\p{Nd}\p{P}\s]+$/u.test(string))
    return error(400, `Invalid ${key} specified: '${value}'`);

  params[key] = string;
};
