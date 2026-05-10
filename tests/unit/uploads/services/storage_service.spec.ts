import { test } from '@japa/runner'
import type StorageService from '#uploads/services/storage_service'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'

test.group('StorageService - Local Storage', () => {
  test('should store file to local disk', async ({ assert }) => {
    const storageService = getService<StorageService>(TYPES.StorageService)

    const mockFile = Buffer.from('test file content')
    const result = await storageService.store(mockFile, 'test/file.txt', {
      disk: 'local',
      visibility: 'private',
      contentType: 'text/plain',
    })

    assert.properties(result, ['path', 'disk'])
    assert.equal(result.disk, 'local')
    assert.include(result.path, 'test/file.txt')
  })

  test('should get file content from local disk', async ({ assert }) => {
    const storageService = getService<StorageService>(TYPES.StorageService)

    const mockFile = Buffer.from('test content')
    const stored = await storageService.store(mockFile, 'test/read.txt', {
      disk: 'local',
      visibility: 'private',
      contentType: 'text/plain',
    })

    const content = await storageService.get(stored.path, 'local')
    assert.instanceOf(content, Buffer)
    assert.equal(content.toString(), 'test content')
  })

  test('should delete file from local disk', async ({ assert }) => {
    const storageService = getService<StorageService>(TYPES.StorageService)

    const mockFile = Buffer.from('to be deleted')
    const stored = await storageService.store(mockFile, 'test/delete.txt', {
      disk: 'local',
      visibility: 'private',
      contentType: 'text/plain',
    })

    await storageService.delete(stored.path, 'local')
    const exists = await storageService.exists(stored.path, 'local')
    assert.isFalse(exists)
  })

  test('should check if file exists on local disk', async ({ assert }) => {
    const storageService = getService<StorageService>(TYPES.StorageService)

    const mockFile = Buffer.from('exists test')
    const stored = await storageService.store(mockFile, 'test/exists.txt', {
      disk: 'local',
      visibility: 'private',
      contentType: 'text/plain',
    })

    const exists = await storageService.exists(stored.path, 'local')
    assert.isTrue(exists)

    const notExists = await storageService.exists('non/existent/file.txt', 'local')
    assert.isFalse(notExists)
  })

  test('should generate signed URL for local file', async ({ assert }) => {
    const storageService = getService<StorageService>(TYPES.StorageService)

    const mockFile = Buffer.from('private file')
    const stored = await storageService.store(mockFile, 'test/private.txt', {
      disk: 'local',
      visibility: 'private',
      contentType: 'text/plain',
    })

    const signedUrl = await storageService.getSignedUrl(stored.path, 'local', 3600)
    assert.isString(signedUrl)
    assert.include(signedUrl, '/uploads/signed/')
  })

  test('should generate public URL for local public file', async ({ assert }) => {
    const storageService = getService<StorageService>(TYPES.StorageService)

    const mockFile = Buffer.from('public file')
    const stored = await storageService.store(mockFile, 'test/public.txt', {
      disk: 'local',
      visibility: 'public',
      contentType: 'text/plain',
    })

    const publicUrl = storageService.getPublicUrl(stored.path, 'local')
    assert.isString(publicUrl)
    assert.include(publicUrl, stored.path)
  })
})
