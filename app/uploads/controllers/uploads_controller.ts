import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import UploadService from '#uploads/services/upload_service'
import { uploadFileValidator, getUploadsValidator } from '#uploads/validators/upload_validator'
import { E } from '#shared/exceptions/index'
import env from '#start/env'

/** Match a concrete MIME (e.g. `image/jpeg`) against patterns like `image/*`. */
function isMimeAllowed(mime: string, allowlist: string[]): boolean {
  return allowlist.some((pattern) => {
    if (pattern === '*/*') return true
    if (pattern.endsWith('/*')) return mime.startsWith(pattern.slice(0, -1))
    return pattern === mime
  })
}

const allowedMimes = env
  .get('UPLOADS_ALLOWED_MIMES', 'image/*,application/pdf,text/*')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean)

export default class UploadsController {
  async store({ request, user, response }: HttpContext) {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    E.assertUserExists(user)

    const data = await request.validateUsing(uploadFileValidator)

    if (!isMimeAllowed(data.mimeType, allowedMimes)) {
      E.invalidMimeType(data.mimeType, allowedMimes)
    }

    const fileContent = Buffer.from(data.file || '')

    // Cross-check the buffer length with the size declared by the client; a
    // 1-byte buffer claiming size: 10_000_000 is either a bug or an attempt to
    // smuggle metadata that doesn't match the payload.
    if (fileContent.byteLength !== data.size) {
      E.validationError('La taille déclarée ne correspond pas au contenu envoyé', 'size')
    }

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: fileContent,
      filename: data.filename,
      mimeType: data.mimeType,
      size: data.size,
      disk: data.disk || 'local',
      visibility: data.visibility || 'private',
      uploadableType: data.uploadableType,
      uploadableId: data.uploadableId,
      metadata: data.metadata,
    })

    return response.status(201).json({ upload })
  }

  async index({ request, user }: HttpContext) {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    E.assertUserExists(user)

    const filters = await request.validateUsing(getUploadsValidator)

    const uploads = await uploadService.getUploads({
      userId: user.id,
      ...filters,
    })

    return { uploads }
  }

  async show({ params, user, response }: HttpContext) {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    E.assertUserExists(user)

    const upload = await uploadService.getUploadById(params.id)

    if (!upload) {
      return response.status(404).json({ error: 'Upload not found' })
    }

    if (upload.userId !== user.id) {
      return response.status(403).json({ error: 'Forbidden' })
    }

    return { upload }
  }

  async signedUrl({ params, user, response }: HttpContext) {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    E.assertUserExists(user)

    const upload = await uploadService.getUploadById(params.id)

    if (!upload) {
      return response.status(404).json({ error: 'Upload not found' })
    }

    if (upload.userId !== user.id) {
      return response.status(403).json({ error: 'Forbidden' })
    }

    const signedUrl = await uploadService.getSignedUrl(params.id)

    return { signedUrl }
  }

  async destroy({ params, user, response }: HttpContext) {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    E.assertUserExists(user)

    const upload = await uploadService.getUploadById(params.id)

    if (!upload) {
      return response.status(404).json({ error: 'Upload not found' })
    }

    if (upload.userId !== user.id) {
      return response.status(403).json({ error: 'Forbidden' })
    }

    await uploadService.deleteUpload(params.id)

    return { success: true }
  }
}
