/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { and } from './predicates.ts';
import {
  emptyFragment,
  ident,
  join,
  param,
  raw,
  sql,
  toFragment,
} from './fragments.ts';
import type { SqlFragment, SqlValue } from './types.ts';

export class SelectQuery implements SqlFragment {
  private readonly selections: readonly SqlFragment[];
  private readonly fromClause?: SqlFragment;
  private readonly joins: readonly SqlFragment[];
  private readonly whereClause?: SqlFragment;
  private readonly orderByClause?: SqlFragment;
  private readonly limitClause?: SqlFragment;
  private readonly offsetClause?: SqlFragment;

  constructor(
    selections: readonly SqlFragment[],
    fromClause?: SqlFragment,
    joins: readonly SqlFragment[] = [],
    whereClause?: SqlFragment,
    orderByClause?: SqlFragment,
    limitClause?: SqlFragment,
    offsetClause?: SqlFragment,
  ) {
    this.selections = selections;
    this.fromClause = fromClause;
    this.joins = joins;
    this.whereClause = whereClause;
    this.orderByClause = orderByClause;
    this.limitClause = limitClause;
    this.offsetClause = offsetClause;
  }

  get text(): string {
    return this.toFragment().text;
  }

  get values(): readonly SqlValue[] {
    return this.toFragment().values;
  }

  from(table: SqlFragment | string, alias?: string): SelectQuery {
    const tableFragment = alias === undefined
      ? toFragment(table)
      : sql`${toFragment(table)} ${ident(alias)}`;

    return new SelectQuery(
      this.selections,
      tableFragment,
      this.joins,
      this.whereClause,
      this.orderByClause,
      this.limitClause,
      this.offsetClause,
    );
  }

  join(fragment: SqlFragment): SelectQuery {
    return new SelectQuery(
      this.selections,
      this.fromClause,
      [...this.joins, fragment],
      this.whereClause,
      this.orderByClause,
      this.limitClause,
      this.offsetClause,
    );
  }

  where(fragment: SqlFragment): SelectQuery {
    const nextWhere = this.whereClause === undefined
      ? fragment
      : and([this.whereClause, fragment]);

    return new SelectQuery(
      this.selections,
      this.fromClause,
      this.joins,
      nextWhere,
      this.orderByClause,
      this.limitClause,
      this.offsetClause,
    );
  }

  orderBy(fragment: SqlFragment): SelectQuery {
    return new SelectQuery(
      this.selections,
      this.fromClause,
      this.joins,
      this.whereClause,
      fragment,
      this.limitClause,
      this.offsetClause,
    );
  }

  limit(value: number): SelectQuery {
    return new SelectQuery(
      this.selections,
      this.fromClause,
      this.joins,
      this.whereClause,
      this.orderByClause,
      param(value, 'int'),
      this.offsetClause,
    );
  }

  offset(value: number): SelectQuery {
    return new SelectQuery(
      this.selections,
      this.fromClause,
      this.joins,
      this.whereClause,
      this.orderByClause,
      this.limitClause,
      param(value, 'int'),
    );
  }

  private toFragment(): SqlFragment {
    if (this.fromClause === undefined) {
      throw new Error('Select query requires a FROM clause.');
    }

    return sql`
      SELECT ${join(this.selections)}
      FROM ${this.fromClause}
      ${join(this.joins, raw('\n'))}
      WHERE ${this.whereClause ?? raw('TRUE')}
      ${this.orderByClause === undefined ? emptyFragment : sql`ORDER BY ${this.orderByClause}`}
      ${this.limitClause === undefined ? emptyFragment : sql`LIMIT ${this.limitClause}`}
      ${this.offsetClause === undefined ? emptyFragment : sql`OFFSET ${this.offsetClause}`}
    `;
  }
}

export const select = (
  ...selections: readonly (SqlFragment | string)[]
): SelectQuery =>
  new SelectQuery(selections.map(toFragment));
