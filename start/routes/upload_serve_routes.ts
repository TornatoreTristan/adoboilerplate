import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'
import { HttpContext } from '@adonisjs/core/http'
import { join, resolve } from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import LocalStorageDriver from '#uploads/services/storage/local_storage_driver'

router.get('/uploads/signed/:token', async ({ request, response }: HttpContext) => {
  const token = request.param('token')
  const filePath = request.qs()['path'] as string | undefined

  if (!filePath) {
    return response.badRequest('Missing path parameter')
  }

  const driver = new LocalStorageDriver()

  if (!driver.verifySignedUrl(filePath, token)) {
    return response.forbidden('Invalid or expired signed URL')
  }

  const uploadsRoot = resolve(app.makePath('storage/uploads'))
  const fullPath = resolve(join(uploadsRoot, filePath))

  if (!fullPath.startsWith(uploadsRoot + '/') && fullPath !== uploadsRoot) {
    return response.notFound('File not found')
  }

  try {
    const stats = await stat(fullPath)

    if (!stats.isFile()) {
      return response.notFound('File not found')
    }

    const fileBuffer = await readFile(fullPath)

    const ext = filePath.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      webp: 'image/webp',
      pdf: 'application/pdf',
    }

    response.header('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream')
    response.header('Cache-Control', 'private, no-store')
    return response.send(fileBuffer)
  } catch {
    return response.notFound('File not found')
  }
})

router.get('/uploads/*', async ({ request, response }: HttpContext) => {
  const filePath = request.param('*').join('/')
  const uploadsRoot = resolve(app.makePath('storage/uploads'))
  const fullPath = resolve(join(uploadsRoot, filePath))

  if (!fullPath.startsWith(uploadsRoot + '/') && fullPath !== uploadsRoot) {
    return response.notFound('File not found')
  }

  try {
    // Check if file exists
    const stats = await stat(fullPath)

    if (!stats.isFile()) {
      return response.notFound('File not found')
    }

    // Read and serve the file
    const fileBuffer = await readFile(fullPath)

    // Set content type based on extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      webp: 'image/webp',
    }

    response.header('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream')
    response.header('Cache-Control', 'public, max-age=31536000') // 1 year
    return response.send(fileBuffer)
  } catch (error) {
    return response.notFound('File not found')
  }
})
