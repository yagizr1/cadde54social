import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from './env.mjs'
import { createApiApp } from './app.mjs'
import { seedIfEmpty } from './seed.mjs'

loadEnv()
seedIfEmpty()

const root = dirname(fileURLToPath(import.meta.url))
const dist = join(root, '..', 'dist')
const app = createApiApp()

if (existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      res.status(404).json({ error: 'Bulunamadı' })
      return
    }
    res.sendFile(join(dist, 'index.html'))
  })
}

const port = Number(process.env.PORT || 5174)
app.listen(port, () => {
  console.log(`Cadde 54 sunucu http://localhost:${port}`)
})
