/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import postgres from 'postgres';

import { createWebSocketFactory } from './transport';

import type Env from '@/env';
import type { Context } from '@/handler';


export type Sql = postgres.Sql<{}>;

// postgres.PendingQuery<T> expects a readonly tuple type. API query wrappers
// use result interfaces instead, so this alias deliberately keeps the driver
// boundary permissive.
export type PendingSql<T> = postgres.PendingQuery<any> & {
  readonly __resultType?: T;
};

export type RowList<T extends readonly any[]> = postgres.RowList<T>;

export function withPostgres(req: any, ctx: Context, env: Env): void {
  ctx.params.host = `${env.PGUSER}@${env.PGHOST}/${env.PGDATABASE}`;
  ctx.params.backend = 'postgres';

  // @ts-expect-error - Input vars must have implicit string operators
  ctx.sql = postgres({
    host: env.PGHOST,
    database: env.PGDATABASE,
    username: env.PGUSER,
    password: env.PGPASSWORD,
    port: parseInt(env.PGPORT || '5432'),
    // The Cloudflare tunnel terminates TLS before postgres.js sees the socket.
    // Direct database connections keep SSL required unless local config opts out.
    ssl: env.PGHOST.toString().includes('videreproject.com')
      ? false
      : (env.PGSSL === 'false' || env.PGSSL === false ? false : 'require'),
    transform: {
      undefined: null
    },
    socket: env.PGHOST.toString().includes('videreproject.com')
      ? createWebSocketFactory(env)
      : undefined
  }) as Sql;
}
