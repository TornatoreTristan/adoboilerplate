import { HttpContext } from '@adonisjs/core/http'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import AppSettingsService from '#app_settings/services/app_settings_service'
import UploadService from '#uploads/services/upload_service'
import vine from '@vinejs/vine'
import { E } from '#shared/exceptions/index'
import { readFile } from 'node:fs/promises'

const updateBrandingValidator = vine.compile(
  vine.object({
    appName: vine.string().trim().optional(),
    logoId: vine.string().uuid().nullable().optional(),
    faviconId: vine.string().uuid().nullable().optional(),
  })
)

const updateLegalValidator = vine.compile(
  vine.object({
    termsOfService: vine.string().trim().nullable().optional(),
    termsOfSale: vine.string().trim().nullable().optional(),
    privacyPolicy: vine.string().trim().nullable().optional(),
  })
)

export default class AppSettingsController {
  async index({ inertia, logger }: HttpContext) {
    const appSettingsService = getService<AppSettingsService>(TYPES.AppSettingsService)
    const settings = await appSettingsService.getSettings()

    logger.info('📄 Loading settings page', {
      logoId: settings.logoId,
      faviconId: settings.faviconId,
      hasLogo: !!settings.logo,
      hasFavicon: !!settings.favicon,
    })

    return inertia.render('admin/settings', {
      settings: {
        id: settings.id,
        appName: settings.appName,
        logoId: settings.logoId,
        faviconId: settings.faviconId,
        termsOfService: settings.termsOfService,
        termsOfSale: settings.termsOfSale,
        privacyPolicy: settings.privacyPolicy,
        logo: settings.logo
          ? {
              id: settings.logo.id,
              filename: settings.logo.filename,
              url: settings.logo.url,
            }
          : null,
        favicon: settings.favicon
          ? {
              id: settings.favicon.id,
              filename: settings.favicon.filename,
              url: settings.favicon.url,
            }
          : null,
      },
    })
  }

  async updateBranding({ request, response }: HttpContext) {
    const appSettingsService = getService<AppSettingsService>(TYPES.AppSettingsService)
    const data = await request.validateUsing(updateBrandingValidator)

    await appSettingsService.updateBranding(data.appName, data.logoId, data.faviconId)

    return response.redirect().back()
  }

  async updateLegal({ request, response }: HttpContext) {
    const appSettingsService = getService<AppSettingsService>(TYPES.AppSettingsService)
    const data = await request.validateUsing(updateLegalValidator)

    await appSettingsService.updateLegalDocuments(
      data.termsOfService,
      data.termsOfSale,
      data.privacyPolicy
    )

    return response.redirect().back()
  }

  async uploadLogo({ request, response, user, session }: HttpContext) {
    E.assertUserExists(user)

    const file = request.file('logo', {
      size: '2mb',
      extnames: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
    })

    if (!file) {
      session.flash('error', 'Aucun fichier fourni')
      return response.redirect().back()
    }

    const uploadService = getService<UploadService>(TYPES.UploadService)
    const appSettingsService = getService<AppSettingsService>(TYPES.AppSettingsService)

    try {
      // Read file buffer from temporary path
      const fileBuffer = await readFile(file.tmpPath!)

      const safeName = file.clientName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const upload = await uploadService.uploadFile({
        userId: user.id,
        file: fileBuffer,
        filename: safeName,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        disk: 'local',
        visibility: 'public',
        storagePath: `logos/${safeName}`,
      })

      await appSettingsService.updateBranding(undefined, upload.id, undefined)

      session.flash('success', 'Logo mis à jour avec succès')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Erreur lors de l\'upload du logo')
      return response.redirect().back()
    }
  }

  async uploadFavicon({ request, response, user, session, logger }: HttpContext) {
    E.assertUserExists(user)

    const file = request.file('favicon', {
      size: '1mb',
      extnames: ['ico', 'png'],
    })

    if (!file) {
      session.flash('error', 'Aucun fichier fourni')
      return response.redirect().back()
    }

    const uploadService = getService<UploadService>(TYPES.UploadService)
    const appSettingsService = getService<AppSettingsService>(TYPES.AppSettingsService)

    try {
      logger.info('📁 Uploading favicon', {
        filename: file.clientName,
        size: file.size,
        type: file.type,
      })

      // Read file buffer from temporary path
      const fileBuffer = await readFile(file.tmpPath!)

      const safeName = file.clientName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const upload = await uploadService.uploadFile({
        userId: user.id,
        file: fileBuffer,
        filename: safeName,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        disk: 'local',
        visibility: 'public',
        storagePath: `favicons/${safeName}`,
      })

      logger.info('✅ Favicon uploaded', {
        uploadId: upload.id,
        storagePath: upload.storagePath,
      })

      const updated = await appSettingsService.updateBranding(undefined, undefined, upload.id)

      logger.info('✅ App settings updated', {
        faviconId: updated.faviconId,
      })

      session.flash('success', 'Favicon mis à jour avec succès')
      return response.redirect().back()
    } catch (error) {
      logger.error('❌ Favicon upload error', error)
      session.flash('error', error.message || 'Erreur lors de l\'upload du favicon')
      return response.redirect().back()
    }
  }
}
