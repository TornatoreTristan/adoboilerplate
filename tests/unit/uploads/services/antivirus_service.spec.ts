import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import type AntivirusService from '#uploads/services/antivirus_service'

test.group('AntivirusService', () => {
  test('should initialize without ClamAV installed', async ({ assert }) => {
    const antivirusService = getService<AntivirusService>(TYPES.AntivirusService)

    const isReady = await antivirusService.isReady()

    assert.isFalse(isReady)
  })

  test('should scan buffer and return not infected when ClamAV unavailable', async ({ assert }) => {
    const antivirusService = getService<AntivirusService>(TYPES.AntivirusService)

    const testBuffer = Buffer.from('test file content')
    const result = await antivirusService.scanBuffer(testBuffer, 'test.txt')

    assert.isFalse(result.isInfected)
    assert.deepEqual(result.viruses, [])
    assert.equal(result.file, 'test.txt')
  })

  test('should scan file and return not infected when ClamAV unavailable', async ({ assert }) => {
    const antivirusService = getService<AntivirusService>(TYPES.AntivirusService)

    const result = await antivirusService.scanFile('/tmp/test.txt')

    assert.isFalse(result.isInfected)
    assert.deepEqual(result.viruses, [])
    assert.equal(result.file, '/tmp/test.txt')
  })

  test('should return null version when ClamAV unavailable', async ({ assert }) => {
    const antivirusService = getService<AntivirusService>(TYPES.AntivirusService)

    const version = await antivirusService.getVersion()

    assert.isNull(version)
  })

  test('should handle scan errors gracefully', async ({ assert }) => {
    const antivirusService = getService<AntivirusService>(TYPES.AntivirusService)

    const invalidBuffer = Buffer.alloc(0)
    const result = await antivirusService.scanBuffer(invalidBuffer, 'empty.txt')

    assert.isFalse(result.isInfected)
    assert.deepEqual(result.viruses, [])
  })

  test('should scan different file types', async ({ assert }) => {
    const antivirusService = getService<AntivirusService>(TYPES.AntivirusService)

    const pdfBuffer = Buffer.from('%PDF-1.4 test content')
    const imageBuffer = Buffer.from('image binary data')
    const textBuffer = Buffer.from('plain text content')

    const pdfResult = await antivirusService.scanBuffer(pdfBuffer, 'document.pdf')
    const imageResult = await antivirusService.scanBuffer(imageBuffer, 'image.jpg')
    const textResult = await antivirusService.scanBuffer(textBuffer, 'file.txt')

    assert.isFalse(pdfResult.isInfected)
    assert.isFalse(imageResult.isInfected)
    assert.isFalse(textResult.isInfected)
  })
})
