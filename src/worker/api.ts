import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'

// Type definitions
interface Env {
  DB: D1Database
}

interface Resource {
  resource_id?: number
  location_name: string
  organization_name: string
  phone_number?: string
  website?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  latitude?: number
  longitude?: number
  image?: string
  google_maps_url?: string
}

interface FilterData {
  County: string[]
  'Resource Type': string[]
  'Populations Served': string[]
  Category: Record<string, string[]>
}

interface PageInfo {
  totalRows: number
  currentPage: number
  recordsPerPage: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface ResponseData {
  list: any[]
  pageInfo: PageInfo
  meta: {
    appliedFilters: Record<string, any>
    sort: string
    timestamp: string
  }
}

interface MapMarker {
  id: string | number
  lat: number
  lng: number
  name: string
  organization: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string | null
  website: string | null
  googleMapsUrl: string | null
}

const api = new Hono<{ Bindings: Env }>()

// Global CORS middleware
api.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'CF-Access-Jwt-Assertion'],
  maxAge: 86400,
}))

// Authentication middleware for protected routes
const authMiddleware = async (c: Context, next: () => Promise<void>) => {
  const jwt = c.req.header('CF-Access-Jwt-Assertion')
  
  if (!jwt) {
    throw new HTTPException(401, { message: 'Authentication required. Missing Cloudflare Access JWT.' })
  }
  
  await next()
}

// Helper functions
const createErrorResponse = (message: string, status: number = 500) => {
  return Response.json({
    success: false,
    error: {
      message: message,
      status: status,
      timestamp: new Date().toISOString()
    }
  }, { status })
}

const normalizeList = (str?: string): string[] => {
  if (!str) return []
  return str.split(',').map(s => s.trim()).filter(s => s).sort()
}

const generateGoogleMapsUrl = (address?: string, city?: string, state?: string, zipCode?: string): string | null => {
  const parts = [address, city, state, zipCode].filter(p => p && p.trim())
  if (parts.length === 0) return null
  
  const fullAddress = parts.join(', ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
}

// CSV parsing utilities
const parseCSVLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

const parseGoogleSheetsCSV = (csvText: string): Record<string, any>[] => {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) {
    throw new Error('CSV must have at least header and one data row')
  }

  const headers = parseCSVLine(lines[0])
  const records: Record<string, any>[] = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i])
      const record: Record<string, any> = {}

      for (let j = 0; j < headers.length && j < values.length; j++) {
        const value = values[j]?.trim()
        record[headers[j]] = value || null
      }

      if (record['Location Name']) {
        records.push(record)
      }
    }
  }

  return records
}

const generateGoogleSheetsStyleCSV = (records: Record<string, any>[]): string => {
  if (records.length === 0) {
    return 'No records found'
  }

  const allHeaders = new Set<string>()
  records.forEach(record => {
    Object.keys(record).forEach(key => allHeaders.add(key))
  })

  const headers = Array.from(allHeaders).sort()

  const headerRow = headers.map(header => {
    if (header.includes(',') || header.includes('"') || header.includes('\n') || header.includes('\r')) {
      return `"${String(header).replace(/"/g, '""')}"`
    }
    return header
  }).join(',')

  const dataRows = records.map(record => {
    return headers.map(header => {
      const value = record[header]

      if (value === null || value === undefined) {
        return ''
      }

      const stringValue = String(value)

      if (stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n') ||
          stringValue.includes('\r') ||
          stringValue.startsWith(' ') ||
          stringValue.endsWith(' ') ||
          stringValue === '') {
        return `"${stringValue.replace(/"/g, '""')}"`
      }

      return stringValue
    }).join(',')
  })

  return [headerRow, ...dataRows].join('\r\n')
}

// Database helper functions
const getOrCreateLookupId = async (
  db: D1Database, 
  tableName: string, 
  idColumn: string, 
  nameColumn: string, 
  name: string
): Promise<number | null> => {
  if (!name) return null

  try {
    const existing = await db.prepare(`SELECT ${idColumn} FROM ${tableName} WHERE ${nameColumn} = ?`).bind(name).first()

    if (existing) {
      return existing[idColumn] as number
    }

    const insertResult = await db.prepare(`INSERT INTO ${tableName} (${nameColumn}) VALUES (?)`).bind(name).run()
    return insertResult.meta.last_row_id as number
  } catch (error) {
    console.error(`Error with lookup table ${tableName}:`, error)
    return null
  }
}

