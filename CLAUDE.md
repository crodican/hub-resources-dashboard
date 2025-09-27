# CLAUDE.md

This file provides guidance to Claude Code (`claude.ai/code`) when working with code in this repository.  

# Recovery Resources Database - Project Plan

## Overview
A modern, Airtable-like interface for managing recovery resources data using React, Hono, and Cloudflare Workers. The application provides full CRUD capabilities with an intuitive interface for managing resources with complex many-to-many relationships (counties, populations served, resource types, and categories).

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Hono (TypeScript on Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Deployment**: Cloudflare Pages + Workers
- **Authentication**: Cloudflare Zero Trust
- **Data Grid**: TanStack Table v8

### Project Structure
```
recovery-resources/
├── .vscode/                    # VS Code settings
├── src/
│   ├── client/                 # React frontend (TypeScript)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppMenu.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Toolbar.tsx
│   │   │   ├── table/
│   │   │   │   ├── ResourceTable.tsx
│   │   │   │   ├── ColumnHeader.tsx
│   │   │   │   ├── RowCell.tsx
│   │   │   │   ├── ContextMenu.tsx
│   │   │   │   └── EditModal.tsx
│   │   │   ├── ui/
│   │   │   │   ├── MultiSelectDropdown.tsx
│   │   │   │   ├── SearchableSelect.tsx
│   │   │   │   └── FilterPanel.tsx
│   │   │   └── views/
│   │   │       ├── TableView.tsx
│   │   │       └── SqlView.tsx
│   │   ├── hooks/
│   │   │   ├── useResources.ts
│   │   │   ├── useTable.ts
│   │   │   └── useKeyboardShortcuts.ts
│   │   ├── utils/
│   │   │   ├── dataTransforms.ts
│   │   │   ├── csvExport.ts
│   │   │   └── validation.ts
│   │   ├── types/
│   │   │   ├── api.ts
│   │   │   ├── resource.ts
│   │   │   └── table.ts
│   │   ├── styles/
│   │   │   └── custom.css
│   │   └── App.tsx
│   └── worker/                 # Hono backend (matches template)
│       ├── api.ts             # Recovery Resources API
│       └── index.ts           # Main worker entry point
├── dist/                      # Built frontend
│   └── client/                # React build output
├── functions/                  # Auto-generated Cloudflare Pages
├── public/                    # Static assets
├── node_modules/              # Dependencies
├── package.json
├── package-lock.json
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── tsconfig.app.json          # App-specific TS config
├── tsconfig.node.json         # Node-specific TS config
├── tsconfig.worker.json       # Worker-specific TS config
├── eslint.config.js           # ESLint configuration
├── wrangler.json              # Cloudflare Worker config
├── worker-configuration.d.ts  # Worker type definitions
├── index.html                 # HTML entry point
├── .gitignore
├── README.md
└── CLAUDE.md                  # This file
```

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "hono": "^4.0.0",
    "@tanstack/react-table": "^8.10.0",
    "react-bootstrap": "^2.9.0",
    "bootstrap": "^5.3.0",
    "bootstrap-icons": "^1.11.0",
    "react-hotkeys-hook": "^4.4.0",
    "react-modal": "^3.16.0",
    "date-fns": "^2.30.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@types/react-modal": "^3.16.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "wrangler": "^3.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0"
  }
}
```

### Template Configuration Files
- **wrangler.json**: Cloudflare Worker configuration (not .toml)
- **vite.config.ts**: Vite build configuration for TypeScript
- **tsconfig.json**: Base TypeScript configuration
- **tsconfig.app.json**: Frontend-specific TypeScript settings
- **tsconfig.worker.json**: Worker-specific TypeScript settings
- **eslint.config.js**: ESLint configuration with TypeScript support

## Database Schema

### Tables
1. **resources** - Main resources table
2. **counties** - Lookup table for counties
3. **resource_types** - Lookup table for resource types  
4. **categories** - Lookup table for categories
5. **populations_served** - Lookup table for populations served
6. **resources_counties** - Junction table
7. **resources_resource_types** - Junction table
8. **resources_categories** - Junction table
9. **resources_populations** - Junction table

### Key Relationships
- Resources have many-to-many relationships with all lookup tables
- Junction tables maintain referential integrity
- Soft deletes for data preservation

## UI/UX Specifications

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Application Menu Bar (File, Edit, View, Help)              │
├─────────┬───────────────────────────────────────────────────┤
│ Sidebar │ Toolbar (Filter, Sort, Group | Search, Fullscreen)│
│ 200px   ├───────────────────────────────────────────────────┤
│         │ Editable Table with TanStack Table               │
│ - Table │ - 50 rows initial load                           │
│   View  │ - Infinite scroll (50 more per scroll)          │
│ - SQL   │ - Multi-select dropdowns for relationships      │
│   View  │ - Context menus on headers and cells            │
│ - Tools │ - Row selection with checkboxes                 │
│         │ - Inline editing capabilities                   │
│         │ - Drag to reorder rows                          │
└─────────┴───────────────────────────────────────────────────┘
```

