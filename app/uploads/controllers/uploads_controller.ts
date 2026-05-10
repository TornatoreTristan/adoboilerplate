import type { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import UploadService from '#uploads/services/upload_service'
import { uploadFileValidator, getUploadsValidator } from '#uploads/validators/upload_validator'
import { E } from '#shared/exceptions/index'

export default class UploadsController {
  async store({ request, user, response }: HttpContext) {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    E.assertUserExists(user)

    const data = await request.validateUsing(uploadFileValidator)

    const fileContent = Buffer.from(data.file || '')

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: fileContent,
      filename: request.input('filename'),
      mimeType: request.input('mimeType'),
      size: request.input('size'),
      disk: data.disk || 'local',
      visibility: data.visibility || 'private',
      uploadableType: data.uploadableType,
      uploadableId: data.uploadableId,
      metadata: request.input('metadata'),
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