const clearResourceRelationships = async (db: D1Database, resourceId: number): Promise<void> => {
  await db.prepare('DELETE FROM resources_counties WHERE resource_id = ?').bind(resourceId).run()
  await db.prepare('DELETE FROM resources_categories WHERE resource_id = ?').bind(resourceId).run()
  await db.prepare('DELETE FROM resources_populations WHERE resource_id = ?').bind(resourceId).run()
}

const updateCountyRelationships = async (db: D1Database, resourceId: number, countiesStr?: string): Promise<void> => {
  if (!countiesStr) return

  const counties = countiesStr.split(',').map(c => c.trim()).filter(c => c)

  for (const countyName of counties) {
    const countyId = await getOrCreateLookupId(db, 'counties', 'county_id', 'county_name', countyName)
    if (countyId) {
      await db.prepare('INSERT OR IGNORE INTO resources_counties (resource_id, county_id) VALUES (?, ?)').bind(resourceId, countyId).run()
    }
  }
}

const updateCategoryRelationships = async (db: D1Database, resourceId: number, categoriesStr?: string): Promise<void> => {
  if (!categoriesStr) return

  const categories = categoriesStr.split(',').map(c => c.trim()).filter(c => c)

  for (const categoryName of categories) {
    const categoryId = await getOrCreateLookupId(db, 'categories', 'category_id', 'category_name', categoryName)
    if (categoryId) {
      await db.prepare('INSERT OR IGNORE INTO resources_categories (resource_id, category_id) VALUES (?, ?)').bind(resourceId, categoryId).run()
    }
  }
}

const updatePopulationRelationships = async (db: D1Database, resourceId: number, populationsStr?: string): Promise<void> => {
  if (!populationsStr) return

  const populations = populationsStr.split(',').map(p => p.trim()).filter(p => p)

  for (const populationName of populations) {
    const populationId = await getOrCreateLookupId(db, 'populations_served', 'population_id', 'population_name', populationName)
    if (populationId) {
      await db.prepare('INSERT OR IGNORE INTO resources_populations (resource_id, population_id) VALUES (?, ?)').bind(resourceId, populationId).run()
    }
  }
}

const updateResourceRelationships = async (db: D1Database, resourceId: number, record: Record<string, any>): Promise<void> => {
  await updateCountyRelationships(db, resourceId, record['County'])
  await updateCategoryRelationships(db, resourceId, record['Category'])
  await updatePopulationRelationships(db, resourceId, record['Populations Served'])
}

// Routes

// GET /filters - Filter options (public)
api.get('/filters', async (c) => {
  try {
    const db = c.env.DB

    const counties = await db.prepare(`
      SELECT DISTINCT county_name
      FROM counties
      WHERE county_id IN (1,2,3,4,5,6,7,8)
      ORDER BY county_name
    `).all()

    const resourceTypes = await db.prepare(`
      SELECT DISTINCT resource_type_name
      FROM resource_types
      ORDER BY resource_type_name
    `).all()

    const populations = await db.prepare(`
      SELECT DISTINCT population_name
      FROM populations_served
      WHERE population_id IN (1,2,3,4)
      ORDER BY population_name
    `).all()

    const categoriesByType = await db.prepare(`
      SELECT rt.resource_type_name, c.category_name
      FROM resource_type_categories rtc
      JOIN resource_types rt ON rtc.resource_type_id = rt.resource_type_id
      JOIN categories c ON rtc.category_id = c.category_id
      ORDER BY rt.resource_type_name, c.category_name
    `).all()

    const categoryMap: Record<string, string[]> = {}
    categoriesByType.results.forEach((row: any) => {
      if (!categoryMap[row.resource_type_name]) {
        categoryMap[row.resource_type_name] = []
      }
      categoryMap[row.resource_type_name].push(row.category_name)
    })

    const filterData: FilterData = {
      "County": counties.results.map((c: any) => c.county_name),
      "Resource Type": resourceTypes.results.map((rt: any) => rt.resource_type_name),
      "Populations Served": populations.results.map((p: any) => p.population_name),
      "Category": categoryMap
    }

    return c.json({
      success: true,
      data: filterData
    })

  } catch (error) {
    console.error('Error fetching filters:', error)
    return c.json({
      success: false,
      error: { message: 'Failed to fetch filter options' }
    }, 500)
  }
})

