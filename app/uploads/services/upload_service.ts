import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import UploadRepository from '#uploads/repositories/upload_repository'
import StorageService from '#uploads/services/storage_service'
import AntivirusService from '#uploads/services/antivirus_service'
import ImageOptimizationService from '#uploads/services/image_optimization_service'
import Upload from '#uploads/models/upload'
import type { UploadFilters, UploadMetadata, DiskType, VisibilityType } from '#uploads/types/upload'
import logger from '@adonisjs/core/services/logger'
import { E } from '#shared/exceptions/index'

export interface UploadFileOptions {
  userId: string
  file: Buffer
  filename: string
  mimeType: string
  size: number
  disk: DiskType
  visibility: VisibilityType
  storagePath?: string
  uploadableType?: string
  uploadableId?: string
  metadata?: UploadMetadata
  /**
   * Skip virus scanning (default: false)
   */
  skipVirusScan?: boolean
  /**
   * Skip image optimization (default: false)
   */
  skipImageOptimization?: boolean
}

@injectable()
export default class UploadService {
  constructor(
    @inject(TYPES.UploadRepository) private uploadRepo: UploadRepository,
    @inject(TYPES.StorageService) private storageService: StorageService,
    @inject(TYPES.AntivirusService) private antivirusService: AntivirusService,
    @inject(TYPES.ImageOptimizationService)
    private imageOptimizationService: ImageOptimizationService
  ) {}

  async uploadFile(options: UploadFileOptions): Promise<Upload> {
    let processedFile = options.file
    let processedSize = options.size
    let processedFilename = options.filename
    let processedMimeType = options.mimeType
    const metadata: UploadMetadata = options.metadata || {}

    // Step 1: Virus Scanning
    if (!options.skipVirusScan) {
      logger.info(`🔍 Scanning file for viruses: ${options.filename}`)
      const scanResult = await this.antivirusService.scanBuffer(options.file, options.filename)

      if (scanResult.isInfected) {
        logger.error(`🦠 VIRUS DETECTED - Upload blocked: ${options.filename}`, {
          viruses: scanResult.viruses,
        })
        throw E.virusDetected(options.filename, scanResult.viruses)
      }

      metadata.virusScanned = true
      metadata.virusScanDate = new Date().toISOString()
    }

    // Step 2: Image Optimization
    if (!options.skipImageOptimization && this.imageOptimizationService.isImage(options.mimeType)) {
      logger.info(`🖼️  Optimizing image: ${options.filename}`)

      try {
        const optimizationResult = await this.imageOptimizationService.optimizeImage(
          options.file,
          options.filename
        )

        // Use optimized buffer
        processedFile = optimizationResult.buffer
        processedSize = optimizationResult.size

        // Update metadata
        metadata.imageOptimized = true
        metadata.imageOptimizationDate = new Date().toISOString()
        metadata.originalSize = optimizationResult.originalSize
        metadata.optimizedSize = optimizationResult.size
        metadata.reductionPercent = optimizationResult.reductionPercent
        metadata.width = optimizationResult.width
        metadata.height = optimizationResult.height

        // Update filename if converted to WebP
        if (optimizationResult.format === 'webp' && !options.filename.endsWith('.webp')) {
          processedFilename = options.filename.replace(/\.[^.]+$/, '.webp')
          processedMimeType = 'image/webp'
        }

        logger.info(
          `✅ Image optimized successfully: ${options.filename} (${optimizationResult.reductionPercent.toFixed(2)}% reduction)`
        )
      } catch (error) {
        logger.warn(`⚠️  Image optimization failed: ${options.filename}`, {
          error: error.message,
        })
        // Continue with original file
      }
    }

    // Step 3: Store file
    const storagePath = options.storagePath || this.generateStoragePath(processedFilename)

    await this.storageService.store(processedFile, storagePath, {
      disk: options.disk,
      visibility: options.visibility,
      contentType: processedMimeType,
    })

    // Step 4: Create database record
    const upload = await this.uploadRepo.create({
      userId: options.userId,
      filename: processedFilename,
      storagePath,
      disk: options.disk,
      mimeType: processedMimeType,
      size: processedSize,
      visibility: options.visibility,
      uploadableType: options.uploadableType || null,
      uploadableId: options.uploadableId || null,
      metadata,
    })

    return upload
  }

  async getUserUploads(userId: string): Promise<Upload[]> {
    return this.uploadRepo.findByUserId(userId)
  }

  async getUploads(filters: UploadFilters): Promise<Upload[]> {
    return this.uploadRepo.findBy(filters)
  }

  async getUploadById(id: string): Promise<Upload | null> {
    return this.uploadRepo.findById(id)
  }

  async getSignedUrl(uploadId: string, expiresIn: number = 3600): Promise<string> {
    const upload = await this.uploadRepo.findById(uploadId)
    if (!upload) {
      throw E.uploadNotFound(uploadId)
    }

    return this.storageService.getSignedUrl(upload.storagePath, upload.disk, expiresIn)
  }

  async getPublicUrl(uploadId: string): Promise<string> {
    const upload = await this.uploadRepo.findById(uploadId)
    if (!upload) {
      throw E.uploadNotFound(uploadId)
    }

    return this.storageService.getPublicUrl(upload.storagePath, upload.disk)
  }

  async deleteUpload(id: string): Promise<void> {
    const upload = await this.uploadRepo.findById(id)
    if (!upload) {
      throw E.uploadNotFound(id)
    }

    await this.storageService.delete(upload.storagePath, upload.disk)
    await this.uploadRepo.delete(id)
  }

  private generateStoragePath(filename: string): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const timestamp = Date.now()
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

    return `uploads/${year}/${month}/${timestamp}-${sanitized}`
  }
}
