import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  getFilteredRowModel,
  ColumnFiltersState,
  RowSelectionState,
} from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'

interface ServerPagination {
  page: number
  perPage: number
  total: number
  lastPage: number
  onPageChange: (page: number) => void
}

interface ServerSearch {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  customFilters?: React.ReactNode
  getRowId?: (row: TData) => string
  onRowClick?: (row: TData) => void
  serverPagination?: ServerPagination
  serverSearch?: ServerSearch
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  customFilters,
  getRowId,
  onRowClick,
  serverPagination,
  serverSearch,
}: DataTableProps<TData, TValue>) {
  const { t } = useI18n()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const isServerDriven = !!serverPagination

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(isServerDriven
      ? { manualPagination: true, pageCount: serverPagination!.lastPage }
      : { getPaginationRowModel: getPaginationRowModel() }),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    getRowId,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  })

  const showSearch = !!serverSearch || !!searchKey
  const placeholder =
    serverSearch?.placeholder ?? searchPlaceholder ?? `${t('common.search')}...`

  return (
    <div className="space-y-4">
      {(showSearch || customFilters) && (
        <div className="flex items-center gap-4">
          {serverSearch ? (
            <Input
              placeholder={placeholder}
              value={serverSearch.value}
              onChange={(event) => serverSearch.onChange(event.target.value)}
              className="max-w-sm"
            />
          ) : searchKey ? (
            <Input
              placeholder={placeholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
              className="max-w-sm"
            />
          ) : null}
          {customFilters}
        </div>
      )}
      {table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {t('common.table.selected_count', {
            count: table.getFilteredSelectedRowModel().rows.length,
          })}
        </div>
      )}
      <div className="rounded-md border border-border/80">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('common.table.no_results')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {serverPagination ? (
        <ServerPaginationFooter pagination={serverPagination} />
      ) : (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t('common.table.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t('common.table.next')}
          </Button>
        </div>
      )}
    </div>
  )
}

function ServerPaginationFooter({ pagination }: { pagination: ServerPagination }) {
  const { t } = useI18n()
  const { page, perPage, total, lastPage, onPageChange } = pagination
  const from = total === 0 ? 0 : Math.min((page - 1) * perPage + 1, total)
  const to = Math.min(page * perPage, total)

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {t('common.table.showing_range', { from, to, total })}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          {t('common.table.previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage}
        >
          {t('common.table.next')}
        </Button>
      </div>
    </div>
  )
}
