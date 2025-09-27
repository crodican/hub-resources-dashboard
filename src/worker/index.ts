import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-pages'
import api from './api'

// Define environment types
interface Env {
  DB: D1Database
  ENVIRONMENT?: string
}

const app = new Hono<{ Bindings: Env }>()

// Mount your Recovery Resources API under /api prefix
app.route('/api', api)

// Serve React app for all other routes (catch-all for SPA)
app.get('*', serveStatic())

export default app