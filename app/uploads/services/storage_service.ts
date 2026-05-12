import { injectable, inject } from 'inversify'
import { TYPES } from '#shared/container/types'
import LocalStorageDriver from '#uploads/services/storage/local_storage_driver'
import S3StorageDriver from '#uploads/services/storage/s3_storage_driver'
import type {
  DiskType,
  StoreFileOptions,
  StoreFileResult,
  StorageDriver,
} from '#uploads/types/upload'
import { E } from '#shared/exceptions/exception_helpers'

@injectable()
export default class StorageService {
  private drivers: Map<DiskType, StorageDriver>

  constructor(
    @inject(TYPES.LocalStorageDriver) localDriver: LocalStorageDriver,
    @inject(TYPES.S3StorageDriver) s3Driver: S3StorageDriver
  ) {
    this.drivers = new Map<DiskType, StorageDriver>([
      ['local', localDriver],
      ['s3', s3Driver],
    ])
  }

  private getDriver(disk: DiskType): StorageDriver {
    const driver = this.drivers.get(disk)
    if (!driver) {
      E.internal(`Storage driver ${disk} not found`)
    }
    return driver
  }

  async store(file: Buffer, filePath: string, options: StoreFileOptions): Promise<StoreFileResult> {
    const driver = this.getDriver(options.disk)
    const path = await driver.store(file, filePath, {
      visibility: options.visibility,
      contentType: options.contentType,
    })

    return { path, disk: options.disk }
  }

  async get(filePath: string, disk: DiskType): Promise<Buffer> {
    const driver = this.getDriver(disk)
    return driver.get(filePath)
  }

  async delete(filePath: string, disk: DiskType): Promise<void> {
    const driver = this.getDriver(disk)
    await driver.delete(filePath)
  }

  async exists(filePath: string, disk: DiskType): Promise<boolean> {
    const driver = this.getDriver(disk)
    return driver.exists(filePath)
  }

  async getSignedUrl(filePath: string, disk: DiskType, expiresIn: number): Promise<string> {
    const driver = this.getDriver(disk)
    return driver.getSignedUrl(filePath, expiresIn)
  }

  getPublicUrl(filePath: string, disk: DiskType): string {
    const driver = this.getDriver(disk)
    return driver.getPublicUrl(filePath)
  }
}