### Column Configuration
| Column | Type | Features |
|--------|------|----------|
| ID | Number | Checkbox, expand icon, drag handle |
| Location Name | Text | Sortable, searchable, required |
| Organization | Text | Sortable, searchable |
| County | Multi-select | Dropdown from counties table |
| Populations Served | Multi-select | Dropdown from populations table |
| Resource Types | Multi-select | Dropdown from resource_types table |
| Categories | Multi-select | Dropdown from categories table |
| More Info | Text Area | Rich text editing |
| Phone | Text | Format validation |
| Address | Text | Address validation |
| City | Text | Auto-complete |
| State | Select | Default to PA |
| Zip | Text | Format validation |
| Website | URL | URL validation |
| Image | URL | Image preview |
| Latitude | Number | Decimal validation |
| Longitude | Number | Decimal validation |
| Full Address | Computed | Auto-generated from address components |
| Phone URL | Computed | tel: link generation |
| Google Maps URL | Computed | Maps link generation |

### Interactive Features

#### Column Headers
- **Sort**: Click to sort ascending, click again for descending
- **Context Menu**: Right-click or chevron-down icon
  - Search bar with enter to search
  - Filter list with checkboxes for all unique values
  - Clear filters button
  - Sort ascending/descending options
  - Column visibility toggle

#### Row Interactions
- **Selection**: Checkbox on hover or cell focus
- **Editing**: Double-click cell for inline editing
- **Expand**: Modal dialog for full record editing
- **Drag**: Reorder rows with grip handle
- **Context Menu**: Right-click for Cut, Copy, Paste, Delete, Insert options

#### Keyboard Shortcuts
- **Ctrl+A**: Select all rows
- **Ctrl+C**: Copy selected
- **Ctrl+V**: Paste
- **Ctrl+X**: Cut selected
- **Delete**: Delete selected rows
- **F11**: Toggle fullscreen
- **Ctrl+F**: Focus search
- **Escape**: Clear selection/close modals

## Data Management

### CRUD Operations
- **Create**: Add new resources with relationship management
- **Read**: Fetch with pagination, filtering, and joins
- **Update**: Modify resources and junction table entries
- **Delete**: Soft delete with cascading to junction tables

### Data Transformation
```javascript
// Flatten relational data for table display
const flattenResource = (resource) => ({
  ...resource,
  counties: resource.counties?.map(c => c.name).join(', '),
  resourceTypes: resource.resourceTypes?.map(rt => rt.name).join(', '),
  categories: resource.categories?.map(c => c.name).join(', '),
  populations: resource.populations?.map(p => p.name).join(', ')
});

// Convert flat data back to relational structure
const normalizeResource = (flatResource) => ({
  ...flatResource,
  counties: flatResource.counties?.split(', ').map(name => ({ name })),
  // ... other relationships
});
```

