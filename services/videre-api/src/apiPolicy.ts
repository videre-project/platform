/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { cors } from 'itty-router';

export const {
  preflight: publicApiPreflight,
  corsify: applyPublicApiCors,
} = cors({
  allowMethods: ['GET', 'POST', 'QUERY', 'OPTIONS'],
  exposeHeaders: ['Accept-Query'],
});
