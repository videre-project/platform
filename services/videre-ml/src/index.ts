/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type Env from './env';
import handler from './handler';

export default {
  fetch: (request: Request, env: Env): Promise<Response> =>
    handler(request, env),
};