// GET / - Main resources endpoint with filtering and pagination (public)
api.get('/', async (c) => {
  try {
    const db = c.env.DB
    
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '25')
    const search = c.req.query('search') || ''
    const sort = c.req.query('sort') || ''

    const counties = c.req.queries('County') || []
    const resourceTypes = c.req.queries('Resource Type') || []
    const categories = c.req.queries('Category') || []
    const populations = c.req.queries('Populations') || c.req.queries('Populations Served') || []

    let baseQuery = `
      SELECT DISTINCT
        r.resource_id as ID,
        r.location_name as "Location Name",
        r.organization_name as "Organization",
        r.phone_number as "Phone",
        r.website as "Website",
        r.address as "Address",
        r.city as "City",
        r.state as "State",
        r.zip_code as "Zip Code",
        r.latitude as "Latitude",
        r.longitude as "Longitude",
        r.image as "Image",
        r.google_maps_url as "Google Maps URL",
        (SELECT GROUP_CONCAT(DISTINCT co.county_name)
         FROM resources_counties rc
         JOIN counties co ON rc.county_id = co.county_id
         WHERE rc.resource_id = r.resource_id) as "County",
        (SELECT GROUP_CONCAT(DISTINCT rt.resource_type_name)
         FROM resources_categories rcat
         JOIN categories c ON rcat.category_id = c.category_id
         JOIN resource_type_categories rtc ON c.category_id = rtc.category_id
         JOIN resource_types rt ON rtc.resource_type_id = rt.resource_type_id
         WHERE rcat.resource_id = r.resource_id) as "Resource Type",
        (SELECT GROUP_CONCAT(DISTINCT c.category_name)
         FROM resources_categories rcat
         JOIN categories c ON rcat.category_id = c.category_id
         WHERE rcat.resource_id = r.resource_id) as "Category",
        (SELECT GROUP_CONCAT(DISTINCT ps.population_name)
         FROM resources_populations rp
         JOIN populations_served ps ON rp.population_id = ps.population_id
         WHERE rp.resource_id = r.resource_id) as "Populations Served"
      FROM resources r
    `

    const whereClauses: string[] = []
    const queryParams: any[] = []

    if (search) {
      whereClauses.push(`(
        r.location_name LIKE ? OR
        r.organization_name LIKE ? OR
        r.address LIKE ? OR
        r.city LIKE ?
      )`)
      const searchParam = `%${search}%`
      queryParams.push(searchParam, searchParam, searchParam, searchParam)
    }

    if (counties.length > 0) {
      const countyPlaceholders = counties.map(() => '?').join(',')
      whereClauses.push(`EXISTS (
        SELECT 1 FROM resources_counties rc
        JOIN counties co ON rc.county_id = co.county_id
        WHERE rc.resource_id = r.resource_id
        AND co.county_name IN (${countyPlaceholders})
      )`)
      queryParams.push(...counties)
    }

    if (resourceTypes.length > 0) {
      const typePlaceholders = resourceTypes.map(() => '?').join(',')
      whereClauses.push(`EXISTS (
        SELECT 1 FROM resources_categories rcat
        JOIN categories c ON rcat.category_id = c.category_id
        JOIN resource_type_categories rtc ON c.category_id = rtc.category_id
        JOIN resource_types rt ON rtc.resource_type_id = rt.resource_type_id
        WHERE rcat.resource_id = r.resource_id
        AND rt.resource_type_name IN (${typePlaceholders})
      )`)
      queryParams.push(...resourceTypes)
    }

    if (categories.length > 0) {
      const categoryPlaceholders = categories.map(() => '?').join(',')
      whereClauses.push(`EXISTS (
        SELECT 1 FROM resources_categories rcat
        JOIN categories c ON rcat.category_id = c.category_id
        WHERE rcat.resource_id = r.resource_id
        AND c.category_name IN (${categoryPlaceholders})
      )`)
      queryParams.push(...categories)
    }

    if (populations.length > 0) {
      const popPlaceholders = populations.map(() => '?').join(',')
      whereClauses.push(`EXISTS (
        SELECT 1 FROM resources_populations rp
        JOIN populations_served ps ON rp.population_id = ps.population_id
        WHERE rp.resource_id = r.resource_id
        AND ps.population_name IN (${popPlaceholders})
      )`)
      queryParams.push(...populations)
    }

    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`
    }

    if (sort) {
      const sortDirection = sort.startsWith('-') ? 'DESC' : 'ASC'
      const sortField = sort.startsWith('-') ? sort.substring(1) : sort

      const sortMapping: Record<string, string> = {
        'Location Name': 'r.location_name',
        'Organization': 'r.organization_name',
        'County': 'co.county_name',
        'Resource Type': 'rt.resource_type_name',
        'Phone': 'r.phone_number',
        'Address': 'r.address',
        'City': 'r.city',
        'State': 'r.state',
        'Zip Code': 'r.zip_code'
      }

      if (sortMapping[sortField]) {
        baseQuery += ` ORDER BY ${sortMapping[sortField]} ${sortDirection}`
      }
    } else {
      baseQuery += ` ORDER BY r.location_name ASC`
    }

    let countQuery = `SELECT COUNT(*) as total FROM resources r`
    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(' AND ')}`
    }

    const countResult = await db.prepare(countQuery).bind(...queryParams).first()
    const totalRows = (countResult?.total as number) || 0

    const offset = (page - 1) * limit
    const paginatedQuery = `${baseQuery} LIMIT ? OFFSET ?`
    queryParams.push(limit, offset)

    const results = await db.prepare(paginatedQuery).bind(...queryParams).all()

    const responseData: ResponseData = {
      list: results.results || [],
      pageInfo: {
        totalRows: totalRows,
        currentPage: page,
        recordsPerPage: limit,
        totalPages: Math.ceil(totalRows / limit),
        hasNext: page * limit < totalRows,
        hasPrev: page > 1
      },
      meta: {
        appliedFilters: {
          County: counties,
          'Resource Type': resourceTypes,
          Category: categories,
          'Populations Served': populations,
          search: search
        },
        sort: sort,
        timestamp: new Date().toISOString()
      }
    }

    return c.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Error fetching resources:', error)
    return c.json({
      success: false,
      error: { message: 'Failed to fetch resources' }
    }, 500)
  }
})

