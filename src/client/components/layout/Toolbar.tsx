import { Button, ButtonGroup, Form, InputGroup } from 'react-bootstrap'

interface ToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  onToggleFullscreen: () => void
  selectedRowsCount: number
}

export const Toolbar: React.FC<ToolbarProps> = ({
  searchValue,
  onSearchChange,
  onToggleFullscreen,
  selectedRowsCount
}) => {
  return (
    <div className="d-flex justify-content-between align-items-center p-3 bg-white border-bottom">
      <div className="d-flex align-items-center gap-3">
        <ButtonGroup size="sm">
          <Button variant="outline-secondary">
            <i className="bi bi-funnel me-1"></i>
            Filter
          </Button>
          <Button variant="outline-secondary">
            <i className="bi bi-sort-alpha-down me-1"></i>
            Sort
          </Button>
          <Button variant="outline-secondary">
            <i className="bi bi-collection me-1"></i>
            Group
          </Button>
        </ButtonGroup>

        {selectedRowsCount > 0 && (
          <div className="text-muted">
            {selectedRowsCount} row{selectedRowsCount !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      <div className="d-flex align-items-center gap-3">
        <InputGroup style={{ width: '300px' }}>
          <InputGroup.Text>
            <i className="bi bi-search"></i>
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Search resources..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </InputGroup>

        <Button
          variant="outline-secondary"
          size="sm"
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen (F11)"
        >
          <i className="bi bi-arrows-fullscreen"></i>
        </Button>
      </div>
    </div>
  )
}