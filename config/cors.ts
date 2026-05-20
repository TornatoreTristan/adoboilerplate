import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

function resolveAllowedOrigins(): string[] | boolean {
  const rawOrigins = env.get('CORS_ALLOWED_ORIGINS')

  if (rawOrigins) {
    return rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  }

  if (env.get('NODE_ENV') === 'development') {
    return true
  }

  return []
}

const corsConfig = defineConfig({
  enabled: true,
  origin: resolveAllowedOrigins(),
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
