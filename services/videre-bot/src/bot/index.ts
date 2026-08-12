/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';

import { Error } from '@videre-api/responses';

import discord from './interactions';


export default Router()
  // Add API routes
  .all('/discord/*', discord.fetch)
  // Catch-all for any other requests
  .all('*', () => Error(404, 'Could not find the requested resource.'));
