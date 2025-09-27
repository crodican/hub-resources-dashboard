import { useState } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { useHotkeys } from 'react-hotkeys-hook'

import { AppMenu } from './components/layout/AppMenu'
import { Sidebar } from './components/layout/Sidebar'
import { Toolbar } from './components/layout/Toolbar'
import { TableView } from './components/views/TableView'
import { SqlView } from './components/views/SqlView'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './styles/custom.css'

function App() {
  const [currentView, setCurrentView] = useState<'table' | 'sql'>('table')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [selectedRowsCount] = useState(0)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Keyboard shortcuts
  useHotkeys('f11', (e) => {
    e.preventDefault()
    toggleFullscreen()
  })

  useHotkeys('ctrl+f', (e) => {
    e.preventDefault()
    // Focus search input - will implement later
  })

  useHotkeys('escape', () => {
    // Clear selection/close modals - will implement later
  })

  return (
    <div className="app-container">
      <AppMenu
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      <Container fluid className="p-0">
        <Row className="g-0">
          <Col xs="auto">
            <Sidebar
              currentView={currentView}
              onViewChange={setCurrentView}
            />
          </Col>

          <Col className="main-content">
            <Toolbar
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onToggleFullscreen={toggleFullscreen}
              selectedRowsCount={selectedRowsCount}
            />

            <div className="content-area">
              {currentView === 'table' ? <TableView /> : <SqlView />}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default App
