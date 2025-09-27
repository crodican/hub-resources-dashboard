export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    message: string
    status: number
    timestamp: string
  }
}

export interface ResourceParams {
  page?: number
  limit?: number
  search?: string
  sort?: string
  County?: string[]
  'Resource Type'?: string[]
  Category?: string[]
  'Populations Served'?: string[]
}

export interface ResourcesResponse {
  list: any[]
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

export interface FilterData {
  County: string[]
  'Resource Type': string[]
  'Populations Served': string[]
  Category: Record<string, string[]>
}