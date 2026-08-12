/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export default interface Env {
  DISCORD_CLIENT_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  // Bindings
  VIDERE_API: { fetch: (req: Request) => Promise<Response>; };
}
