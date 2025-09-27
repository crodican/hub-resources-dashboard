import { ApiResponse, ResourceParams, ResourcesResponse, FilterData } from '../types/api'
import { ResourceData } from '../types/resource'

class ApiClient {
  private baseUrl = '/api'

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getFilters(): Promise<FilterData> {
    return this.makeRequest<FilterData>('/filters')
  }

  async getResources(params: ResourceParams = {}): Promise<ResourcesResponse> {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => query.append(key, v))
      } else if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value))
      }
    })

    const endpoint = query.toString() ? `/?${query.toString()}` : '/'
    return this.makeRequest<ResourcesResponse>(endpoint)
  }

  async createResource(resource: Partial<ResourceData>): Promise<{ id: number }> {
    return this.makeRequest<{ id: number }>('/insert', {
      method: 'POST',
      body: JSON.stringify(resource),
    })
  }

  async updateResource(id: number, resource: Partial<ResourceData>): Promise<void> {
    return this.makeRequest<void>('/update', {
      method: 'PUT',
      body: JSON.stringify({ id, ...resource }),
    })
  }

  async deleteResource(id: number): Promise<void> {
    return this.makeRequest<void>(`/delete?id=${id}`, {
      method: 'DELETE',
    })
  }

  async exportResources(format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export?format=${format}`)
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`)
    }
    return response.blob()
  }

  async getMapMarkers(): Promise<any[]> {
    return this.makeRequest<any[]>('/map-markers')
  }

  async getStats(): Promise<any> {
    return this.makeRequest<any>('/stats')
  }
}

export const apiClient = new ApiClient()