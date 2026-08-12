/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Buffer } from 'node:buffer';

const MAX_WEBSOCKET_FRAME_BYTES = 8 * 1024;

export class TcpOverWebSocket {
  private ws: WebSocket | null = null;
  private onData: ((data: Uint8Array) => void) | null = null;
  private onError: ((err: Error) => void) | null = null;
  private onClose: (() => void) | null = null;
  private connected: boolean = false;

  constructor(
    private hostname: string,
    private port: number,
    private options: {
      ssl?: boolean;
      clientId?: string;
      clientSecret?: string;
    } = {}
  ) {}

  once(event: string, fn: any) {
    if (event === 'error') this.onError = fn;
    if (event === 'close') this.onClose = fn;
  }

  on(event: string, fn: any) {
    if (event === 'data') this.onData = fn;
    if (event === 'error') this.onError = fn;
    if (event === 'close') this.onClose = fn;
    return this;
  }

  removeListener(event: string) {
    if (event === 'data') this.onData = null;
    return this;
  }

  removeAllListeners() {
    this.onData = null;
    this.onError = null;
    this.onClose = null;
    return this;
  }

  async connect() {
    const protocol = this.options.ssl ? 'https' : 'http';
    const url = `${protocol}://${this.hostname}`;

    const headers: Record<string, string> = {
      'Upgrade': 'websocket',
      'Sec-WebSocket-Protocol': 'cloudflare-v1-connector',
    };

    if (this.options.clientId && this.options.clientSecret) {
      headers['CF-Access-Client-Id'] = this.options.clientId;
      headers['CF-Access-Client-Secret'] = this.options.clientSecret;
    }

    console.log(`[Transport] Connecting to ${url} (Protocol: cloudflare-v1-connector)...`);

    try {
      const resp = await fetch(url, {
        headers
      });

      console.log(`[Transport] Fetch status: ${resp.status} ${resp.statusText}`);

      if (resp.status !== 101) {
        const text = await resp.text();
        console.error(`[Transport] Failed to upgrade: ${resp.status} ${text}`);
        throw new Error(`Failed to upgrade to WebSocket: ${resp.status} ${text}`);
      }

      const ws = resp.webSocket;
      if (!ws) {
        throw new Error('No WebSocket in response');
      }

      this.ws = ws;
      ws.accept();
      ws.binaryType = 'arraybuffer';

      ws.addEventListener('message', (msg: any) => {
        const bytes = new Uint8Array(msg.data as ArrayBuffer);
        if (this.onData && msg.data) {
          // IMPORTANT: Wrap in Buffer for postgres.js compatibility
          this.onData(Buffer.from(bytes));
        }
      });

      ws.addEventListener('close', (evt: any) => {
        console.log(`[Transport] WebSocket closed: code=${evt.code} reason=${evt.reason} wasClean=${evt.wasClean}`);
        if (this.onClose) this.onClose();
      });

      ws.addEventListener('error', (err: any) => {
        const errorInfo = {
          message: err.message || 'No message',
          type: err.type,
          error: err.error ? (err.error.message || String(err.error)) : 'None'
        };
        console.error('[Transport] WebSocket error detail:', JSON.stringify(errorInfo));
        if (this.onError) this.onError(new Error(`WebSocket error: ${errorInfo.message}`));
      });

      this.connected = true;
      return this;
    } catch (err: any) {
      console.error(`[Transport] Connect error: ${err.message || String(err)}`);
      if (this.onError) this.onError(err as Error);
      throw err;
    }
  }

  write(chunk: Uint8Array, cb?: () => void) {
    if (!this.ws || !this.connected) {
      return false;
    }

    try {
      for (let offset = 0; offset < chunk.byteLength; offset += MAX_WEBSOCKET_FRAME_BYTES) {
        this.ws.send(chunk.slice(offset, offset + MAX_WEBSOCKET_FRAME_BYTES));
      }
      if (cb) setTimeout(cb, 0);
      return true;
    } catch (err: any) {
      console.error('[Transport] Write error:', err.message);
      if (this.onError) this.onError(err as Error);
      return false;
    }
  }

  destroy() {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
    }
  }

  terminate() {
    this.destroy();
  }

  end() {
    this.destroy();
  }
}

export function createWebSocketFactory(env: any) {
  return (options: any) => {
    const socket = new TcpOverWebSocket(options.host[0], options.port[0], {
      ssl: true,
      clientId: env.CF_CLIENT_ID,
      clientSecret: env.CF_CLIENT_SECRET
    });

    return socket.connect();
  };
}
