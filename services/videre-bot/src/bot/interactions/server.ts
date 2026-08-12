/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type {
  SlashCreatorOptions} from 'slash-create/web';
import {
  Collection,
  SlashCreator,
  CloudflareWorkerServer
} from 'slash-create/web';

import type Env from "@bot/env";

import type { Command, CommandCallbacks } from './commands';


/**
 * The Discord interactions handler for the Cloudflare Worker server.
 */
export class DiscordHandler extends SlashCreator {
  /** The components loaded onto the handler */
  readonly components = new Collection<string, any>(); // TODO: Add Component class
  readonly modals = new Collection<string, any>();     // TODO: Add Modal class

  /**
   * Creates a new handler instance.
   * @param server - The CloudflareWorkerServer instance.
   * @param options - The options for the base SlashCreator.
   */
  constructor(server: CloudflareWorkerServer, options: SlashCreatorOptions) {
    super(options);
    this.withServer(server);
  }

  /**
   * Registers global callbacks for components and modals.
   * @param callbacks - The callbacks to register.
   * @returns The handler instance.
   */
  registerCallbacks(callbacks?: CommandCallbacks) {
    const getEntry = (o?: { [id: string]: any }) => o ? Object.entries(o) : [];
    for (const [custom_id, callback] of getEntry(callbacks?.components))
      this.registerGlobalComponent(custom_id, callback);
    for (const [custom_id, callback] of getEntry(callbacks?.modals))
      this.registerGlobalModal(custom_id, callback);

    // TODO: Create a list of keys and arguments for parsing custom_ids containing
    //       an '@' delimited id and list of arguments.
  }

  /**
   * Registers multiple commands
   * @param commands An array of Command instances or constructors
   * @param ignoreInvalid Whether to skip over invalid objects without throwing an error
   */
  registerCommands(commands: any[], ignoreInvalid = false): any[] {
    const registeredCommands =
      super.registerCommands(commands, ignoreInvalid) as unknown as Command[];

    // Register any component / modal callbacks associated with the command.
    for (const command of registeredCommands)
      this.registerCallbacks(command.callbacks);

    return registeredCommands;
  }

  // TODO: Register component callbacks using a global key:
  //   - `global-${ctx.customID}`
  //      https://github.com/Snazzah/slash-create/blob/9fd1f5d/src/creator.ts#L654-L671
  //   - registerGlobalComponent(custom_id: string, callback: ComponentRegisterCallback)
  //      https://github.com/Snazzah/slash-create/blob/9fd1f5d/src/creator.ts#L445-L459
  //      https://github.com/Snazzah/slash-create/blob/9fd1f5d/src/creator.ts#L138-L157

  // registerComponent(component: any)
  // registerComponents(components: any[], ignoreInvalid = false)

  // TODO: Register modal callbacks using a global key:
  //   - `global-${context.customID}`
  //      https://github.com/Snazzah/slash-create/blob/9fd1f5d/src/creator.ts#L710-L731
  //   - registerGlobalModal(custom_id: string, callback: ModalRegisterCallback)
  //      https://github.com/Snazzah/slash-create/blob/9fd1f5d/src/creator.ts#L469-L483
  //      https://github.com/Snazzah/slash-create/blob/9fd1f5d/src/creator.ts#L138-L157

  // registerModal(modal: any)
  // registerModals(modals: any[], ignoreInvalid = false)
}

/**
 * Registers the Cloudflare Worker server for handling Discord interactions.
 * @param server The Cloudflare Worker server.
 * @param env The environment variables.
 * @returns The SlashCreator instance.
 */
export function registerServer(server: CloudflareWorkerServer, env: Env) {
  const handler = new DiscordHandler(server, {
    applicationID: env?.DISCORD_CLIENT_ID,
    publicKey: env?.DISCORD_PUBLIC_KEY,
    token: env?.DISCORD_BOT_TOKEN,
  });

  // Register all interactions to handle through this worker.
  handler
    .registerCommands(require('./commands').default);
  //  .registerComponents(require('./components').default);
  //  .registerModals(require('./modals').default);

  return handler;
}

/**
 * Cloudflare Worker server for handling Discord interactions.
 */
export const cfServer = new CloudflareWorkerServer();
