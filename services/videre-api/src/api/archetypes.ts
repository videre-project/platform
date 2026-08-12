/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';

import { withPostgres } from '@/db/postgres';
import { getDeckStatistics } from '@/db/queries';
import { FormatTypeValidator, StringValidator } from '@/db/validators';
import { Execute } from '@/db/helpers';
import { clampListLimit } from '@/queryPolicy';
import { All, Required, Optional, withValidation } from '@/validation';

import { eventFilterArgs as eventArgs } from './events';


export const args = All(eventArgs, {
  format:     Required(FormatTypeValidator),
  archetype:  Optional(StringValidator),
});

export default Router({ base: '/archetypes' })
  .get('/:format?',
    withValidation(args),
    withPostgres,
    async ({ archetype }, { sql, params }) => {
      if (archetype) {
        params.limit = 1;
      }
      const query = getDeckStatistics(sql, params);
      const limit = clampListLimit(params.limit);

      return await Execute(sql`
        SELECT * FROM (${query})
        LIMIT ${limit}
      `, params);
    }
  );
