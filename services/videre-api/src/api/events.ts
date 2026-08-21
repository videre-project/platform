/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';

import { withPostgres } from '@/db/postgres';
import { getEvents } from '@/db/queries';
import {
  FormatTypeValidator,
  EventTypeValidator,
  DateValidator,
  NumberValidator
} from '@/db/validators';
import {
  buildListResponse,
  Error,
  getListLimit,
  getListOffset,
  getProbePagination
} from '@/responses';
import { Optional, withValidation } from '@/validation';


export const eventFilterArgs = {
  format:     Optional(FormatTypeValidator),
  event_id:   Optional(NumberValidator),
  min_date:   Optional(DateValidator),
  max_date:   Optional(DateValidator),
  limit:      Optional(NumberValidator),
};

export const eventListFilterArgs = {
  ...eventFilterArgs,
  kind:       Optional(EventTypeValidator),
};

export const args = {
  ...eventListFilterArgs,
  offset:     Optional(NumberValidator),
};

export default Router({ base: '/events' })
  .get('/:format?',
    withValidation(args),
    withPostgres,
    async (req, { sql, params }) => {
      const start = performance.now();
      const query = getEvents(sql, params);
      const limit = getListLimit(params);
      const offset = getListOffset(params);
      const rows = await sql`
        SELECT * FROM (${query})
        LIMIT ${limit + 1}
        OFFSET ${offset}
      `;
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
