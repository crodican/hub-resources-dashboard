import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table'
import { Table, Form } from 'react-bootstrap'
import { ResourceData } from '../../types/resource'

const mockData: ResourceData[] = [
  {
    ID: 1,
    'Location Name': 'Community Health Center',
    Organization: 'Health Services Inc',
    County: ['Philadelphia'],
    'Populations Served': ['Adults', 'Seniors'],
    'Resource Types': ['Healthcare', 'Mental Health'],
    Categories: ['Primary Care'],
    'More Info': 'Comprehensive health services',
    Phone: '(215) 555-0123',
    Address: '123 Main St',
    City: 'Philadelphia',
    State: 'PA',
    Zip: '19101',
    Website: 'https://example.com',
    Image: '',
    Latitude: 39.9526,
    Longitude: -75.1652,
    'Full Address': '123 Main St, Philadelphia, PA 19101',
    'Phone URL': 'tel:+12155550123',
    'Google Maps URL': 'https://maps.google.com/?q=39.9526,-75.1652'
  },
  {
    ID: 2,
    'Location Name': 'Recovery Support Center',
    Organization: 'Hope Foundation',
    County: ['Montgomery'],
    'Populations Served': ['Adults', 'Youth'],
    'Resource Types': ['Substance Abuse', 'Counseling'],
    Categories: ['Outpatient Treatment'],
    'More Info': 'Addiction recovery services',
    Phone: '(610) 555-0456',
    Address: '456 Oak Ave',
    City: 'Norristown',
    State: 'PA',
    Zip: '19401',
    Website: 'https://recovery.example.com',
    Image: '',
    Latitude: 40.1217,
    Longitude: -75.3399,
    'Full Address': '456 Oak Ave, Norristown, PA 19401',
    'Phone URL': 'tel:+16105550456',
    'Google Maps URL': 'https://maps.google.com/?q=40.1217,-75.3399'
  }
]

export const ResourceTable: React.FC = () => {
  const [rowSelection, setRowSelection] = useState({})

  const columns = useMemo<ColumnDef<ResourceData>[]>(
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
        cell: ({ getValue }) => (getValue() as string[]).join(', '),
        size: 120,
      },
      {
        accessorKey: 'Populations Served',
        header: 'Populations Served',
        cell: ({ getValue }) => (getValue() as string[]).join(', '),
        size: 150,
      },
      {
        accessorKey: 'Resource Types',
        header: 'Resource Types',
        cell: ({ getValue }) => (getValue() as string[]).join(', '),
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
    ],
    []
  )

  const table = useReactTable({
    data: mockData,
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