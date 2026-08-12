/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type Env from './env';

import type { Context } from './handler';
import handler from './handler';


export default {
  fetch: (req: Request, env: Env, cf: ExecutionContext): Promise<Response> =>
    handler(req, { cf, params: {} } as Context, env),
}
