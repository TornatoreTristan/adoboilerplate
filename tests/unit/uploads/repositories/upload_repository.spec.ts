import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type UploadRepository from '#uploads/repositories/upload_repository'
import type UserRepository from '#users/repositories/user_repository'
import testUtils from '@adonisjs/core/services/test_utils'
import type { CreateUploadData } from '#uploads/types/upload'

test.group('UploadRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create an upload record', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'uploader@example.com',
      password: 'password123',
      fullName: 'Test Uploader',
    })

    const uploadData: CreateUploadData = {
      userId: user.id,
      filename: 'test-file.pdf',
      storagePath: 'uploads/2025/test-file.pdf',
      disk: 'local',
      mimeType: 'application/pdf',
      size: 1024000,
      visibility: 'private',
    }

    const result = await uploadRepo.create(uploadData)

    assert.exists(result.id)
    assert.equal(result.userId, user.id)
    assert.equal(result.filename, 'test-file.pdf')
    assert.equal(result.storagePath, 'uploads/2025/test-file.pdf')
    assert.equal(result.disk, 'local')
    assert.equal(result.visibility, 'private')
    assert.equal(result.size, 1024000)
  })

  test('should create upload with polymorphic relation', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'uploader2@example.com',
      password: 'password123',
      fullName: 'Test Uploader 2',
    })

    const uploadData: CreateUploadData = {
      userId: user.id,
      filename: 'avatar.jpg',
      storagePath: 'avatars/avatar.jpg',
      disk: 's3',
      mimeType: 'image/jpeg',
      size: 500000,
      visibility: 'public',
      uploadableType: 'User',
      uploadableId: user.id,
      metadata: { width: 800, height: 600 },
    }

    const result = await uploadRepo.create(uploadData)

    assert.equal(result.uploadableType, 'User')
    assert.equal(result.uploadableId, user.id)
    assert.deepEqual(result.metadata, { width: 800, height: 600 })
  })

  test('should find upload by id', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'finder@example.com',
      password: 'password123',
      fullName: 'Test Finder',
    })

    const created = await uploadRepo.create({
      userId: user.id,
      filename: 'document.pdf',
      storagePath: 'docs/document.pdf',
      disk: 'local',
      mimeType: 'application/pdf',
      size: 2048000,
      visibility: 'private',
    })

    const found = await uploadRepo.findById(created.id)

    assert.isNotNull(found)
    assert.equal(found?.id, created.id)
    assert.equal(found?.filename, 'document.pdf')
  })

  test('should return null when upload not found', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)

    const result = await uploadRepo.findById('00000000-0000-0000-0000-000000000000')

    assert.isNull(result)
  })

  test('should find all uploads for a user', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'multiupload@example.com',
      password: 'password123',
      fullName: 'Multi Uploader',
    })

    await uploadRepo.create({
      userId: user.id,
      filename: 'file1.pdf',
      storagePath: 'files/file1.pdf',
      disk: 'local',
      mimeType: 'application/pdf',
      size: 1000,
      visibility: 'private',
    })

    await uploadRepo.create({
      userId: user.id,
      filename: 'file2.jpg',
      storagePath: 'images/file2.jpg',
      disk: 's3',
      mimeType: 'image/jpeg',
      size: 2000,
      visibility: 'public',
    })

    const uploads = await uploadRepo.findByUserId(user.id)

    assert.lengthOf(uploads, 2)
    assert.isTrue(uploads.every((u) => u.userId === user.id))
  })

  test('should filter uploads by disk type', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'diskfilter@example.com',
      password: 'password123',
      fullName: 'Disk Filter',
    })

    await uploadRepo.create({
      userId: user.id,
      filename: 'local-file.txt',
      storagePath: 'local/file.txt',
      disk: 'local',
      mimeType: 'text/plain',
      size: 100,
      visibility: 'private',
    })

    await uploadRepo.create({
      userId: user.id,
      filename: 's3-file.txt',
      storagePath: 's3/file.txt',
      disk: 's3',
      mimeType: 'text/plain',
      size: 100,
      visibility: 'private',
    })

    const localUploads = await uploadRepo.findBy({ userId: user.id, disk: 'local' })
    const s3Uploads = await uploadRepo.findBy({ userId: user.id, disk: 's3' })

    assert.lengthOf(localUploads, 1)
    assert.equal(localUploads[0].disk, 'local')

    assert.lengthOf(s3Uploads, 1)
    assert.equal(s3Uploads[0].disk, 's3')
  })

  test('should filter uploads by visibility', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'visibility@example.com',
      password: 'password123',
      fullName: 'Visibility Tester',
    })

    await uploadRepo.create({
      userId: user.id,
      filename: 'public-file.jpg',
      storagePath: 'public/file.jpg',
      disk: 'local',
      mimeType: 'image/jpeg',
      size: 100,
      visibility: 'public',
    })

    await uploadRepo.create({
      userId: user.id,
      filename: 'private-file.pdf',
      storagePath: 'private/file.pdf',
      disk: 'local',
      mimeType: 'application/pdf',
      size: 100,
      visibility: 'private',
    })

    const publicUploads = await uploadRepo.findBy({ userId: user.id, visibility: 'public' })
    const privateUploads = await uploadRepo.findBy({ userId: user.id, visibility: 'private' })

    assert.lengthOf(publicUploads, 1)
    assert.equal(publicUploads[0].visibility, 'public')

    assert.lengthOf(privateUploads, 1)
    assert.equal(privateUploads[0].visibility, 'private')
  })

  test('should find uploads by uploadable type and id', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'polymorphic@example.com',
      password: 'password123',
      fullName: 'Polymorphic Tester',
    })

    const postId = '123e4567-e89b-12d3-a456-426614174000'

    await uploadRepo.create({
      userId: user.id,
      filename: 'attachment.pdf',
      storagePath: 'attachments/file.pdf',
      disk: 'local',
      mimeType: 'application/pdf',
      size: 1000,
      visibility: 'private',
      uploadableType: 'Post',
      uploadableId: postId,
    })

    await uploadRepo.create({
      userId: user.id,
      filename: 'avatar.jpg',
      storagePath: 'avatars/avatar.jpg',
      disk: 'local',
      mimeType: 'image/jpeg',
      size: 500,
      visibility: 'public',
      uploadableType: 'User',
      uploadableId: user.id,
    })

    const postUploads = await uploadRepo.findBy({
      uploadableType: 'Post',
      uploadableId: postId,
    })

    const userUploads = await uploadRepo.findBy({
      uploadableType: 'User',
      uploadableId: user.id,
    })

    assert.lengthOf(postUploads, 1)
    assert.equal(postUploads[0].uploadableType, 'Post')

    assert.lengthOf(userUploads, 1)
    assert.equal(userUploads[0].uploadableType, 'User')
  })

  test('should soft delete upload', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'deleter@example.com',
      password: 'password123',
      fullName: 'Deleter',
    })

    const upload = await uploadRepo.create({
      userId: user.id,
      filename: 'to-delete.txt',
      storagePath: 'trash/file.txt',
      disk: 'local',
      mimeType: 'text/plain',
      size: 100,
      visibility: 'private',
    })

    await uploadRepo.delete(upload.id)

    const found = await uploadRepo.findById(upload.id)
    assert.isNull(found)
  })

  test('should update upload metadata', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'updater@example.com',
      password: 'password123',
      fullName: 'Updater',
    })

    const upload = await uploadRepo.create({
      userId: user.id,
      filename: 'image.png',
      storagePath: 'images/image.png',
      disk: 'local',
      mimeType: 'image/png',
      size: 500000,
      visibility: 'private',
      metadata: { width: 100, height: 100 },
    })

    const updated = await uploadRepo.update(upload.id, {
      metadata: { width: 800, height: 600, processed: true },
    })

    assert.deepEqual(updated.metadata, { width: 800, height: 600, processed: true })
  })

  test('should use model getters correctly', async ({ assert }) => {
    const uploadRepo = getService<UploadRepository>(TYPES.UploadRepository)
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'getters@example.com',
      password: 'password123',
      fullName: 'Getters Tester',
    })

    const upload = await uploadRepo.create({
      userId: user.id,
      filename: 'test.jpg',
      storagePath: 'test.jpg',
      disk: 'local',
      mimeType: 'image/jpeg',
      size: 2097152,
      visibility: 'public',
    })

    assert.isTrue(upload.isPublic)
    assert.isFalse(upload.isPrivate)
    assert.isTrue(upload.isImage)
    assert.isFalse(upload.isPdf)
    assert.equal(upload.sizeInKb, 2048)
    assert.equal(upload.sizeInMb, 2)
  })
})
