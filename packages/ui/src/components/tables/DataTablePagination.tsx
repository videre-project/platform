/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import type { Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { type ReactNode, useRef } from 'react'

import { Button } from '../../primitives/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/Select'

export type ControlledDataTablePagination = {
  pageIndex: number
  pageSize: number
  pageCount: number | null
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPageIndexChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
}

export type DataTablePaginationProps<TData> = {
  table?: Table<TData>
  pagination?: ControlledDataTablePagination
  summary?: ReactNode
  disabled?: boolean
}

export function DataTablePagination<TData>({
  table,
  pagination,
  summary,
  disabled = false,
}: DataTablePaginationProps<TData>) {
  const tablePagination = table?.getState().pagination
  const pageIndex = pagination?.pageIndex ?? tablePagination?.pageIndex ?? 0
  const pageSize = pagination?.pageSize ?? tablePagination?.pageSize ?? 10
  const initialPageSize = useRef(pageSize).current
  const pageCount = pagination ? pagination.pageCount : table?.getPageCount() ?? 1
  const hasPreviousPage = !disabled && (pagination?.hasPreviousPage ?? table?.getCanPreviousPage() ?? false)
  const hasNextPage = !disabled && (pagination?.hasNextPage ?? table?.getCanNextPage() ?? false)
  const setPageIndex = (nextPageIndex: number) => {
    if (pagination) pagination.onPageIndexChange(nextPageIndex)
    else table?.setPageIndex(nextPageIndex)
  }
  const setPageSize = (nextPageSize: number) => {
    if (pagination) pagination.onPageSizeChange(nextPageSize)
    else table?.setPageSize(nextPageSize)
  }

  return (
    <div className="data-table-pagination-container min-w-0 shrink-0">
      <div
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-2"
        data-slot="data-table-pagination"
      >
        <div
          className="col-start-1 row-start-1 text-sm text-muted-foreground"
          data-slot="data-table-pagination-summary"
        >
          {summary ?? (table ? <>
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </> : null)}
        </div>
        <div className="data-table-pagination-controls contents">
          <div
            className="col-start-1 row-start-2 flex flex-wrap items-center gap-2 whitespace-nowrap"
            data-slot="data-table-pagination-page-size"
          >
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pageSize}`}
              onValueChange={value => setPageSize(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[...new Set([10, 20, 30, 40, 50, initialPageSize, pageSize])].sort((a, b) => a - b).map(size => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className="col-start-2 row-start-1 flex w-auto items-center justify-end whitespace-nowrap text-sm font-medium"
            data-slot="data-table-pagination-page"
          >
            Page {pageIndex + 1}{pageCount == null ? '' : ` of ${pageCount}`}
          </div>
          <div
            className="col-start-2 row-start-2 flex items-center justify-end space-x-2"
            data-slot="data-table-pagination-buttons"
          >
            <Button
              variant="outline"
              className="data-table-pagination-boundary h-8 w-8 p-0"
              onClick={() => setPageIndex(0)}
              disabled={!hasPreviousPage}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
              disabled={!hasPreviousPage}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => setPageIndex(pageIndex + 1)}
              disabled={!hasNextPage}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              className="data-table-pagination-boundary h-8 w-8 p-0"
              onClick={() => pageCount != null && setPageIndex(Math.max(0, pageCount - 1))}
              disabled={!hasNextPage || pageCount == null}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
