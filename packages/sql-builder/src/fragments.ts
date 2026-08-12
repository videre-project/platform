/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { CompiledSql, SqlFragment, SqlValue } from './types.ts';

export const emptyFragment: SqlFragment = {
  text: '',
  values: [],
};

export const sql = (
  strings: TemplateStringsArray,
  ...values: readonly (SqlFragment | SqlValue)[]
): SqlFragment => {
  const parts: string[] = [];
  const params: SqlValue[] = [];

  for (let index = 0; index < strings.length; index += 1) {
    parts.push(strings[index]);

    if (index >= values.length) {
      continue;
    }

    const value = values[index];
    if (isFragment(value)) {
      parts.push(shiftPlaceholders(value.text, params.length));
      params.push(...value.values);
    } else {
      params.push(value);
      parts.push(`$${params.length}`);
    }
  }

  return {
    text: parts.join(''),
    values: params,
  };
};

export const raw = (text: string): SqlFragment => ({
  text,
  values: [],
});

export const param = (value: SqlValue, cast?: string): SqlFragment => {
  const placeholder = cast === undefined ? '$1' : `$1::${cast}`;
  return {
    text: placeholder,
    values: [value],
  };
};

export const ident = (...parts: readonly string[]): SqlFragment => {
  if (parts.length === 0) {
    throw new Error('Identifier requires at least one part.');
  }

  return raw(parts.map(quoteIdentifier).join('.'));
};

export const join = (
  fragments: readonly SqlFragment[],
  separator: SqlFragment = raw(', '),
): SqlFragment => {
  if (fragments.length === 0) {
    return emptyFragment;
  }

  return fragments.slice(1).reduce(
    (current, fragment) => sql`${current}${separator}${fragment}`,
    fragments[0],
  );
};

export const orderBy = (
  fragments: readonly (SqlFragment | string)[],
): SqlFragment => join(fragments.map(toFragment));

export const compile = (fragment: SqlFragment): CompiledSql => ({
  text: normalizeSql(fragment.text),
  values: fragment.values,
});

export function isFragment(value: unknown): value is SqlFragment {
  return typeof value === 'object'
    && value !== null
    && 'text' in value
    && 'values' in value
    && typeof (value as SqlFragment).text === 'string'
    && Array.isArray((value as SqlFragment).values);
}

export function toFragment(value: SqlFragment | string): SqlFragment {
  return typeof value === 'string' ? raw(value) : value;
}

export function toFragmentOrParam(value: SqlFragment | SqlValue): SqlFragment {
  return isFragment(value) ? value : param(value);
}

function quoteIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }

  return `"${value.replaceAll('"', '""')}"`;
}

function shiftPlaceholders(text: string, offset: number): string {
  if (offset === 0) {
    return text;
  }

  return text.replace(/\$(\d+)/g, (_match, value: string) => {
    return `$${Number(value) + offset}`;
  });
}

function normalizeSql(text: string): string {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
