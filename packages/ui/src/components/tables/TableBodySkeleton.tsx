/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import { Skeleton } from '../../primitives/Skeleton'
import { TableCell, TableRow } from '../../primitives/Table'

export type TableBodySkeletonProps = {
  rows?: number
  columns?: number
}

/** Loading placeholder rows for shared data tables. */
export function TableBodySkeleton({ rows = 10, columns = 8 }: TableBodySkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton
                className="h-4"
                style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
