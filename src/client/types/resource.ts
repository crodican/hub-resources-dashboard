export interface ResourceData {
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

export interface LookupTable {
  id: number
  name: string
}

export interface FilterData {
  counties: LookupTable[]
  resourceTypes: LookupTable[]
  categories: LookupTable[]
  populations: LookupTable[]
}