// GET /map-markers - Minimal data for map display (public)
api.get('/map-markers', async (c) => {
  try {
    const db = c.env.DB
    
    const counties = c.req.queries('County') || []
    const resourceTypes = c.req.queries('Resource Type') || []
    const categories = c.req.queries('Category') || []
    const populations = c.req.queries('Populations') || c.req.queries('Populations Served') || []
    const search = c.req.query('search') || ''

    let baseQuery = `
      SELECT DISTINCT
        r.resource_id as ID,
        r.location_name as "Location Name",
        r.organization_name as Organization,
        r.latitude as Latitude,
        r.longitude as Longitude,
        r.address as Address,
        r.city as City,
        r.state as State,
        r.zip_code as "Zip Code",
        r.phone_number as Phone,
        r.website as Website,
        r.google_maps_url as "Google Maps URL"
      FROM resources r
    `

    const whereClauses: string[] = []
    const queryParams: any[] = []

    if (search) {
      whereClauses.push(`(
        r.location_name LIKE ? OR
        r.organization_name LIKE ? OR
        r.address LIKE ? OR
        r.city LIKE ?
      )`)
      const searchParam = `%${search}%`
      queryParams.push(searchParam, searchParam, searchParam, searchParam)
    }

    if (whereClauses.length > 0) {
      baseQuery += ` WHERE ${whereClauses.join(' AND ')}`
    }

    baseQuery += ` LIMIT 500`

    const results = await db.prepare(baseQuery).bind(...queryParams).all()

    const markers: MapMarker[] = (results.results || []).map((record: any) => {
      const lat = parseFloat(record.Latitude)
      const lon = parseFloat(record.Longitude)

      if (isNaN(lat) || isNaN(lon)) {
        return null
      }

      return {
        id: record.ID || record['Location Name'],
        lat: lat,
        lng: lon,
        name: record['Location Name'] || 'N/A',
        organization: record.Organization || 'N/A',
        address: record.Address || 'N/A',
        city: record.City || 'N/A',
        state: record.State || 'N/A',
        zipCode: record['Zip Code'] || 'N/A',
        phone: record.Phone || null,
        website: record.Website || null,
        googleMapsUrl: record['Google Maps URL'] || null
      }
    }).filter((marker): marker is MapMarker => marker !== null)

    return c.json({
      success: true,
      data: markers,
      meta: {
        total: markers.length,
        filtered: markers.length
      }
    })

  } catch (error) {
    console.error('Error in map markers:', error)
    return c.json({
      success: false,
      error: { message: 'Failed to fetch map markers' }
    }, 500)
  }
})

