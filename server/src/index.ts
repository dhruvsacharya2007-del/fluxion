import express from 'express'
import type { HealthResponse } from '@fluxion/shared'

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.get('/health', (_req, res) => {
  const body: HealthResponse = { status: 'ok' }
  res.json(body)
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})