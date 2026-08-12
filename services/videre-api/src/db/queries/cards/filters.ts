/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { raw, sql, type SqlFragment } from '@videreproject/sql-builder';
import { CARD_COLORS } from '@videreproject/constants';
import { table } from '@videreproject/sql-schema';

const cards = table('cards', 'c');

export function colorPredicate(
  column: SqlFragment,
  value: string | null | undefined,
  operator: string | null | undefined,
  defaultOperator: '<=' | '>='
): SqlFragment | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalizedOperator = normalizeColorOperator(operator, defaultOperator);
  if (normalizedOperator === null) {
    return raw('FALSE');
  }
  const parsed = parseColorFilter(value);

  switch (normalizedOperator) {
    case '=':
      return sql`${column} = ${parsed.mask}`;
    case '<=':
      return sql`(${column} | ${parsed.mask}) = ${parsed.mask}`;
    default:
      return sql`(
        (${parsed.mask} > 0 AND (${column} & ${parsed.mask}) = ${parsed.mask})
        OR (${parsed.mask} = 0 AND ${parsed.hasColorless} AND ${column} = 0)
      )`;
  }
}

export function comparisonPredicate(
  left: SqlFragment,
  value: number | string | null | undefined,
  operator?: string | null,
  cast?: 'date' | 'int' | 'numeric'
): SqlFragment | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalizedOperator = normalizeComparisonOperator(operator);
  if (normalizedOperator === null) {
    return raw('FALSE');
  }

  const right = cast === undefined
    ? sql`${value}`
    : sql`${value}::${raw(cast)}`;

  return sql`${left} ${raw(normalizedOperator)} ${right}`;
}

export function rarityPredicate(
  value?: string | null,
  operator?: string | null
): SqlFragment | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalizedOperator = normalizeComparisonOperator(operator);
  if (normalizedOperator === null) {
    return raw('FALSE');
  }

  if (normalizedOperator === '=') {
    return sql`lower(${cards.column('rarity')}) = lower(${value})`;
  }

  return sql`
    lower(${cards.column('rarity')}) = ANY (
      SELECT rarity_name
      FROM card_rarity_constants()
      WHERE rarity_rank ${raw(normalizedOperator)} (
        SELECT rarity_rank
        FROM card_rarity_constants()
        WHERE rarity_name = lower(${value})
      )
    )
  `;
}

export function booleanPredicate(left: SqlFragment, value?: boolean | null): SqlFragment | null {
  return value === undefined || value === null
    ? null
    : sql`${left} = ${value}`;
}

function normalizeColorOperator(
  value: string | null | undefined,
  defaultOperator: '<=' | '>='
): '=' | '<=' | '>=' | null {
  switch (String(value ?? defaultOperator).toLowerCase()) {
    case '=':
    case '<=':
    case '>=':
      return String(value ?? defaultOperator).toLowerCase() as '=' | '<=' | '>=';
    default:
      return null;
  }
}

function parseColorFilter(value: string): {
  readonly mask: number,
  readonly hasColorless: boolean
} {
  const rawValue = value.trim().toUpperCase();
  const hasNamedColor = CARD_COLORS.some((color) => colorNamePattern(color.name).test(rawValue));
  const hasNamedColorless = colorNamePattern('COLORLESS').test(rawValue);
  const letters = hasNamedColor || hasNamedColorless
    ? ''
    : rawValue.replace(/[^WUBRG]/g, '');

  const mask = CARD_COLORS.reduce((currentMask, color) => {
    return colorNamePattern(color.name).test(rawValue) || letters.includes(color.symbol)
      ? currentMask | color.bit
      : currentMask;
  }, 0);

  return {
    mask,
    hasColorless: hasNamedColorless || (
      !hasNamedColor
      && !hasNamedColorless
      && rawValue.replace(/[^C]/g, '') !== ''
    ),
  };
}

function colorNamePattern(name: string): RegExp {
  return new RegExp(`(^|[^A-Z])${name}([^A-Z]|$)`);
}

function normalizeComparisonOperator(value?: string | null): '=' | '<' | '<=' | '>' | '>=' | null {
  switch (String(value ?? '=').toLowerCase()) {
    case '=':
    case '<':
    case '<=':
    case '>':
    case '>=':
      return String(value ?? '=').toLowerCase() as '=' | '<' | '<=' | '>' | '>=';
    default:
      return null;
  }
}
