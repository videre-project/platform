/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type DateLike = string | Date;

export const toUSLocale = (date: DateLike) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "2-digit"
  }).format(new Date(date));


export type TimestampType =
  't' | // 3:35 PM
  'T' | // 3:35:29 PM
  'd' | // 1/2/24
  'D' | // January 16, 2024
  'f' | // January 16, 2024 3:35 PM
  'F' | // Tuesday, January 16, 2024 9:41 PM
  'R';  // 6 minutes ago

export const Timestamp = (date: DateLike, type: TimestampType = 'd'): string =>
  `<t:${Math.floor(new Date(date).getTime() / 1000)}:${type}>`;
