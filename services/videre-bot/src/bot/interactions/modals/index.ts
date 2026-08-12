/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type {
  ModalCommandOptions,
  ModalInteractionContext
} from 'slash-create/web';


/**
 * The configuration options for a modal.
 */
export type ModalOptions<T extends ModalCommandOptions = ModalCommandOptions> = T & {
  /**
   * Callback to execute when the modal recieves a response.
   * @param ctx - The modal context.
   */
  callback: typeof Modal.prototype.callback;
};

/**
 * Represents a modal that can be registered with the bot.
 */
export class Modal implements ModalOptions {
  /** The title of the modal */
  readonly title: string;
  /** The custom ID of the modal. */
  readonly custom_id: string;
  /** The components of the modal. */
  readonly components: ModalCommandOptions['components'];

  /** The callback to execute when the modal recieves a response. */
  readonly callback: (ctx: ModalInteractionContext) => void;

  /**
   * Creates a new instance of the Modal class.
   * @param {ModalOptions} options - The options for the modal.
   * @param {Function} options.callback - The callback function to be executed when the modal is interacted with.
   */
  constructor({ callback, ...options }: ModalOptions) {
    this.title = options.title;
    this.custom_id = options.custom_id;
    this.components = options.components;
    this.callback = callback;
  }
}

export default [];
