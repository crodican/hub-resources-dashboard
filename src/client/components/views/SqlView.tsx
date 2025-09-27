import { Container, Form } from 'react-bootstrap'

export const SqlView: React.FC = () => {
  return (
    <Container fluid className="p-4">
      <h4 className="mb-3">SQL Query Interface</h4>
      <Form.Group>
        <Form.Label>SQL Query</Form.Label>
        <Form.Control
          as="textarea"
          rows={10}
          placeholder="SELECT * FROM resources..."
          className="font-monospace"
        />
      </Form.Group>
      <div className="mt-3">
        <p className="text-muted">
          Execute custom SQL queries against the resources database.
          This feature will be implemented in Phase 4.
        </p>
      </div>
    </Container>
  )
}