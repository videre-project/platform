/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { error } from 'itty-router';

import { EVENTS, FORMATS } from '@videreproject/constants';
import type { EventType, FormatType } from '@videreproject/constants';

type ValidationParams = Record<string, unknown>;

const toPascalCase = (text: string): string =>
  text.replace(/(?:^|[_\s-])(\w)/g, (_, c) => c.toUpperCase());

export const FormatTypeValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const format = toPascalCase(String(value)) as FormatType;
  if (!FORMATS.includes(format))
    return error(400, `Invalid ${key} specified: '${format}'`);

  params[key] = format;
};

export const EventTypeValidator = (
  params: ValidationParams,
  key: string,
  value: unknown
): Response | void => {
  const kind = toPascalCase(String(value)) as EventType;
  if (!EVENTS.includes(kind))
    return error(400, `Invalid ${key} specified: '${kind}'`);

  params[key] = kind;
};
