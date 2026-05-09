import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import UserRepository from '#users/repositories/user_repository'
import UploadService from '#uploads/services/upload_service'
import fs from 'node:fs/promises'
import path from 'node:path'

test.group('UploadsController', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  group.each.teardown(async () => {
    const uploadsPath = path.join(process.cwd(), 'storage', 'uploads')
    try {
      await fs.rm(uploadsPath, { recursive: true, force: true })
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  })

  test('should upload a file via POST /api/uploads', async ({ client }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'uploader@example.com',
      password: 'password123',
      fullName: 'Test Uploader',
    })

    const response = await client
      .post('/api/uploads')
      .withSession({ user_id: user.id })
      .form({
        file: 'test file content',
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 17,
        disk: 'local',
        visibility: 'private',
      })

    response.assertStatus(201)
    response.assertBodyContains({
      upload: {
        userId: user.id,
        filename: 'document.pdf',
        disk: 'local',
        visibility: 'private',
      },
    })
  })

  test('should get user uploads via GET /api/uploads', async ({ client, assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const uploadService = getService<UploadService>(TYPES.UploadService)

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
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('file2'),
      filename: 'file2.txt',
      mimeType: 'text/plain',
      size: 5,
      disk: 'local',
      visibility: 'public',
    })

    const response = await client.get('/api/uploads').withSession({ user_id: user.id })

    response.assertStatus(200)
    assert.lengthOf(response.body().uploads, 2)
    assert.isTrue(response.body().uploads.every((u: any) => u.userId === user.id))
  })

  test('should filter uploads by visibility via GET /api/uploads?visibility=public', async ({
    client,
    assert,
  }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const uploadService = getService<UploadService>(TYPES.UploadService)

    const user = await userRepo.create({
      email: 'filter@example.com',
      password: 'password123',
      fullName: 'Filter User',
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('private'),
      filename: 'private.txt',
      mimeType: 'text/plain',
      size: 7,
      disk: 'local',
      visibility: 'private',
    })

    await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('public'),
      filename: 'public.txt',
      mimeType: 'text/plain',
      size: 6,
      disk: 'local',
      visibility: 'public',
    })

    const response = await client.get('/api/uploads?visibility=public').withSession({ user_id: user.id })

    response.assertStatus(200)
    assert.lengthOf(response.body().uploads, 1)
    assert.equal(response.body().uploads[0].visibility, 'public')
  })

  test('should get upload by id via GET /api/uploads/:id', async ({ client }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const uploadService = getService<UploadService>(TYPES.UploadService)

    const user = await userRepo.create({
      email: 'detail@example.com',
      password: 'password123',
      fullName: 'Detail User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('content'),
      filename: 'detail.txt',
      mimeType: 'text/plain',
      size: 7,
      disk: 'local',
      visibility: 'private',
    })

    const response = await client.get(`/api/uploads/${upload.id}`).withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({
      upload: {
        id: upload.id,
        filename: 'detail.txt',
      },
    })
  })

  test('should return 404 when upload not found via GET /api/uploads/:id', async ({ client }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)

    const user = await userRepo.create({
      email: 'notfound@example.com',
      password: 'password123',
      fullName: 'Not Found User',
    })

    const response = await client
      .get('/api/uploads/00000000-0000-0000-0000-000000000000')
      .withSession({ user_id: user.id })

    response.assertStatus(404)
  })

  test('should generate signed URL via GET /api/uploads/:id/signed-url', async ({ client, assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const uploadService = getService<UploadService>(TYPES.UploadService)

    const user = await userRepo.create({
      email: 'signed@example.com',
      password: 'password123',
      fullName: 'Signed User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('private'),
      filename: 'private.pdf',
      mimeType: 'application/pdf',
      size: 7,
      disk: 'local',
      visibility: 'private',
    })

    const response = await client.get(`/api/uploads/${upload.id}/signed-url`).withSession({ user_id: user.id })

    response.assertStatus(200)
    assert.property(response.body(), 'signedUrl')
    assert.isString(response.body().signedUrl)
  })

  test('should delete upload via DELETE /api/uploads/:id', async ({ client, assert }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const uploadService = getService<UploadService>(TYPES.UploadService)

    const user = await userRepo.create({
      email: 'deleter@example.com',
      password: 'password123',
      fullName: 'Deleter User',
    })

    const upload = await uploadService.uploadFile({
      userId: user.id,
      file: Buffer.from('delete me'),
      filename: 'delete.txt',
      mimeType: 'text/plain',
      size: 9,
      disk: 'local',
      visibility: 'private',
    })

    const response = await client.delete(`/api/uploads/${upload.id}`).withSession({ user_id: user.id })

    response.assertStatus(200)
    response.assertBodyContains({ success: true })

    const deleted = await uploadService.getUploadById(upload.id)
    assert.isNull(deleted)
  })

  test('should return 403 when trying to access another user upload', async ({ client }) => {
    const userRepo = getService<UserRepository>(TYPES.UserRepository)
    const uploadService = getService<UploadService>(TYPES.UploadService)

    const owner = await userRepo.create({
      email: 'owner@example.com',
      password: 'password123',
      fullName: 'Owner',
    })

    const other = await userRepo.create({
      email: 'other@example.com',
      password: 'password123',
      fullName: 'Other',
    })

    const upload = await uploadService.uploadFile({
      userId: owner.id,
      file: Buffer.from('owners file'),
      filename: 'private.txt',
      mimeType: 'text/plain',
      size: 11,
      disk: 'local',
      visibility: 'private',
    })

    const response = await client.get(`/api/uploads/${upload.id}`).withSession({ user_id: other.id })

    response.assertStatus(403)
  })

  test('should require authentication', async ({ client }) => {
    const response = await client.get('/api/uploads')

    response.assertStatus(401)
  })
})
