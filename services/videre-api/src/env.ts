/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Url } from "url";


export default interface Env {
  PGHOST: Url;
  PGDATABASE: string;
  PGUSER: string;
  PGPASSWORD: string;
  PGPORT?: string;
  PGSSL?: string | boolean;
  CF_CLIENT_ID?: string;
  CF_CLIENT_SECRET?: string;
  CACHE_VERSION?: string;
}
