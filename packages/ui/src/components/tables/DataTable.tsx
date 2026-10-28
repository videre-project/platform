/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

import {
  type ColumnDef,
  type ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronRight } from 'lucide-react'
import { type CSSProperties, type ReactNode, Fragment, useEffect, useRef, useState } from 'react'

import { Button } from '../../primitives/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../primitives/Table'
import { cn } from '../../lib/cn'
import { DataTablePagination } from './DataTablePagination'

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  getSubRows?: (row: TData) => TData[] | undefined
  defaultExpanded?: boolean
  onRowHover?: (row: TData) => void
  onRowLeave?: () => void
  onRowClick?: (row: TData) => void
  getRowClassName?: (row: TData) => string
  renderRowDetail?: (row: TData) => ReactNode
  activeRowId?: string | null
  activeRowScrollKey?: number
  getRowId?: (row: TData) => string
  onPageRowsChange?: (rows: TData[]) => void
  pageSize?: number
  manualPagination?: boolean
  autoResetPageIndex?: boolean
  containerClassName?: string
  tableContainerClassName?: string
  bodyWrapperClassName?: string
  className?: string
  wrapperClassName?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  getSubRows,
  defaultExpanded = true,
  onRowHover,
  onRowLeave,
  onRowClick,
  getRowClassName,
  renderRowDetail,
  activeRowId,
  activeRowScrollKey,
  getRowId,
  onPageRowsChange,
  pageSize,
  manualPagination = false,
  autoResetPageIndex,
  containerClassName,
  tableContainerClassName,
  bodyWrapperClassName,
  className,
  wrapperClassName,
}: DataTableProps<TData, TValue>) {
  const [expanded, setExpanded] = useState<ExpandedState>(defaultExpanded ? true : {})
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>())
  const [bodyScrollSize, setBodyScrollSize] = useState({ width: 0, scrollbarWidth: 0 })
  const lastScrolledSelectionRef = useRef<{ id: string; key: number | undefined } | null>(null)
  const lastNavigatedSelectionRef = useRef<{ id: string | null; key: number | undefined } | null>(
    null,
  )

  const table = useReactTable({
    data,
    columns,
    getRowId,
    ...(pageSize ? { initialState: { pagination: { pageSize } } } : {}),
    state: { expanded },
    onExpandedChange: setExpanded,
    autoResetPageIndex,
    manualPagination,
    // Server pages expand all children; client pages slice parents before expanding.
    paginateExpandedRows: manualPagination,
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getSubRows ? getExpandedRowModel() : undefined,
    getPaginationRowModel: getPaginationRowModel(),
  })
  const paginationRows = table.getPaginationRowModel().rows
  const visibleColumns = table.getVisibleLeafColumns()
  // TanStack supplies default minima; only opt in when a host declares them.
  const minimumTableWidth = columns.some(column => column.minSize != null)
    ? visibleColumns.reduce((width, column) => width + Math.max(
        column.columnDef.minSize ?? 0,
        column.columnDef.size ?? column.columnDef.minSize ?? 150,
      ), 0)
    : undefined
  const previousPageRowsRef = useRef<TData[]>([])
  const onPageRowsChangeRef = useRef(onPageRowsChange)

  useEffect(() => {
    onPageRowsChangeRef.current = onPageRowsChange
  }, [onPageRowsChange])

  useEffect(() => {
    if (!onPageRowsChangeRef.current) return

    const rows = paginationRows.map(row => row.original)
    const previousRows = previousPageRowsRef.current
    const unchanged =
      rows.length === previousRows.length &&
      rows.every((row, index) => Object.is(row, previousRows[index]))
    if (unchanged) return

    previousPageRowsRef.current = rows
    onPageRowsChangeRef.current(rows)
  }, [paginationRows])

  useEffect(() => {
    if (!bodyWrapperClassName) return

    const element = bodyScrollRef.current
    if (!element) return

    const updateSize = () => {
      setBodyScrollSize({
        width: element.clientWidth,
        scrollbarWidth: Math.max(0, element.offsetWidth - element.clientWidth),
      })
    }

    updateSize()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [bodyWrapperClassName])

  useEffect(() => {
    if (!activeRowId || !getRowId) {
      lastNavigatedSelectionRef.current = null
      return
    }
    const last = lastNavigatedSelectionRef.current
    if (last && last.id === activeRowId && last.key === activeRowScrollKey) return
    const index = data.findIndex(d => getRowId(d) === activeRowId)
    if (index === -1) return
    lastNavigatedSelectionRef.current = { id: activeRowId, key: activeRowScrollKey }
    const currentPageSize = table.getState().pagination.pageSize
    const targetPage = Math.floor(index / currentPageSize)
    if (targetPage !== table.getState().pagination.pageIndex) {
      table.setPageIndex(targetPage)
    }
  }, [activeRowId, activeRowScrollKey, getRowId, data, table])

  useEffect(() => {
    if (!activeRowId || !bodyWrapperClassName) {
      lastScrolledSelectionRef.current = null
      return
    }
    const last = lastScrolledSelectionRef.current
    if (last && last.id === activeRowId && last.key === activeRowScrollKey) return

    const container = bodyScrollRef.current
    const row = rowRefs.current.get(activeRowId)
    if (!container || !row) return

    // Data refreshes must preserve manual scrolling. Only a new selection or
    // an explicit scroll request should bring the active row into view.
    lastScrolledSelectionRef.current = { id: activeRowId, key: activeRowScrollKey }
    const containerRect = container.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const isVisible = rowRect.top >= containerRect.top && rowRect.bottom <= containerRect.bottom

    if (!isVisible) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeRowId, activeRowScrollKey, bodyWrapperClassName, paginationRows])

  const renderHeader = () => (
    <TableHeader>
      {table.getHeaderGroups().map(headerGroup => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map(header => {
            const size = minimumTableWidth == null ? header.column.columnDef.size
              : Math.max(header.column.columnDef.size ?? 0, header.column.columnDef.minSize ?? 0)
            return (
              <TableHead key={header.id}
                className={getSubRows && header.index === 0 ? 'pl-[2.625rem]' : undefined}
                style={size ? { width: size } : undefined}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            )
          })}
        </TableRow>
      ))}
    </TableHeader>
  )

  const renderBody = () => (
    <TableBody>
      {paginationRows.length ? (
        paginationRows.map(row => {
          const rowDomId = getRowId?.(row.original)
          const detail = renderRowDetail?.(row.original)

          return (
            <Fragment key={row.id}>
              <TableRow
                ref={element => {
                  if (!rowDomId) return
                  if (element) rowRefs.current.set(rowDomId, element)
                  else rowRefs.current.delete(rowDomId)
                }}
                data-state={row.getIsSelected() && 'selected'}
                className={cn(
                  row.depth > 0 && 'bg-muted/30',
                  onRowClick && 'cursor-pointer',
                  getRowClassName?.(row.original),
                )}
                onMouseEnter={() => onRowHover?.(row.original)}
                onMouseLeave={() => onRowLeave?.()}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell, cellIndex) => {
                  const size = minimumTableWidth == null ? cell.column.columnDef.size
                    : Math.max(cell.column.columnDef.size ?? 0, cell.column.columnDef.minSize ?? 0)
                  return (
                    <TableCell
                      key={cell.id}
                      className={cellIndex === 0 && getSubRows
                        ? cn('relative', row.getCanExpand() ? 'pl-0.5' : 'pl-[2.625rem]')
                        : undefined}
                      style={size ? { width: size } : undefined}
                    >
                      {cellIndex === 0 && (row.depth > 0 || row.getCanExpand() && row.getIsExpanded()) && (
                        <span aria-hidden="true" className={cn(
                          'pointer-events-none absolute -bottom-px left-0.5 flex w-8 justify-center',
                          row.depth > 0 ? '-top-px' : 'top-9',
                          row.depth > 0 && row.getParentRow()?.subRows.at(-1)?.id === row.id && 'bottom-2',
                        )}>
                          <span className="data-table-group-guide w-0.5" />
                        </span>
                      )}
                      {cellIndex === 0 && row.getCanExpand() ? (
                        <span className="flex min-w-0 items-start gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={event => {
                              event.stopPropagation()
                              row.toggleExpanded()
                            }}
                            className="-my-1.5 h-8 w-8 shrink-0 cursor-pointer text-muted-foreground"
                            aria-label={row.getIsExpanded() ? 'Collapse row' : 'Expand row'}
                            aria-expanded={row.getIsExpanded()}
                          >
                            <ChevronRight
                              className={`h-4 w-4 transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`}
                            />
                          </Button>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </span>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
              {detail != null && <TableRow className="hover:bg-transparent">
                <TableCell colSpan={row.getVisibleCells().length} style={{ padding: 0 }}>
                  <div className="sticky left-0 min-w-0 whitespace-normal" style={{ width: bodyScrollSize.width || undefined }}>
                    {detail}
                  </div>
                </TableCell>
              </TableRow>}
            </Fragment>
          )
        })
      ) : (
        <TableRow>
          <TableCell colSpan={columns.length} className="h-24 text-center">
            No results.
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  )

  const bodyScrollStyle: CSSProperties = {
    scrollbarGutter: 'stable',
    ...(bodyScrollSize.scrollbarWidth > 0 ? { marginRight: -bodyScrollSize.scrollbarWidth } : {}),
  }
  const tableStyle: CSSProperties = {
    minWidth: minimumTableWidth,
    ...(bodyScrollSize.width > 0 ? { width: bodyScrollSize.width } : {}),
  }

  return (
    <div className={cn('min-w-0 space-y-2', containerClassName)}>
      <div className={cn('min-w-0 rounded-md', tableContainerClassName)}>
        {bodyWrapperClassName ? (
          <>
            <div ref={headerScrollRef} className="shrink-0 overflow-hidden">
              <Table className={cn('table-fixed', className)} wrapperClassName="overflow-visible" style={tableStyle}>
                {renderHeader()}
              </Table>
            </div>
            <div ref={bodyScrollRef} className={cn('data-table-scroll', bodyWrapperClassName)} style={bodyScrollStyle}
              role="region" aria-label="Scrollable table rows" tabIndex={0}
              onScroll={event => {
                if (headerScrollRef.current) headerScrollRef.current.scrollLeft = event.currentTarget.scrollLeft
              }}>
              <Table
                className={cn('table-fixed', className)}
                wrapperClassName="overflow-visible"
                style={tableStyle}
              >
                {renderBody()}
              </Table>
            </div>
          </>
        ) : (
          <Table className={cn('table-fixed', className)} wrapperClassName={cn('data-table-scroll', wrapperClassName)} style={tableStyle}>
            {renderHeader()}
            {renderBody()}
          </Table>
        )}
      </div>
      {!manualPagination && <DataTablePagination table={table} />}
    </div>
  )
}
