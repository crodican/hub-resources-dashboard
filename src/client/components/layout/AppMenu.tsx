import { Navbar, Nav, NavDropdown } from 'react-bootstrap'

interface AppMenuProps {
  onToggleFullscreen: () => void
  isFullscreen: boolean
}

export const AppMenu: React.FC<AppMenuProps> = ({ onToggleFullscreen, isFullscreen }) => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="border-bottom">
      <Nav className="me-auto">
        <NavDropdown title="File" id="file-dropdown">
          <NavDropdown.Item>New</NavDropdown.Item>
          <NavDropdown.Item>Open</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item>Import CSV</NavDropdown.Item>
          <NavDropdown.Item>Export CSV</NavDropdown.Item>
        </NavDropdown>

        <NavDropdown title="Edit" id="edit-dropdown">
          <NavDropdown.Item>Cut</NavDropdown.Item>
          <NavDropdown.Item>Copy</NavDropdown.Item>
          <NavDropdown.Item>Paste</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item>Select All</NavDropdown.Item>
        </NavDropdown>

        <NavDropdown title="View" id="view-dropdown">
          <NavDropdown.Item onClick={onToggleFullscreen}>
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} (F11)
          </NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item>Show Sidebar</NavDropdown.Item>
          <NavDropdown.Item>Show Toolbar</NavDropdown.Item>
        </NavDropdown>

        <NavDropdown title="Help" id="help-dropdown">
          <NavDropdown.Item>About</NavDropdown.Item>
          <NavDropdown.Item>Keyboard Shortcuts</NavDropdown.Item>
        </NavDropdown>
      </Nav>
    </Navbar>
  )
}