### API Integration
- RESTful endpoints matching existing Hono API
- Optimistic updates for immediate UI feedback
- Error handling with user-friendly messages
- Batch operations for performance

## Performance Considerations

### Virtual Scrolling
- Implement react-window for large datasets
- 50-row initial load with infinite scroll
- Maintain selection state during scrolling

### Caching Strategy
- React Query for API state management
- Local storage for user preferences
- Memoization for expensive calculations

### Bundle Optimization
- Code splitting by route and feature
- Tree shaking for unused Bootstrap components
- Dynamic imports for heavy components

## Development Phases

### Phase 1: Foundation
- [x] Project setup with Vite + Hono template
- [ ] Basic layout structure (menu, sidebar, main area)
- [ ] TanStack Table integration
- [ ] Bootstrap styling implementation

### Phase 2: Core Table
- [ ] Column configuration and rendering
- [ ] Sorting and filtering implementation
- [ ] Row selection and basic editing
- [ ] Context menus for headers and cells

### Phase 3: Advanced Features
- [ ] Multi-select dropdowns for relationships
- [ ] Inline editing with validation
- [ ] Drag and drop row reordering
- [ ] Modal dialog for detailed editing

### Phase 4: Data Integration
- [ ] Full CRUD API integration
- [ ] Real-time updates and optimistic UI
- [ ] Import/export functionality
- [ ] SQL view implementation

### Phase 5: Polish
- [ ] Keyboard shortcuts
- [ ] Advanced filtering and search
- [ ] Performance optimization
- [ ] User preferences and settings

## Implementation Notes

### TanStack Table Configuration with TypeScript
```typescript
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table'

interface ResourceData {
  ID: number
  'Location Name': string
  Organization: string
  County: string[]
  'Populations Served': string[]
  'Resource Types': string[]
  Categories: string[]
  'More Info': string
  Phone: string
  Address: string
  City: string
  State: string
  Zip: string
  Website: string
  Image: string
  Latitude: number
  Longitude: number
  'Full Address': string
  'Phone URL': string
  'Google Maps URL': string
}

const columns: ColumnDef<ResourceData>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <IndeterminateCheckbox
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <div className="d-flex align-items-center gap-2">
        <IndeterminateCheckbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          indeterminate={row.getIsSomeSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
        <Button size="sm" variant="link" onClick={() => openEditModal(row.original)}>
          <i className="bi bi-arrows-angle-expand"></i>
        </Button>
        <div className="drag-handle">
          <i className="bi bi-grip-vertical"></i>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'ID',
    header: 'ID',
    enableSorting: true,
    sortingFn: 'basic',
  },
  {
    accessorKey: 'Location Name',
    header: 'Location Name',
    cell: EditableCell,
  },
  // ... other columns
]
```

### Multi-Select Implementation with TypeScript
```typescript
interface MultiSelectCellProps {
  getValue: () => string[]
  row: { index: number }
  column: { id: string; meta?: { options: string[] } }
  table: { options: { meta?: { updateData: (rowIndex: number, columnId: string, value: string[]) => void } } }
}

const MultiSelectCell: React.FC<MultiSelectCellProps> = ({ getValue, row, column, table }) => {
  const initialValue = getValue()
  const [value, setValue] = useState<string[]>(initialValue)
  
  const onBlur = () => {
    table.options.meta?.updateData(row.index, column.id, value)
  }
  
  return (
    <MultiSelectDropdown
      value={value}
      onChange={setValue}
      onBlur={onBlur}
      options={column.meta?.options || []}
      placeholder={`Select ${column.header}...`}
    />
  )
}
```

