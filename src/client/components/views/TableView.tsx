import { Container } from 'react-bootstrap'
import { ResourceTable } from '../table/ResourceTable'

interface TableViewProps {
  searchValue?: string
  selectedRowsCount?: number
  onSelectedRowsChange?: (count: number) => void
}

export const TableView: React.FC<TableViewProps> = ({
  searchValue,
  selectedRowsCount,
  onSelectedRowsChange
}) => {
  return (
    <Container fluid className="p-0">
      <ResourceTable
        searchValue={searchValue}
        selectedRowsCount={selectedRowsCount}
        onSelectedRowsChange={onSelectedRowsChange}
      />
    </Container>
  )
}