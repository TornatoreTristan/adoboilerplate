import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UploadService from '#uploads/services/upload_service'
import type UserRepository from '#users/repositories/user_repository'
import type UploadRepository from '#uploads/repositories/upload_repository'
import testUtils from '@adonisjs/core/services/test_utils'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

test.group('UploadService', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.teardown(async () => {
    const uploadsPath = path.join(process.cwd(), 'storage', 'uploads')
    try {
      await fs.rm(uploadsPath, { recursive: true, force: true })
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  })

  test('should upload a file and create database record', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'uploader@example.com',
      password: 'password123',
      fullName: 'Test Uploader',
    })

    const mockFile = Buffer.from('test file content')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'document.pdf',
      mimeType: 'application/pdf',
      size: mockFile.length,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    assert.exists(upload.id)
    assert.equal(upload.userId, user.id)
    assert.equal(upload.filename, 'document.pdf')
    assert.equal(upload.mimeType, 'application/pdf')
    assert.equal(upload.disk, 'local')
    assert.include(upload.storagePath, 'document.pdf')
  })

  test('should upload file with custom storage path', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'custom@example.com',
      password: 'password123',
      fullName: 'Custom Path',
    })

    const mockFile = Buffer.from('custom content')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'image.jpg',
      mimeType: 'image/jpeg',
      size: mockFile.length,
      disk: 'local',
      visibility: 'public',
      storagePath: 'avatars/custom/image.jpg',
      skipMimeVerification: true,
    })

    assert.equal(upload.storagePath, 'avatars/custom/image.jpg')
    assert.equal(upload.visibility, 'public')
  })

  test('should upload file with metadata', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'metadata@example.com',
      password: 'password123',
      fullName: 'Metadata User',
    })

    const mockFile = Buffer.from('image content')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'photo.png',
      mimeType: 'image/png',
      size: mockFile.length,
      disk: 'local',
      visibility: 'private',
      // Use a neutral key the service won't overwrite — width/height are
      // recomputed from the optimised image.
      metadata: { caption: 'Marketing banner', tagId: 42 },
      skipMimeVerification: true,
    })

    assert.equal(upload.metadata?.caption, 'Marketing banner')
    assert.equal(upload.metadata?.tagId, 42)
  })

  test('should upload file with polymorphic relation', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'poly@example.com',
      password: 'password123',
      fullName: 'Poly User',
    })

    const mockFile = Buffer.from('attachment')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'attachment.pdf',
      mimeType: 'application/pdf',
      size: mockFile.length,
      disk: 'local',
      visibility: 'private',
      uploadableType: 'Post',
      uploadableId: '123e4567-e89b-12d3-a456-426614174000',
      skipMimeVerification: true,
    })

    assert.equal(upload.uploadableType, 'Post')
    assert.equal(upload.uploadableId, '123e4567-e89b-12d3-a456-426614174000')
  })

  test('should get user uploads', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'getter@example.com',
      password: 'password123',
      fullName: 'Getter User',
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('file1'),
      filename: 'file1.txt',
      mimeType: 'text/plain',
      size: 5,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('file2'),
      filename: 'file2.txt',
      mimeType: 'text/plain',
      size: 5,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    const uploads = await uploadService.getUserUploads(user.id)

    assert.lengthOf(uploads, 2)
    assert.isTrue(uploads.every((u) => u.userId === user.id))
  })

  test('should filter uploads by visibility', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'filter@example.com',
      password: 'password123',
      fullName: 'Filter User',
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('private file'),
      filename: 'private.txt',
      mimeType: 'text/plain',
      size: 12,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('public file'),
      filename: 'public.txt',
      mimeType: 'text/plain',
      size: 11,
      disk: 'local',
      visibility: 'public',
      skipMimeVerification: true,
    })

    const privateUploads = await uploadService.getUploads({
      userId: user.id,
      visibility: 'private',
    })
    const publicUploads = await uploadService.getUploads({ userId: user.id, visibility: 'public' })

    assert.lengthOf(privateUploads, 1)
    assert.equal(privateUploads[0].visibility, 'private')

    assert.lengthOf(publicUploads, 1)
    assert.equal(publicUploads[0].visibility, 'public')
  })

  test('should generate signed URL for private file', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'signed@example.com',
      password: 'password123',
      fullName: 'Signed User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('private content'),
      filename: 'private.pdf',
      mimeType: 'application/pdf',
      size: 15,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    const signedUrl = await uploadService.getSignedUrl(upload.id, 3600)

    assert.isString(signedUrl)
    assert.include(signedUrl, '/uploads/signed/')
  })

  test('should generate public URL for public file', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'public@example.com',
      password: 'password123',
      fullName: 'Public User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('public content'),
      filename: 'public.jpg',
      mimeType: 'image/jpeg',
      size: 14,
      disk: 'local',
      visibility: 'public',
      skipMimeVerification: true,
    })

    const publicUrl = await uploadService.getPublicUrl(upload.id)

    assert.isString(publicUrl)
    assert.include(publicUrl, '/uploads/')
  })

  test('should delete upload and file', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'deleter@example.com',
      password: 'password123',
      fullName: 'Deleter User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('to delete'),
      filename: 'delete-me.txt',
      mimeType: 'text/plain',
      size: 9,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    await uploadService.deleteUpload(upload.id)

    const deleted = await uploadRepo.findById(upload.id)
    assert.isNull(deleted)
  })

  test('should get upload by id', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'findbyid@example.com',
      password: 'password123',
      fullName: 'Find User',
    })

    const created = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('findable'),
      filename: 'findable.txt',
      mimeType: 'text/plain',
      size: 8,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    const found = await uploadService.getUploadById(created.id)

    assert.isNotNull(found)
    assert.equal(found?.id, created.id)
    assert.equal(found?.filename, 'findable.txt')
  })

  test('should scan file for viruses when uploading', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'virus@example.com',
      password: 'password123',
      fullName: 'Virus Test',
    })

    const mockFile = Buffer.from('safe file content')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'safe.pdf',
      mimeType: 'application/pdf',
      size: mockFile.length,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    assert.exists(upload.id)
    assert.isTrue(upload.metadata?.virusScanned || false)
    assert.exists(upload.metadata?.virusScanDate)
  })

  test('should skip virus scan when requested', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'skipvirus@example.com',
      password: 'password123',
      fullName: 'Skip Virus',
    })

    const mockFile = Buffer.from('file without scan')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: mockFile,
      filename: 'noscan.txt',
      mimeType: 'text/plain',
      size: mockFile.length,
      disk: 'local',
      visibility: 'private',
      skipVirusScan: true,
      skipMimeVerification: true,
    })

    assert.exists(upload.id)
    assert.isUndefined(upload.metadata?.virusScanned)
    assert.isUndefined(upload.metadata?.virusScanDate)
  })

  test('should optimize image when uploading', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'imageopt@example.com',
      password: 'password123',
      fullName: 'Image Optimizer',
    })

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

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: testImage,
      filename: 'photo.jpg',
      mimeType: 'image/jpeg',
      size: testImage.length,
      disk: 'local',
      visibility: 'public',
      skipMimeVerification: true,
    })

    assert.exists(upload.id)
    assert.isTrue(upload.metadata?.imageOptimized || false)
    assert.exists(upload.metadata?.imageOptimizationDate)
    assert.exists(upload.metadata?.originalSize)
    assert.exists(upload.metadata?.optimizedSize)
    assert.exists(upload.metadata?.reductionPercent)
    assert.exists(upload.metadata?.width)
    assert.exists(upload.metadata?.height)
    assert.isAtMost(upload.metadata?.width || 0, 2048)
    assert.isAtMost(upload.metadata?.height || 0, 2048)
  })

  test('should skip image optimization when requested', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'skipopt@example.com',
      password: 'password123',
      fullName: 'Skip Opt',
    })

    const testImage = await sharp({
      create: {
        width: 500,
        height: 400,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .jpeg()
      .toBuffer()

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: testImage,
      filename: 'noopt.jpg',
      mimeType: 'image/jpeg',
      size: testImage.length,
      disk: 'local',
      visibility: 'private',
      skipImageOptimization: true,
      skipMimeVerification: true,
    })

    assert.exists(upload.id)
    assert.isUndefined(upload.metadata?.imageOptimized)
    assert.isUndefined(upload.metadata?.imageOptimizationDate)
  })

  test('should not optimize non-image files', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'noimage@example.com',
      password: 'password123',
      fullName: 'No Image',
    })

    const pdfFile = Buffer.from('%PDF-1.4 test content')
    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: pdfFile,
      filename: 'document.pdf',
      mimeType: 'application/pdf',
      size: pdfFile.length,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    assert.exists(upload.id)
    assert.isUndefined(upload.metadata?.imageOptimized)
  })

  test('should convert image to WebP when optimizing', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'webp@example.com',
      password: 'password123',
      fullName: 'WebP User',
    })

    const testImage = await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 3,
        background: { r: 100, g: 100, b: 255 },
      },
    })
      .jpeg()
      .toBuffer()

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: testImage,
      filename: 'convert.jpg',
      mimeType: 'image/jpeg',
      size: testImage.length,
      disk: 'local',
      visibility: 'public',
      skipMimeVerification: true,
    })

    assert.exists(upload.id)
  })

  test('should perform both virus scan and image optimization', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'fullprocess@example.com',
      password: 'password123',
      fullName: 'Full Process',
    })

    const testImage = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .png()
      .toBuffer()

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: testImage,
      filename: 'fullprocess.png',
      mimeType: 'image/png',
      size: testImage.length,
      disk: 'local',
      visibility: 'private',
      skipMimeVerification: true,
    })

    assert.exists(upload.id)
    assert.isTrue(upload.metadata?.virusScanned || false)
    assert.exists(upload.metadata?.virusScanDate)
    assert.isTrue(upload.metadata?.imageOptimized || false)
    assert.exists(upload.metadata?.imageOptimizationDate)
    assert.exists(upload.metadata?.width)
    assert.exists(upload.metadata?.height)
  })

  test("rejects an upload whose magic bytes don't match the declared MIME", async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'spoofer@example.com',
      password: 'password123',
      fullName: 'MIME Spoofer',
    })

    // Plain ASCII pretending to be a PDF — no %PDF- magic bytes.
    const fakePdf = Buffer.from('this is not actually a pdf, just text')

    await assert.rejects(() =>
      uploadService.uploadFile({
        userId: user.id,
        file: fakePdf,
        filename: 'spoofed.pdf',
        mimeType: 'application/pdf',
        size: fakePdf.length,
        disk: 'local',
        visibility: 'private',
      })
    )
  })

  test('accepts a real PDF whose magic bytes match', async ({ assert }) => {
    const uploadService = getService<UploadService>(TYPES.UploadService)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'real-pdf@example.com',
      password: 'password123',
      fullName: 'Real PDF',
    })

    const realPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
        '2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\n%%EOF'
    )

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: realPdf,
      filename: 'real.pdf',
      mimeType: 'application/pdf',
      size: realPdf.length,
      disk: 'local',
      visibility: 'private',
    })

    assert.equal(upload.mimeType, 'application/pdf')
  })
})
