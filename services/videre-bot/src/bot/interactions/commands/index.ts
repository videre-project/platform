/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { SlashCommand } from 'slash-create/web';
import type {
  BaseSlashCreator,
  AutocompleteContext,
  SlashCommandOptions,
  CommandContext,
  ComponentEdgeContext,
  ModalEdgeContext
} from 'slash-create/web';

/**
 * The configuration options for a command.
 */
export type CommandOptions<T extends SlashCommandOptions = SlashCommandOptions> = T & {
  /**
   * Executes the command with the given command context.
   * @param ctx - The command context.
   * @returns A promise that resolves to the result of the command execution.
   */
  run: typeof CommandFactory.prototype.run;
  /**
   * Autocompletes the command with the given command context.
   * @param ctx - The command context.
   * @returns A promise that resolves to the result of the command autocompletion.
   */
  autocomplete?: typeof CommandFactory.prototype.autocomplete;
  /**
   * Executes a callback with the given component context.
   * @param ctx - The component context.
   * @returns A promise that resolves to the result of the command execution.
   */
  callbacks?: CommandCallbacks;
};

/**
 * Represents a mapping of callbacks for command components and modals.
 */
export type CommandCallbacks = {
  components?: { [id: string]: (ctx: ComponentEdgeContext) => Promise<void>; };
  modals?: { [id: string]: (ctx: ModalEdgeContext) => Promise<void>; }
};

/**
 * A factory for creating command instances.
 */
export class CommandFactory extends SlashCommand {
  run: (ctx: CommandContext) => Promise<any> = null!;
  autocomplete: (ctx: AutocompleteContext) => Promise<any> = null!;
  callbacks: CommandCallbacks = { components: {}, modals: {} };

  /**
   * Constructs a new instance of the command.
   * @param creator The creator object.
   * @param options The options for the slash command.
   */
  constructor(creator: BaseSlashCreator, options: SlashCommandOptions) {
    // Build the command handler.
    super(creator, options);
  }
}

/**
 * Represents a command that can be registered with the bot.
 */
export class Command {
  /** The command configuration options */
  readonly options: SlashCommandOptions;
  /** The command callbacks */
  readonly callbacks: CommandCallbacks;

  /**
   * Creates a new instance of the Command class.
   * @param {CommandOptions} options - The options for the command.
   * @param {Function} options.run - The function to run when the command is executed.
   * @param {Function} options.autocomplete - The function to provide autocomplete suggestions for the command.
   */
  constructor({ run, autocomplete, callbacks, ...options }: CommandOptions) {
    this.options = options;
    this.callbacks = callbacks || {};
    // @ts-expect-error - Factory constructor will consume the command options.
    return new Proxy(CommandFactory, {
      construct: (target, [creator]) => {
        const instance = new target(creator, options);
        instance.run = run as typeof instance.run;
        instance.autocomplete = autocomplete!;
        instance.callbacks = callbacks!;
        return instance;
      },
    })
  }
}

export default [
  require('./debug'),
  require('./events'),
  require('./matchups'),
  require('./metagame'),
];