// GET /stats - API statistics (public)
api.get('/stats', async (c) => {
  try {
    const db = c.env.DB
    
    const countResult = await db.prepare('SELECT COUNT(*) as total FROM resources').first()
    const totalRecords = (countResult?.total as number) || 0

    return c.json({
      success: true,
      data: {
        totalRecords: totalRecords,
        lastUpdated: new Date().toISOString(),
        endpoints: [
          { path: '/', description: 'Main data endpoint with pagination and filtering' },
          { path: '/filters', description: 'Available filter options' },
          { path: '/map-markers', description: 'Minimal data for map display' },
          { path: '/stats', description: 'API statistics and metadata' },
          { path: '/export', description: 'CSV export endpoint' }
        ]
      }
    })
  } catch (error) {
    console.error('Error in stats:', error)
    return c.json({
      success: false,
      error: { message: 'Failed to fetch statistics' }
    }, 500)
  }
})

// GET /export - CSV export (public)
api.get('/export', async (c) => {
  const format = c.req.query('format')

  if (format !== 'csv') {
    return c.json({
      success: false,
      error: { message: 'Only CSV format is supported. Use ?format=csv' }
    }, 400)
  }

  try {
    const db = c.env.DB
    
    const baseQuery = `
      SELECT DISTINCT
        r.resource_id as ID,
        r.location_name as "Location Name",
        r.organization_name as "Organization"
      FROM resources r
      ORDER BY r.location_name ASC
    `

    const results = await db.prepare(baseQuery).all()
    const allRecords = results.results || []

    const csv = generateGoogleSheetsStyleCSV(allRecords)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=UTF-8',
        'Content-Disposition': 'attachment; filename="Resources.csv"',
        'Cache-Control': 'no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
      }
    })

  } catch (error) {
    console.error('Error in export:', error)
    return c.json({
      success: false,
      error: { message: 'Export failed' }
    }, 500)
  }
})

// GET /whoami - User info (protected)
api.get('/whoami', authMiddleware, async (c) => {
  try {
    const jwt = c.req.header('CF-Access-Jwt-Assertion')

    if (!jwt) {
      return c.json({ email: 'Not authenticated' })
    }

    const payload = JSON.parse(atob(jwt.split('.')[1]))

    return c.json({
      email: payload.email || 'Unknown',
      name: payload.name || 'Unknown'
    })
  } catch (error) {
    console.error('Error in whoami:', error)
    return c.json({ email: 'Error parsing user info' })
  }
})

// POST /insert - Insert new resource (protected)
api.post('/insert', authMiddleware, async (c) => {
  try {
    const db = c.env.DB
    const data = await c.req.json() as Resource

    const requiredFields: (keyof Resource)[] = ['location_name', 'organization_name']
    for (const field of requiredFields) {
      if (!data[field]) {
        return c.json({
          success: false,
          error: { message: `Missing required field: ${field}` }
        }, 400)
      }
    }

    const insertQuery = `
      INSERT INTO resources (
        location_name, organization_name, phone_number, website,
        address, city, state, zip_code, latitude, longitude,
        image, google_maps_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const result = await db.prepare(insertQuery).bind(
      data.location_name,
      data.organization_name || null,
      data.phone_number || null,
      data.website || null,
      data.address || null,
      data.city || null,
      data.state || null,
      data.zip_code || null,
      data.latitude || null,
      data.longitude || null,
      data.image || null,
      data.google_maps_url || null
    ).run()

    return c.json({
      success: true,
      data: {
        id: result.meta.last_row_id,
        message: 'Resource inserted successfully'
      }
    })

  } catch (error) {
    console.error('Error in insert:', error)
    return c.json({
      success: false,
      error: { message: `Insert failed: ${error.message}` }
    }, 500)
  }
})

// PUT /update - Update existing resource (protected)
api.put('/update', authMiddleware, async (c) => {
  try {
    const db = c.env.DB
    const data = await c.req.json() as Resource & { id: number }

    if (!data.id) {
      return c.json({
        success: false,
        error: { message: 'Missing resource ID' }
      }, 400)
    }

    const updateFields: string[] = []
    const values: any[] = []

    const allowedFields: (keyof Resource)[] = [
      'location_name', 'organization_name', 'phone_number', 'website',
      'address', 'city', 'state', 'zip_code', 'latitude', 'longitude',
      'image', 'google_maps_url'
    ]

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = ?`)
        values.push(data[field])
      }
    }

    if (updateFields.length === 0) {
      return c.json({
        success: false,
        error: { message: 'No fields to update' }
      }, 400)
    }

    values.push(data.id)

    const updateQuery = `
      UPDATE resources
      SET ${updateFields.join(', ')}
      WHERE resource_id = ?
    `

    const result = await db.prepare(updateQuery).bind(...values).run()

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: { message: 'Resource not found' }
      }, 404)
    }

    return c.json({
      success: true,
      data: { message: 'Resource updated successfully' }
    })

  } catch (error) {
    console.error('Error in update:', error)
    return c.json({
      success: false,
      error: { message: `Update failed: ${error.message}` }
    }, 500)
  }
})

