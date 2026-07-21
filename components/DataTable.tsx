"use client"

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react"

import {
    type Column,
    type ColumnDef,
    type ColumnPinningState,
    type ColumnSizingState,
    type OnChangeFn,
    type RowData,
    type SortingState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, ChevronsUpDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { getDataTableColumnSizingStorageKey, parseDataTableColumnSizing } from "@/utils/dataTableColumnSizing"
import { cn } from "@/utils/shadcn"

const DataTableColumnPinningMinWidth = 960
const DataTableColumnResizingMinWidth = 768
const DataTableFinePointerMediaQuery = "(hover: hover) and (pointer: fine)"

export interface DataTableProps<TData extends RowData> {
    columns: ColumnDef<TData>[]
    columnPinning?: ColumnPinningState
    columnSizingKey: string
    data?: TData[]
    emptyContent?: ReactNode
    loading?: boolean
    pageNum: number
    pageSize: number
    sorting: SortingState
    total?: number
    getRowId?: (row: TData) => string
    onPageChange: (pageNum: number, pageSize: number) => void
    onSortingChange: OnChangeFn<SortingState>
}

function getTableColumnStyle<TData extends RowData>(column: Column<TData>): CSSProperties {
    const pinnedPosition = column.getIsPinned()
    const size = `${column.getSize()}px`

    return {
        boxSizing: "border-box",
        left: pinnedPosition === "left" ? `${column.getStart("left")}px` : undefined,
        maxWidth: size,
        minWidth: size,
        position: pinnedPosition ? "sticky" : undefined,
        right: pinnedPosition === "right" ? `${column.getAfter("right")}px` : undefined,
        width: size,
        zIndex: pinnedPosition ? 1 : undefined,
    }
}

function getStoredColumnSizing(storageKey: string) {
    try {
        return parseDataTableColumnSizing(window.localStorage.getItem(storageKey))
    } catch {
        return {}
    }
}

function useDataTableInteractionCapabilities() {
    const tableViewportRef = useRef<HTMLDivElement>(null)
    const [tableViewportWidth, setTableViewportWidth] = useState(0)
    const [hasFinePointer, setHasFinePointer] = useState(false)

    useEffect(() => {
        const mediaQuery = window.matchMedia(DataTableFinePointerMediaQuery)

        function onChange() {
            setHasFinePointer(mediaQuery.matches)
        }

        mediaQuery.addEventListener("change", onChange)
        onChange()
        return () => mediaQuery.removeEventListener("change", onChange)
    }, [])

    useEffect(() => {
        const tableViewport = tableViewportRef.current
        if (!tableViewport) return

        const observer = new ResizeObserver(entries => {
            setTableViewportWidth(entries[0]?.contentRect.width ?? 0)
        })

        observer.observe(tableViewport)
        return () => observer.disconnect()
    }, [])

    // 使用表格实际宽度，避免桌面侧边栏挤压后仍错误启用固定列与拖动。
    return {
        enableColumnPinning: tableViewportWidth >= DataTableColumnPinningMinWidth,
        enableColumnResizing: hasFinePointer && tableViewportWidth >= DataTableColumnResizingMinWidth,
        tableViewportRef,
    }
}

function getPinnedColumnClassName<TData extends RowData>(column: Column<TData>) {
    const pinnedPosition = column.getIsPinned()

    return cn(
        pinnedPosition && "bg-card",
        pinnedPosition === "left" &&
            column.getIsLastColumn("left") &&
            "after:bg-border after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-px after:content-['']",
        pinnedPosition === "right" &&
            column.getIsFirstColumn("right") &&
            "before:bg-border before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-px before:content-['']",
    )
}

export function DataTable<TData extends RowData>({
    columns,
    columnPinning = {},
    columnSizingKey,
    data = [],
    emptyContent = "暂无数据",
    loading = false,
    pageNum,
    pageSize,
    sorting,
    total = 0,
    getRowId,
    onPageChange,
    onSortingChange,
}: DataTableProps<TData>) {
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
    const [loadedColumnSizingStorageKey, setLoadedColumnSizingStorageKey] = useState<string>()
    const { enableColumnPinning, enableColumnResizing, tableViewportRef } = useDataTableInteractionCapabilities()
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const columnSizingStorageKey = getDataTableColumnSizingStorageKey(columnSizingKey)

    // TanStack Table 返回的实例方法无法由 React Compiler 安全记忆化。
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        columns,
        data,
        defaultColumn: {
            enableSorting: false,
            maxSize: 640,
            minSize: 72,
        },
        columnResizeMode: "onChange",
        enableColumnResizing,
        getCoreRowModel: getCoreRowModel(),
        getRowId,
        manualPagination: true,
        manualSorting: true,
        onColumnSizingChange: setColumnSizing,
        onSortingChange,
        pageCount,
        state: {
            columnPinning: enableColumnPinning ? columnPinning : {},
            columnSizing: enableColumnResizing ? columnSizing : {},
            pagination: {
                pageIndex: pageNum - 1,
                pageSize,
            },
            sorting,
        },
    })

    useEffect(() => {
        if (!enableColumnResizing) return

        setColumnSizing(getStoredColumnSizing(columnSizingStorageKey))
        setLoadedColumnSizingStorageKey(columnSizingStorageKey)
    }, [columnSizingStorageKey, enableColumnResizing])

    useEffect(() => {
        if (!enableColumnResizing || loadedColumnSizingStorageKey !== columnSizingStorageKey) return

        const timeout = window.setTimeout(() => {
            try {
                window.localStorage.setItem(columnSizingStorageKey, JSON.stringify(columnSizing))
            } catch {
                // 本地存储不可用时，当前会话内的列宽调整仍然有效。
            }
        }, 150)

        return () => window.clearTimeout(timeout)
    }, [columnSizing, columnSizingStorageKey, enableColumnResizing, loadedColumnSizingStorageKey])

    function onPageSizeChange(value: string | null) {
        if (!value) return
        onPageChange(1, Number(value))
    }

    return (
        <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border bg-card">
                <div ref={tableViewportRef} className="overflow-x-auto">
                    <Table className="table-fixed" style={{ minWidth: "100%", width: `${table.getTotalSize()}px` }}>
                        <TableHeader>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        const sorted = header.column.getIsSorted()

                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={cn("relative h-11 whitespace-nowrap text-center", getPinnedColumnClassName(header.column))}
                                                style={{ ...getTableColumnStyle(header.column), zIndex: header.column.getIsPinned() ? 2 : undefined }}
                                            >
                                                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                                    <Button className="mx-auto h-8 px-2" variant="ghost" onClick={header.column.getToggleSortingHandler()}>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                        {sorted === "asc" ? <ArrowUpIcon /> : sorted === "desc" ? <ArrowDownIcon /> : <ChevronsUpDownIcon />}
                                                    </Button>
                                                ) : (
                                                    flexRender(header.column.columnDef.header, header.getContext())
                                                )}
                                                {header.column.getCanResize() && (
                                                    <button
                                                        className={cn(
                                                            "absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none select-none after:absolute after:inset-y-2 after:right-0 after:w-px after:bg-transparent after:transition-colors hover:after:bg-current",
                                                            header.column.getIsResizing() && "text-primary after:bg-current",
                                                        )}
                                                        type="button"
                                                        aria-label={`调整 ${header.column.id} 列宽`}
                                                        title="拖动调整列宽，双击恢复默认宽度"
                                                        onDoubleClick={() => header.column.resetSize()}
                                                        onMouseDown={header.getResizeHandler()}
                                                        onTouchStart={header.getResizeHandler()}
                                                    />
                                                )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: Math.min(pageSize, 10) }, (_, index) => (
                                    <TableRow key={index}>
                                        {table.getVisibleLeafColumns().map(column => (
                                            <TableCell
                                                key={column.id}
                                                className={cn("text-center", getPinnedColumnClassName(column))}
                                                style={getTableColumnStyle(column)}
                                            >
                                                <Skeleton className="h-5 w-full min-w-16" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell
                                                key={cell.id}
                                                className={cn("truncate text-center [&>div]:justify-center", getPinnedColumnClassName(cell.column))}
                                                style={getTableColumnStyle(cell.column)}
                                            >
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell className="h-32 text-center text-muted-foreground" colSpan={columns.length}>
                                        {emptyContent}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <div>共 {total} 条</div>
                <div className="flex flex-wrap items-center gap-2">
                    <span>每页</span>
                    <Select value={`${pageSize}`} onValueChange={onPageSizeChange}>
                        <SelectTrigger className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-border/60 bg-popover/95 backdrop-blur-md">
                            {[10, 20, 50, 100].map(size => (
                                <SelectItem key={size} value={`${size}`}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span>
                        第 {pageNum} / {pageCount} 页
                    </span>
                    <Button className="h-7 w-7" variant="outline" size="icon" disabled={pageNum <= 1 || loading} onClick={() => onPageChange(1, pageSize)}>
                        <ChevronsLeftIcon />
                        <span className="sr-only">第一页</span>
                    </Button>
                    <Button
                        className="h-7 w-7"
                        variant="outline"
                        size="icon"
                        disabled={pageNum <= 1 || loading}
                        onClick={() => onPageChange(pageNum - 1, pageSize)}
                    >
                        <ChevronLeftIcon />
                        <span className="sr-only">上一页</span>
                    </Button>
                    <Button
                        className="h-7 w-7"
                        variant="outline"
                        size="icon"
                        disabled={pageNum >= pageCount || loading}
                        onClick={() => onPageChange(pageNum + 1, pageSize)}
                    >
                        <ChevronRightIcon />
                        <span className="sr-only">下一页</span>
                    </Button>
                    <Button
                        className="h-7 w-7"
                        variant="outline"
                        size="icon"
                        disabled={pageNum >= pageCount || loading}
                        onClick={() => onPageChange(pageCount, pageSize)}
                    >
                        <ChevronsRightIcon />
                        <span className="sr-only">最后一页</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
