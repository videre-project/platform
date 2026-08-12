/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { IntegerClampOptions } from './types.ts';

export const clampInteger = (
  value: unknown,
  options: IntegerClampOptions,
): number => {
  let parsedValue = Number.NaN;

  if (value !== undefined && value !== null) {
    parsedValue = typeof value === 'number' ? value : Number(value);
  }

  const finiteValue = Number.isFinite(parsedValue)
    ? parsedValue
    : options.defaultValue;
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;

  return Math.min(Math.max(Math.trunc(finiteValue), min), max);
};
