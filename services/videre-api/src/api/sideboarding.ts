/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';

import { withPostgres } from '@/db/postgres';
import { getSideboarding, getSideboardingMatchups } from '@/db/queries';
import { FormatTypeValidator, StringValidator } from '@/db/validators';
import { Execute } from '@/db/helpers';
import { clampListLimit } from '@/queryPolicy';
import { All, Optional, Required, withValidation } from '@/validation';

import { eventFilterArgs as eventArgs } from './events';


export const args = All(eventArgs, {
  format: Required(FormatTypeValidator),
});

export const matchupArgs = All(eventArgs, {
  format: Required(FormatTypeValidator),
  archetype: Optional(StringValidator),
});

export default Router({ base: '/sideboarding' })
  .get('/:format?/matchups',
    withValidation(matchupArgs),
    withPostgres,
    async ({ archetype }, { sql, params }) => {
      if (archetype) params.limit = 1;
      const query = getSideboardingMatchups(sql, params);
      const limit = clampListLimit(params.limit);

      return await Execute(sql`
        SELECT * FROM (${query})
        LIMIT ${limit}
      `, params);
    }
  )
  .get('/:format?',
    withValidation(args),
    withPostgres,
    async (req, { sql, params }) => {
      const query = getSideboarding(sql, params);
      const limit = clampListLimit(params.limit);

      return await Execute(sql`
        SELECT * FROM (${query})
        LIMIT ${limit}
      `, params);
    }
  );
