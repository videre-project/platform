/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Error } from '@videre-api/responses';

import router from './api';
import type Env from './env';

export default (request: Request, env: Env): Promise<Response> =>
  router
    .fetch(request, env)
    .catch((error) => {
      console.error('[videre-ml] Fatal route error', error);
      return Error(500, 'Encountered a fatal error.');
    });
