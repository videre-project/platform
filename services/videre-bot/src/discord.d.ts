/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  ActionRowBuilder,
  AnyComponentBuilder,
  EmbedBuilder
} from '@discordjs/builders';
import sc, {
  CommandContext,
  ComponentActionRow,
  ComponentContext,
  MessageEmbedOptions,
  ModalInteractionContext,
  ModalOptions,
  ModalSendableContext
} from 'slash-create/web';


declare module 'slash-create/web' {
  // #region - Discord.JS Builders

  // @ts-ignore - Allow Discord.JS builders to be passed in response objects.
  interface MessageOptions extends sc.MessageOptions {
    /** The embeds of the message. */
    embeds?: (MessageEmbedOptions | EmbedBuilder)[];
    /** The components of the message. */
    components?: (ComponentActionRow | ActionRowBuilder<AnyComponentBuilder>)[];
  }

  // #endregion

  // #region - Modals

  // Require custom ids to be specified in an edge worker context.
  type ModalCommandOptions<T extends ModalOptions = ModalOptions> = T & {
    /** The custom ID of the modal. */
    custom_id: string;
  }

  // @ts-ignore - Disable modal callbacks in an edge worker context.
  class ModalSendableContext extends sc.ModalSendableContext {
    /**
     * Sends a modal to the user.
     * @param options The message options
     * @returns The custom ID of the modal
     */
    public sendModal(options: ModalCommandOptions): Promise<string>;
  }

  // Configure context overrides for the shared edge context.
  type EdgeContext<T extends ModalSendableContext> =
    Omit<T, "sendModal"> & ModalSendableContext;

  // Override interaction contexts to use the edge context.
  type CommandEdgeContext = EdgeContext<CommandContext>;
  type ComponentEdgeContext = EdgeContext<ComponentContext>;
  type ModalEdgeContext = ModalInteractionContext;

  // #endregion
}
