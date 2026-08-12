/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Router } from 'itty-router';

import type { Context } from '@videre-api/handler';
import { asJSON } from '@videre-api/responses';

import type Env from "@bot/env";
import type { DiscordHandler} from './server';
import { registerServer, cfServer } from './server';

/**
 * Wrapper for the Cloudflare Worker server for handling Discord interactions.
 */
let instance: DiscordHandler;

/**
 * Router for handling Discord API requests.
 */
export default Router({ base: '/discord', finally: [asJSON] })
  .post('/',
    async (req: Request, { cf }: Context, env: Env): Promise<Response> => {
      // Register the server commands if not already registered
      instance ??= registerServer(cfServer, env)
        .on('warn', (msg) => console.warn(msg))
        .on('error', (err) => console.error(err.stack || err.toString()))
        .on('commandError', (command, error) =>
          console.error(`Command ${command.commandName} errored:`, error.stack || error.toString())
        );

      return cfServer.fetch(req, env, cf);
    });
