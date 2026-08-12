/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';

import { withPostgres } from '@/db/postgres';
import { getEventMatches } from '@/db/queries';
import {
  DateValidator,
  FormatTypeValidator,
  NumberValidator,
  StringValidator
} from '@/db/validators';
import {
  buildListResponse,
  Error,
  getListLimit,
  getProbePagination
} from '@/responses';
import { Optional, withValidation } from '@/validation';

export const args = {
  format:    Optional(FormatTypeValidator),
  event_id:  Optional(NumberValidator),
  min_date:  Optional(DateValidator),
  max_date:  Optional(DateValidator),
  player:    Optional(StringValidator),
  archetype: Optional(StringValidator),
  limit:     Optional(NumberValidator),
  offset:    Optional(NumberValidator),
};

export default Router({ base: '/matches' })
  .get('/:format?',
    withValidation(args),
    withPostgres,
    async (req, { sql, params }) => {
      const start = performance.now();
      const limit = getListLimit(params);
      const rows = await getEventMatches(sql, params);
      const data = rows.slice(0, limit);

      if (!data.length) {
        return Error(400, 'No results found.', buildListResponse(params, data, null, start));
      }

      return buildListResponse(
        params,
        data,
        null,
        start,
        getProbePagination(params, rows.length)
      );
    }
  );
