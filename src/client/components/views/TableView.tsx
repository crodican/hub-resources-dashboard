import { Container } from 'react-bootstrap'
import { ResourceTable } from '../table/ResourceTable'

export const TableView: React.FC = () => {
  return (
    <Container fluid className="p-0">
      <ResourceTable />
    </Container>
  )
}