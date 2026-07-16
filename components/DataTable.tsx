"use client"

import type { ReactNode } from "react"

import { type ColumnDef, type OnChangeFn, type RowData, type SortingState, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, ChevronsUpDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface DataTableProps<TData extends RowData> {
    columns: ColumnDef<TData>[]
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

export function DataTable<TData extends RowData>({
    columns,
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
    const pageCount = Math.max(1, Math.ceil(total / pageSize))

    // TanStack Table 返回的实例方法无法由 React Compiler 安全记忆化。
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        columns,
        data,
        getCoreRowModel: getCoreRowModel(),
        getRowId,
        manualPagination: true,
        manualSorting: true,
        onSortingChange,
        pageCount,
        state: {
            pagination: {
                pageIndex: pageNum - 1,
                pageSize,
            },
            sorting,
        },
    })

    function onPageSizeChange(value: string | null) {
        if (!value) return
        onPageChange(1, Number(value))
    }

    return (
        <div className="space-y-3">
            <div className="bg-card overflow-hidden rounded-2xl border">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map(headerGroup => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map(header => {
                                        const sorted = header.column.getIsSorted()

                                        return (
                                            <TableHead key={header.id} className="h-11 text-center whitespace-nowrap">
                                                {header.isPlaceholder ? null : header.column.getCanSort() ? (
                                                    <Button className="mx-auto h-8 px-2" variant="ghost" onClick={header.column.getToggleSortingHandler()}>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                        {sorted === "asc" ? <ArrowUpIcon /> : sorted === "desc" ? <ArrowDownIcon /> : <ChevronsUpDownIcon />}
                                                    </Button>
                                                ) : (
                                                    flexRender(header.column.columnDef.header, header.getContext())
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
                                        {columns.map((column, columnIndex) => (
                                            <TableCell key={column.id ?? columnIndex} className="text-center">
                                                <Skeleton className="h-5 w-full min-w-16" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map(row => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map(cell => (
                                            <TableCell key={cell.id} className="text-center whitespace-nowrap [&>div]:justify-center">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell className="text-muted-foreground h-32 text-center" colSpan={columns.length}>
                                        {emptyContent}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <div className="text-muted-foreground flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>共 {total} 条</div>
                <div className="flex flex-wrap items-center gap-2">
                    <span>每页</span>
                    <Select value={`${pageSize}`} onValueChange={onPageSizeChange}>
                        <SelectTrigger className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                    <Button variant="outline" size="icon-sm" disabled={pageNum <= 1 || loading} onClick={() => onPageChange(1, pageSize)}>
                        <ChevronsLeftIcon />
                        <span className="sr-only">第一页</span>
                    </Button>
                    <Button variant="outline" size="icon-sm" disabled={pageNum <= 1 || loading} onClick={() => onPageChange(pageNum - 1, pageSize)}>
                        <ChevronLeftIcon />
                        <span className="sr-only">上一页</span>
                    </Button>
                    <Button variant="outline" size="icon-sm" disabled={pageNum >= pageCount || loading} onClick={() => onPageChange(pageNum + 1, pageSize)}>
                        <ChevronRightIcon />
                        <span className="sr-only">下一页</span>
                    </Button>
                    <Button variant="outline" size="icon-sm" disabled={pageNum >= pageCount || loading} onClick={() => onPageChange(pageCount, pageSize)}>
                        <ChevronsRightIcon />
                        <span className="sr-only">最后一页</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
