import { injectable } from 'inversify'
import sharp from 'sharp'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

export interface OptimizationOptions {
  /**
   * Maximum width in pixels (default: 2048)
   */
  maxWidth?: number

  /**
   * Maximum height in pixels (default: 2048)
   */
  maxHeight?: number

  /**
   * Quality for JPEG/WebP compression (1-100, default: 80)
   */
  quality?: number

  /**
   * Convert to WebP format (default: false)
   */
  convertToWebP?: boolean

  /**
   * Strip metadata (EXIF, etc.) for privacy (default: true)
   */
  stripMetadata?: boolean

  /**
   * Fit mode: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' (default: 'inside')
   */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

export interface OptimizationResult {
  buffer: Buffer
  width: number
  height: number
  format: string
  size: number
  originalSize: number
  reductionPercent: number
}

@injectable()
export default class ImageOptimizationService {
  /**
   * Check if a file is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/')
  }

  /**
   * Optimize an image
   */
  async optimizeImage(
    buffer: Buffer,
    filename: string,
    options: OptimizationOptions = {}
  ): Promise<OptimizationResult> {
    const {
      maxWidth = parseInt(env.get('IMAGE_MAX_WIDTH', '2048')),
      maxHeight = parseInt(env.get('IMAGE_MAX_HEIGHT', '2048')),
      quality = parseInt(env.get('IMAGE_QUALITY', '80')),
      convertToWebP = env.get('IMAGE_CONVERT_TO_WEBP', 'false') === 'true',
      stripMetadata = env.get('IMAGE_STRIP_METADATA', 'true') === 'true',
      fit = 'inside',
    } = options

    const originalSize = buffer.length

    try {
      let pipeline = sharp(buffer)

      // Get original metadata
      const metadata = await pipeline.metadata()
      logger.debug(`Optimizing image: ${filename}`, {
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        originalFormat: metadata.format,
        originalSize: originalSize,
      })

      // Resize if needed
      if (metadata.width! > maxWidth || metadata.height! > maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit,
          withoutEnlargement: true, // Don't upscale smaller images
        })
      }

      // Strip metadata for privacy
      if (stripMetadata) {
        pipeline = pipeline.rotate() // Auto-rotate based on EXIF
      }

      // Convert to WebP or optimize original format
      if (convertToWebP) {
        pipeline = pipeline.webp({ quality })
      } else {
        // Optimize based on original format
        switch (metadata.format) {
          case 'jpeg':
          case 'jpg':
            pipeline = pipeline.jpeg({ quality, mozjpeg: true })
            break
          case 'png':
            pipeline = pipeline.png({ quality, compressionLevel: 9 })
            break
          case 'webp':
            pipeline = pipeline.webp({ quality })
            break
          case 'gif':
            // GIF is tricky, keep original if animated
            break
          default:
            // Keep original format
            break
        }
      }

      // Execute pipeline
      const optimizedBuffer = await pipeline.toBuffer()
      const optimizedMetadata = await sharp(optimizedBuffer).metadata()

      const reductionPercent = ((originalSize - optimizedBuffer.length) / originalSize) * 100

      logger.info(`✅ Image optimized: ${filename}`, {
        originalSize: originalSize,
        optimizedSize: optimizedBuffer.length,
        reduction: `${reductionPercent.toFixed(2)}%`,
        width: optimizedMetadata.width,
        height: optimizedMetadata.height,
        format: optimizedMetadata.format,
      })

      return {
        buffer: optimizedBuffer,
        width: optimizedMetadata.width!,
        height: optimizedMetadata.height!,
        format: optimizedMetadata.format!,
        size: optimizedBuffer.length,
        originalSize,
        reductionPercent,
      }
    } catch (error) {
      logger.error('Failed to optimize image', {
        filename,
        error: error.message,
      })

      // The buffer was rejected by sharp once already; calling sharp again
      // here just to read metadata would throw the same error and turn the
      // graceful fallback into a hard failure. Try to read it best-effort
      // and fall back to safe defaults.
      logger.warn(`⚠️  Image optimization failed for ${filename}, using original`)
      let width = 0
      let height = 0
      let format = 'unknown'
      try {
        const metadata = await sharp(buffer).metadata()
        width = metadata.width ?? 0
        height = metadata.height ?? 0
        format = metadata.format ?? 'unknown'
      } catch {
        // ignore — invalid buffer, defaults already set
      }

      return {
        buffer,
        width,
        height,
        format,
        size: buffer.length,
        originalSize: buffer.length,
        reductionPercent: 0,
      }
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(
    buffer: Buffer,
    width: number = 200,
    height: number = 200
  ): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer()
    } catch (error) {
      logger.error('Failed to generate thumbnail', { error: error.message })
      throw error
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(buffer: Buffer) {
    try {
      return await sharp(buffer).metadata()
    } catch (error) {
      logger.error('Failed to get image metadata', { error: error.message })
      return null
    }
  }

  /**
   * Validate image (check if valid image file)
   */
  async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      await sharp(buffer).metadata()
      return true
    } catch (error) {
      logger.warn('Invalid image file', { error: error.message })
      return false
    }
  }
}
