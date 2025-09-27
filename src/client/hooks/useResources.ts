import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../utils/apiClient'
import { ResourceParams, ResourcesResponse } from '../types/api'
import { ResourceData } from '../types/resource'

interface UseResourcesOptions extends ResourceParams {
  autoFetch?: boolean
}

interface UseResourcesReturn {
  data: ResourceData[]
  pageInfo: ResourcesResponse['pageInfo'] | null
  meta: ResourcesResponse['meta'] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateParams: (newParams: Partial<ResourceParams>) => void
  params: ResourceParams
}

export const useResources = (initialOptions: UseResourcesOptions = {}): UseResourcesReturn => {
  const { autoFetch = true, ...initialParams } = initialOptions

  const [data, setData] = useState<ResourceData[]>([])
  const [pageInfo, setPageInfo] = useState<ResourcesResponse['pageInfo'] | null>(null)
  const [meta, setMeta] = useState<ResourcesResponse['meta'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useState<ResourceParams>(initialParams)

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiClient.getResources(params)

      setData(response.list)
      setPageInfo(response.pageInfo)
      setMeta(response.meta)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching resources:', err)
    } finally {
      setLoading(false)
    }
  }, [params])

  const updateParams = useCallback((newParams: Partial<ResourceParams>) => {
    setParams(prev => ({ ...prev, ...newParams }))
  }, [])

  useEffect(() => {
    if (autoFetch) {
      fetchResources()
    }
  }, [fetchResources, autoFetch])

  return {
    data,
    pageInfo,
    meta,
    loading,
    error,
    refetch: fetchResources,
    updateParams,
    params
  }
}