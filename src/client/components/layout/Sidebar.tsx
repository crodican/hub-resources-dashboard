import { Nav } from 'react-bootstrap'

interface SidebarProps {
  currentView: 'table' | 'sql'
  onViewChange: (view: 'table' | 'sql') => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  return (
    <div className="bg-light border-end" style={{ width: '200px', minHeight: '100vh' }}>
      <div className="p-3">
        <h6 className="text-muted mb-3">VIEWS</h6>
        <Nav className="flex-column">
          <Nav.Link
            active={currentView === 'table'}
            onClick={() => onViewChange('table')}
            className="d-flex align-items-center py-2"
          >
            <i className="bi bi-table me-2"></i>
            Table View
          </Nav.Link>
          <Nav.Link
            active={currentView === 'sql'}
            onClick={() => onViewChange('sql')}
            className="d-flex align-items-center py-2"
          >
            <i className="bi bi-code-square me-2"></i>
            SQL View
          </Nav.Link>
        </Nav>

        <h6 className="text-muted mb-3 mt-4">TOOLS</h6>
        <Nav className="flex-column">
          <Nav.Link className="d-flex align-items-center py-2">
            <i className="bi bi-funnel me-2"></i>
            Filters
          </Nav.Link>
          <Nav.Link className="d-flex align-items-center py-2">
            <i className="bi bi-download me-2"></i>
            Export
          </Nav.Link>
          <Nav.Link className="d-flex align-items-center py-2">
            <i className="bi bi-upload me-2"></i>
            Import
          </Nav.Link>
        </Nav>
      </div>
    </div>
  )
}