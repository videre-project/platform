/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

/** Formats a Date as the user's local calendar date for API date parameters. */
export function toDateParameter(date: Date): string
export function toDateParameter(date: Date | undefined): string | undefined
export function toDateParameter(date: Date | undefined): string | undefined {
  if (!date) return undefined

  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}
