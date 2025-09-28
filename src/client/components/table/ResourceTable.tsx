import { useMemo, useState, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table'
import { Table, Form, Spinner, Alert, Button } from 'react-bootstrap'
import { useResources } from '../../hooks/useResources'

interface ResourceTableProps {
  searchValue?: string
  selectedRowsCount?: number
  onSelectedRowsChange?: (count: number) => void
}

export const ResourceTable: React.FC<ResourceTableProps> = ({
  searchValue,
  onSelectedRowsChange
}) => {
  const [rowSelection, setRowSelection] = useState({})
  const { data, loading, error, refetch, updateParams } = useResources({
    page: 1,
    limit: 50,
    search: searchValue || ''
  })

  // Update search when searchValue prop changes
  useEffect(() => {
    updateParams({ search: searchValue || '' })
  }, [searchValue, updateParams])

  // Update selected rows count when row selection changes
  useEffect(() => {
    const count = Object.keys(rowSelection).length
    onSelectedRowsChange?.(count)
  }, [rowSelection, onSelectedRowsChange])

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Form.Check
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected()
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <div className="d-flex align-items-center gap-2">
            <Form.Check
              type="checkbox"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
            />
            <i className="bi bi-arrows-angle-expand text-muted" style={{ cursor: 'pointer' }}></i>
            <i className="bi bi-grip-vertical text-muted" style={{ cursor: 'move' }}></i>
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: 'ID',
        header: 'ID',
        size: 60,
      },
      {
        accessorKey: 'Location Name',
        header: 'Location Name',
        size: 200,
      },
      {
        accessorKey: 'Organization',
        header: 'Organization',
        size: 180,
      },
      {
        accessorKey: 'County',
        header: 'County',
        cell: ({ getValue }) => {
          const value = getValue()
          return typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : ''
        },
        size: 120,
      },
      {
        accessorKey: 'Populations Served',
        header: 'Populations Served',
        cell: ({ getValue }) => {
          const value = getValue()
          return typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : ''
        },
        size: 150,
      },
      {
        accessorKey: 'Resource Type',
        header: 'Resource Type',
        cell: ({ getValue }) => {
          const value = getValue()
          return typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : ''
        },
        size: 150,
      },
      {
        accessorKey: 'Phone',
        header: 'Phone',
        size: 120,
      },
      {
        accessorKey: 'City',
        header: 'City',
        size: 100,
      },
      {
        accessorKey: 'State',
        header: 'State',
        size: 60,
      },
      {
        accessorKey: 'Website',
        header: 'Website',
        cell: ({ getValue }) => {
          const url = getValue() as string
          return url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
              <i className="bi bi-link-45deg"></i>
            </a>
          ) : null
        },
        size: 80,
      },
    ],
    []
  )

  const table = useReactTable({
    data: data || [],
    columns,
    state: {
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" className="mb-3" />
          <div>Loading resources...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-3">
        <Alert.Heading>Error Loading Resources</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={refetch}>
          Try Again
        </Button>
      </Alert>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <i className="bi bi-database" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
          <h5 className="mt-3 text-muted">No resources found</h5>
          <p className="text-muted">Try adjusting your search or filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="table-responsive">
      <Table striped hover className="mb-0">
        <thead className="table-dark sticky-top">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="text-nowrap"
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}