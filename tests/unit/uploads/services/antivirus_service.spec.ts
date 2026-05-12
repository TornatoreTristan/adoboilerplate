import { test } from '@japa/runner'
import { getService } from '#shared/container/container'
import { TYPES } from '#shared/container/types'
import AntivirusServiceClass from '#uploads/services/antivirus_service'
import type AntivirusService from '#uploads/services/antivirus_service'

/**
 * Inject a fake ClamAV scanner into a fresh AntivirusService instance so we
 * can exercise the "ClamAV is available" branches (infected, clean, error)
 * without requiring a real clamd socket in the test environment.
 */
function buildServiceWithFakeClam(scanResult: {
  isInfected: boolean
  viruses?: string[]
  throwError?: string
}): AntivirusService {
  const service = new AntivirusServiceClass()
  const fakeClamscan = {
    isInfected: async (file: string) => {
      if (scanResult.throwError) throw new Error(scanResult.throwError)
      return { isInfected: scanResult.isInfected, viruses: scanResult.viruses ?? [], file }
    },
    scanStream: async () => {
      if (scanResult.throwError) throw new Error(scanResult.throwError)
      return { isInfected: scanResult.isInfected, viruses: scanResult.viruses ?? [] }
    },
    getVersion: async () => 'ClamAV 1.0.0 (fake)',
  }
  // Bypass the env-based init to make the service look ready, with our fake.
  const internal = service as unknown as {
    initPromise: Promise<void>
    isAvailable: boolean
    clamscan: typeof fakeClamscan
  }
  internal.initPromise = Promise.resolve()
  internal.isAvailable = true
  internal.clamscan = fakeClamscan
  return service
}

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

test.group('AntivirusService - ClamAV available branch (fake scanner)', () => {
  test('scanFile reports infected files with their virus signatures', async ({ assert }) => {
    const service = buildServiceWithFakeClam({
      isInfected: true,
      viruses: ['Eicar-Test-Signature'],
    })

    const result = await service.scanFile('/tmp/infected.exe')

    assert.isTrue(result.isInfected)
    assert.deepEqual(result.viruses, ['Eicar-Test-Signature'])
    assert.equal(result.file, '/tmp/infected.exe')
  })

  test('scanBuffer reports infected buffers with their virus signatures', async ({ assert }) => {
    const service = buildServiceWithFakeClam({
      isInfected: true,
      viruses: ['Win.Trojan.Test'],
    })

    const result = await service.scanBuffer(Buffer.from('malicious bytes'), 'payload.bin')

    assert.isTrue(result.isInfected)
    assert.deepEqual(result.viruses, ['Win.Trojan.Test'])
    assert.equal(result.file, 'payload.bin')
  })

  test('scanFile returns clean when the fake reports no virus', async ({ assert }) => {
    const service = buildServiceWithFakeClam({ isInfected: false })

    const result = await service.scanFile('/tmp/safe.txt')

    assert.isFalse(result.isInfected)
    assert.deepEqual(result.viruses, [])
  })

  test('scanFile fails open (returns clean) when the scanner throws and fail-closed is off', async ({
    assert,
  }) => {
    const service = buildServiceWithFakeClam({
      isInfected: false,
      throwError: 'clamd connection lost',
    })

    const result = await service.scanFile('/tmp/whatever.txt')

    // failClosed is false by default (NODE_ENV=test), so an error becomes a
    // permissive "not infected" result rather than blocking the upload.
    assert.isFalse(result.isInfected)
  })

  test('getVersion returns the fake ClamAV version string', async ({ assert }) => {
    const service = buildServiceWithFakeClam({ isInfected: false })

    const version = await service.getVersion()

    assert.equal(version, 'ClamAV 1.0.0 (fake)')
  })
})
