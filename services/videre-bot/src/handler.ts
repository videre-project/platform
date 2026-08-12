/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Error } from '@videre-api/responses';

import router from './bot';
import { setBindings } from './bindings';
import type Env from './env';


/**
 * The request context passed through the handler
 */
export interface Context {
  cf: ExecutionContext;
}

export default (req: Request, ctx: Context, env: Env): Promise<Response> =>
  new Promise((resolve) => {
    // Set API bindings for invoking other Cloudflare workers
    setBindings(env);

    // Execute the request
    router
      // Pass Cloudflare provided arguments to the router
      .fetch(req, ctx, env)
      .catch(() => Error(500, 'Encountered a fatal error.'))
      .then(resolve);
  });
