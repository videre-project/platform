/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';

import { withPostgres } from '@/db/postgres';
import { getMetagame } from '@/db/queries';
import { FormatTypeValidator } from '@/db/validators';
import { Execute } from '@/db/helpers';
import { clampListLimit } from '@/queryPolicy';
import { All, Required, withValidation } from '@/validation';

import { eventFilterArgs as eventArgs } from './events';


export const args = All(eventArgs, {
  format:     Required(FormatTypeValidator),
});

export default Router({ base: '/metagame' })
  .get('/:format?',
    withValidation(args),
    withPostgres,
    async (req, { sql, params }) => {
      const query = getMetagame(sql, params);
      const limit = clampListLimit(params.limit);

      return await Execute(sql`
        SELECT * FROM (${query})
        LIMIT ${limit}
      `, params);
    }
  );
