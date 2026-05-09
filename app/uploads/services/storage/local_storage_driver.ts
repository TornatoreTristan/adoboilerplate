import fs from 'node:fs/promises'
import path from 'node:path'
import { injectable } from 'inversify'
import type { StorageDriver, StorageOptions } from '#uploads/types/upload'

@injectable()
export default class LocalStorageDriver implements StorageDriver {
  private storagePath = path.join(process.cwd(), 'storage', 'uploads')

  async store(file: Buffer, filePath: string, _options: StorageOptions): Promise<string> {
    const fullPath = path.join(this.storagePath, filePath)
    const directory = path.dirname(fullPath)

    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(fullPath, file)

    return filePath
  }

  async get(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.storagePath, filePath)
    return fs.readFile(fullPath)
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.storagePath, filePath)
    await fs.unlink(fullPath)
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.storagePath, filePath)
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  async getSignedUrl(filePath: string, expiresIn: number): Promise<string> {
    const token = Buffer.from(`${filePath}:${Date.now() + expiresIn * 1000}`).toString('base64')
    return `/uploads/signed/${token}`
  }

  getPublicUrl(filePath: string): string {
    return `/uploads/${filePath}`
  }
}
