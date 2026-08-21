/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import router from './api';
import { applyPublicApiCors } from './apiPolicy';
import type { CacheHandler} from './cache';
import { updateCache } from './cache';
import type { Sql } from './db/postgres';
import type Env from './env';
import { Error } from './responses';


/**
 * Maximum request execution time in milliseconds
 */
export const MAX_TIMEOUT = 15_000; // 15 seconds

/**
 * Maximum database query execution time in milliseconds
 */
export const MAX_DB_QUERY_EXECUTION = 10_000; // 10 seconds

/**
 * Maximum time to wait for a PostgreSQL socket to close after a response.
 * postgres.js measures this timeout in seconds.
 */
const POSTGRES_CLOSE_TIMEOUT = 0.1;

/**
 * The request context passed through the handler
 */
export interface Context {
  cf: ExecutionContext;
  params: { [key: string]: any };
  cache?: CacheHandler;
  cachePolicy?: string;
  sql: Sql;
}

export default (req: Request, ctx: Context, env: Env): Promise<Response> =>
  new Promise((resolve) => {
    const respond = (response: Response) => applyPublicApiCors(response, req);
    let closePromise: Promise<void> | undefined;

    const closePostgres = (): Promise<void> => {
      if (!ctx.sql) return Promise.resolve();
      closePromise ??= ctx.sql.end({ timeout: POSTGRES_CLOSE_TIMEOUT })
        .catch((err) => console.error('[Postgres] Failed to close client:', err));
      return closePromise;
    };

    const finish = async (response: Response): Promise<void> => {
      clearTimeout(timeout);
      await closePostgres();
      resolve(response);
    };

    const timeout: ReturnType<typeof setTimeout> = setTimeout(
      () => void finish(respond(Error(408, 'Request timed out'))),
      MAX_TIMEOUT
    );

    router
      .fetch(req, ctx, env)
      .catch((err) => {
        console.error('[Handler] Fatal route error:', err);
        return respond(Error(500, 'Encountered a fatal error.'));
      })
      .then((res) => ctx.cache ? updateCache(res, ctx) : res)
      .then(finish)
      .catch((err) => {
        console.error('[Handler] Failed to finish response:', err);
        return finish(respond(Error(500, 'Encountered a fatal error.')));
      });
  });
