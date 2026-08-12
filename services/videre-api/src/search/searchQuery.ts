/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type SearchParams = { [key: string]: any };

export const assignIfMissing = (
  params: SearchParams,
  key: string,
  value: any
): void => {
  if (params[key] === undefined || params[key] === null || params[key] === '') {
    params[key] = value;
  }
}

export const stripQuotes = (text: string): string =>
  text.replace(/^"(.+)"$/, '$1');

export const tokenizeSearchQuery = (text: string): string[] => {
  const tokens: string[] = [];
  let token = '';
  let inQuote = false;

  for (const char of text) {
    if (char === '"') {
      inQuote = !inQuote;
      token += char;
      continue;
    }

    if (/\s/.test(char) && !inQuote) {
      if (token) {
        tokens.push(token);
        token = '';
      }
      continue;
    }

    token += char;
  }

  if (token) {
    tokens.push(token);
  }

  return tokens;
}