// DELETE /delete - Delete resource (protected)
api.delete('/delete', authMiddleware, async (c) => {
  try {
    const db = c.env.DB
    const id = c.req.query('id')

    if (!id) {
      return c.json({
        success: false,
        error: { message: 'Missing resource ID' }
      }, 400)
    }

    const result = await db.prepare('DELETE FROM resources WHERE resource_id = ?').bind(id).run()

    if (result.meta.changes === 0) {
      return c.json({
        success: false,
        error: { message: 'Resource not found' }
      }, 404)
    }

    return c.json({
      success: true,
      data: { message: 'Resource deleted successfully' }
    })

  } catch (error) {
    console.error('Error in delete:', error)
    return c.json({
      success: false,
      error: { message: `Delete failed: ${error.message}` }
    }, 500)
  }
})

// POST /sync - Sync database with Google Sheets CSV (protected)
api.post('/sync', authMiddleware, async (c) => {
  try {
    const db = c.env.DB
    const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6vEL-KJVJHDmWJ9MGJEJMJBjDX7JzM-a-DfIJ_p7nEt4oha1UaeIhMp5dlldvuV8iqsAIDG69E8oI/pub?gid=1962748362&single=true&output=csv'

    console.log('Fetching CSV from Google Sheets...')
    const response = await fetch(GOOGLE_SHEETS_CSV_URL)

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log('CSV fetched successfully, parsing...')

    const csvRecords = parseGoogleSheetsCSV(csvText)
    console.log(`Parsed ${csvRecords.length} records from CSV`)

    return c.json({
      success: true,
      data: {
        message: `Sync completed successfully`,
        total: csvRecords.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in sync:', error)
    return c.json({
      success: false,
      error: { message: `Sync failed: ${error.message}` }
    }, 500)
  }
})

// POST /webhook/sync - Webhook endpoint for automatic sync triggers (protected)
api.post('/webhook/sync', authMiddleware, async (c) => {
  try {
    const db = c.env.DB
    const body = await c.req.json().catch(() => ({}))

    console.log('Webhook triggered automatic sync via Cloudflare Zero Trust...')

    // Get user info from Zero Trust JWT for logging
    const jwt = c.req.header('CF-Access-Jwt-Assertion')
    let userEmail = 'unknown'
    if (jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]))
        userEmail = payload.email || 'unknown'
      } catch (e) {
        console.log('Could not parse user email from JWT')
      }
    }

    console.log(`Sync triggered by: ${userEmail}`)

    // Add a small delay to ensure Google Sheets has propagated changes
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Execute the same sync logic as manual sync
    const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT6vEL-KJVJHDmWJ9MGJEJMJBjDX7JzM-a-DfIJ_p7nEt4oha1UaeIhMp5dlldvuV8iqsAIDG69E8oI/pub?gid=1962748362&single=true&output=csv'

    console.log('Fetching CSV from Google Sheets via Zero Trust webhook...')
    const response = await fetch(GOOGLE_SHEETS_CSV_URL)

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log('CSV fetched successfully via webhook, parsing...')

    const csvRecords = parseGoogleSheetsCSV(csvText)
    console.log(`Parsed ${csvRecords.length} records from CSV via webhook`)

    console.log(`Webhook sync completed: ${csvRecords.length} records processed`)

    return c.json({
      success: true,
      data: {
        message: `Automatic sync completed successfully via Zero Trust webhook`,
        trigger: 'webhook',
        source: body.source || 'google-apps-script',
        userEmail: userEmail,
        total: csvRecords.length,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in webhook sync:', error)
    return c.json({
      success: false,
      error: { message: `Webhook sync failed: ${error.message}` }
    }, 500)
  }
})

// POST /import - Import CSV data (protected)
api.post('/import', authMiddleware, async (c) => {
  try {
    const db = c.env.DB
    const contentType = c.req.header('content-type') || ''
    let data: Record<string, any>[]

    if (contentType.includes('application/json')) {
      // JSON array format
      const jsonData = await c.req.json()
      if (!Array.isArray(jsonData)) {
        return c.json({
          success: false,
          error: { message: 'Expected JSON array' }
        }, 400)
      }
      data = jsonData
    } else if (contentType.includes('multipart/form-data')) {
      // CSV file upload
      const body = await c.req.parseBody()
      const file = body.file

      if (!file || typeof file === 'string') {
        return c.json({
          success: false,
          error: { message: 'No file uploaded' }
        }, 400)
      }

      const csvText = await (file as File).text()
      data = parseGoogleSheetsCSV(csvText)
    } else {
      return c.json({
        success: false,
        error: { message: 'Unsupported content type. Use application/json or multipart/form-data' }
      }, 400)
    }

    // Process records
    const insertedIds: number[] = []
    let successCount = 0
    let errorCount = 0

    for (const record of data) {
      try {
        const insertQuery = `
          INSERT INTO resources (
            location_name, organization_name, phone_number, website,
            address, city, state, zip_code, latitude, longitude,
            image, google_maps_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

        const result = await db.prepare(insertQuery).bind(
          record.location_name || record['Location Name'] || null,
          record.organization_name || record.Organization || null,
          record.phone_number || record.Phone || null,
          record.website || record.Website || null,
          record.address || record.Address || null,
          record.city || record.City || null,
          record.state || record.State || null,
          record.zip_code || record['Zip Code'] || null,
          record.latitude || record.Latitude || null,
          record.longitude || record.Longitude || null,
          record.image || record.Image || null,
          record.google_maps_url || record['Google Maps URL'] || null
        ).run()

        insertedIds.push(result.meta.last_row_id as number)
        successCount++
      } catch (error) {
        console.error(`Error inserting record:`, record, error)
        errorCount++
      }
    }

    return c.json({
      success: true,
      data: {
        message: `Import completed. ${successCount} records inserted, ${errorCount} errors.`,
        insertedIds: insertedIds,
        successCount: successCount,
        errorCount: errorCount
      }
    })

  } catch (error) {
    console.error('Error in import:', error)
    return c.json({
      success: false,
      error: { message: `Import failed: ${error.message}` }
    }, 500)
  }
})

// POST /sql - Execute raw SQL (protected)
api.post('/sql', authMiddleware, async (c) => {
  try {
    const db = c.env.DB
    const { sql } = await c.req.json()

    if (!sql) {
      return c.json({
        success: false,
        error: { message: 'Missing SQL query' }
      }, 400)
    }

    // Basic security: prevent certain dangerous operations
    const normalizedSql = sql.toLowerCase().trim()
    const dangerousKeywords = ['drop', 'truncate', 'alter']

    for (const keyword of dangerousKeywords) {
      if (normalizedSql.includes(keyword)) {
        return c.json({
          success: false,
          error: { message: `SQL contains dangerous keyword: ${keyword}` }
        }, 400)
      }
    }

    let result
    if (normalizedSql.startsWith('select')) {
      // For SELECT queries, return all results
      result = await db.prepare(sql).all()
      return c.json({
        success: true,
        data: {
          results: result.results || [],
          meta: result.meta || {}
        }
      })
    } else {
      // For other queries (INSERT, UPDATE, DELETE), return execution info
      result = await db.prepare(sql).run()
      return c.json({
        success: true,
        data: {
          meta: result.meta || {},
          message: `SQL executed successfully. ${result.meta?.changes || 0} rows affected.`
        }
      })
    }

  } catch (error) {
    console.error('Error in SQL:', error)
    return c.json({
      success: false,
      error: { message: `SQL execution failed: ${error.message}` }
    }, 500)
  }
})

export default api