### API Client with TypeScript
```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    status: number
    timestamp: string
  }
}

interface ResourcesResponse {
  list: ResourceData[]
  pageInfo: {
    totalRows: number
    currentPage: number
    recordsPerPage: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  meta: {
    appliedFilters: Record<string, any>
    sort: string
    timestamp: string
  }
}

class ResourcesApi {
  private baseUrl = '/api'

  async getFilters(): Promise<ApiResponse<FilterData>> {
    const response = await fetch(`${this.baseUrl}/filters`)
    return response.json()
  }

  async getResources(params: ResourceParams): Promise<ApiResponse<ResourcesResponse>> {
    const query = new URLSearchParams(params as any)
    const response = await fetch(`${this.baseUrl}/?${query}`)
    return response.json()
  }

  async createResource(resource: Partial<ResourceData>): Promise<ApiResponse<{ id: number }>> {
    const response = await fetch(`${this.baseUrl}/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource)
    })
    return response.json()
  }

  async updateResource(id: number, resource: Partial<ResourceData>): Promise<ApiResponse<void>> {
    const response = await fetch(`${this.baseUrl}/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...resource })
    })
    return response.json()
  }

  async deleteResource(id: number): Promise<ApiResponse<void>> {
    const response = await fetch(`${this.baseUrl}/delete?id=${id}`, {
      method: 'DELETE'
    })
    return response.json()
  }
}
```

### State Management with TypeScript
```typescript
// Using React Query for server state
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface UseResourcesOptions {
  page?: number
  limit?: number
  search?: string
  filters?: Record<string, string[]>
}

const useResources = (options: UseResourcesOptions) => {
  return useQuery({
    queryKey: ['resources', options],
    queryFn: () => resourcesApi.getResources(options),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

const useCreateResource = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: resourcesApi.createResource,
    onSuccess: () => {
      queryClient.invalidateQueries(['resources'])
    },
  })
}

// Context for global UI state
interface AppContextType {
  selectedRows: number[]
  setSelectedRows: (rows: number[]) => void
  isFullscreen: boolean
  setIsFullscreen: (fullscreen: boolean) => void
  currentView: 'table' | 'sql'
  setCurrentView: (view: 'table' | 'sql') => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const useAppContext = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}
```

## Deployment Configuration

### Cloudflare Configuration
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "recovery-resources",
  "main": "./src/worker/index.ts",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "resources-db",
      "database_id": "431c83fc-96fe-42b5-8816-f73a1c33fcf9"
    }
  ],
  "vars": { "ENVIRONMENT": "development" },
  "upload_source_maps": true,
  "assets": {
    "directory": "./dist/client",
    "not_found_handling": "single-page-application"
  }
}
```

### TypeScript Configuration
The template includes multiple TypeScript configuration files:
- **tsconfig.json**: Base configuration
- **tsconfig.app.json**: Frontend-specific settings
- **tsconfig.worker.json**: Worker-specific settings
- **tsconfig.node.json**: Node.js tooling configuration

### Environment Setup
- **Development**: Local D1 with `wrangler dev`
- **Staging**: Cloudflare Workers with staging DB
- **Production**: Full Cloudflare deployment with Zero Trust

## Development Workflow

### Getting Started
1. **Clone template**: Use Cloudflare Vite React Hono Worker template
2. **Install dependencies**: `npm install` (add additional packages as needed)
3. **Configure database**: Update `wrangler.json` with your D1 database ID
4. **Add API**: Place TypeScript API in `src/worker/api.ts`
5. **Update worker**: Modify `src/worker/index.ts` to mount API
6. **Start development**: `npm run dev`

### Key Commands
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build for production
- `npm run deploy`: Deploy to Cloudflare
- `npm run type-check`: TypeScript type checking
- `npm run lint`: ESLint checking

### File Naming Conventions
- **Components**: PascalCase with `.tsx` extension
- **Hooks**: camelCase starting with `use`, `.ts` extension
- **Utilities**: camelCase with `.ts` extension
- **Types**: PascalCase interfaces in `.ts` files
- **API**: camelCase with `.ts` extension

This comprehensive plan provides a complete roadmap for building a sophisticated, Airtable-like interface using the Cloudflare Vite React Hono Worker template with full TypeScript support. The structure maintains compatibility with the template while implementing all the advanced features needed for complex relational data management.