import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type ImageOptimizationService from '#uploads/services/image_optimization_service'
import sharp from 'sharp'

test.group('ImageOptimizationService', () => {
  test('should identify image mime types correctly', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    assert.isTrue(imageOptimizationService.isImage('image/jpeg'))
    assert.isTrue(imageOptimizationService.isImage('image/png'))
    assert.isTrue(imageOptimizationService.isImage('image/webp'))
    assert.isTrue(imageOptimizationService.isImage('image/gif'))
    assert.isFalse(imageOptimizationService.isImage('application/pdf'))
    assert.isFalse(imageOptimizationService.isImage('text/plain'))
  })

  test('should optimize JPEG image', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const testImage = await sharp({
      create: {
        width: 1000,
        height: 800,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer()

    const result = await imageOptimizationService.optimizeImage(testImage, 'test.jpg', {
      quality: 80,
      maxWidth: 800,
      maxHeight: 600,
    })

    assert.exists(result.buffer)
    assert.equal(result.format, 'jpeg')
    assert.isAtMost(result.width, 800)
    assert.isAtMost(result.height, 600)
    assert.isBelow(result.size, result.originalSize)
    assert.isAbove(result.reductionPercent, 0)
  })

  test('should optimize PNG image', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const testImage = await sharp({
      create: {
        width: 500,
        height: 500,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer()

    const result = await imageOptimizationService.optimizeImage(testImage, 'test.png', {
      quality: 80,
    })

    assert.exists(result.buffer)
    assert.equal(result.format, 'png')
    assert.equal(result.width, 500)
    assert.equal(result.height, 500)
  })

  test('should convert image to WebP', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const testImage = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .jpeg()
      .toBuffer()

    const result = await imageOptimizationService.optimizeImage(testImage, 'test.jpg', {
      convertToWebP: true,
      quality: 80,
    })

    assert.exists(result.buffer)
    assert.equal(result.format, 'webp')
    assert.isBelow(result.size, result.originalSize)
  })

  test('should resize large images', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const testImage = await sharp({
      create: {
        width: 3000,
        height: 2000,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .jpeg()
      .toBuffer()

    const result = await imageOptimizationService.optimizeImage(testImage, 'large.jpg', {
      maxWidth: 1920,
      maxHeight: 1080,
    })

    assert.isAtMost(result.width, 1920)
    assert.isAtMost(result.height, 1080)
  })

  test('should not upscale smaller images', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const testImage = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .jpeg()
      .toBuffer()

    const result = await imageOptimizationService.optimizeImage(testImage, 'small.jpg', {
      maxWidth: 1920,
      maxHeight: 1080,
    })

    assert.equal(result.width, 200)
    assert.equal(result.height, 150)
  })

  test('should generate thumbnail', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const testImage = await sharp({
      create: {
        width: 1000,
        height: 800,
        channels: 3,
        background: { r: 100, g: 100, b: 100 },
      },
    })
      .jpeg()
      .toBuffer()

    const thumbnail = await imageOptimizationService.generateThumbnail(testImage, 200, 200)

    const metadata = await sharp(thumbnail).metadata()

    assert.exists(thumbnail)
    assert.equal(metadata.width, 200)
    assert.equal(metadata.height, 200)
    assert.equal(metadata.format, 'jpeg')
  })

  test('should get image metadata', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const testImage = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: { r: 200, g: 200, b: 200 },
      },
    })
      .jpeg()
      .toBuffer()

    const metadata = await imageOptimizationService.getMetadata(testImage)

    assert.exists(metadata)
    assert.equal(metadata!.width, 640)
    assert.equal(metadata!.height, 480)
    assert.equal(metadata!.format, 'jpeg')
  })

  test('should validate valid image', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const testImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer()

    const isValid = await imageOptimizationService.validateImage(testImage)

    assert.isTrue(isValid)
  })

  test('should reject invalid image', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const invalidBuffer = Buffer.from('not an image')

    const isValid = await imageOptimizationService.validateImage(invalidBuffer)

    assert.isFalse(isValid)
  })

  test('should handle optimization errors gracefully', async ({ assert }) => {
    const imageOptimizationService = getService<ImageOptimizationService>(
      TYPES.ImageOptimizationService
    )

    const invalidBuffer = Buffer.from('invalid image data')

    const result = await imageOptimizationService.optimizeImage(invalidBuffer, 'invalid.jpg')

    assert.exists(result.buffer)
    assert.equal(result.reductionPercent, 0)
    assert.equal(result.size, result.originalSize)
  })
})
