import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { injectable } from 'inversify'
import type { StorageDriver, StorageOptions } from '#uploads/types/upload'
import env from '#start/env'

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
    const expiry = Date.now() + expiresIn * 1000
    const hmac = this.computeHmac(filePath, expiry)
    const token = `${expiry}:${hmac}`
    const encodedToken = encodeURIComponent(token)
    const encodedPath = encodeURIComponent(filePath)
    return `/uploads/signed/${encodedToken}?path=${encodedPath}`
  }

  verifySignedUrl(filePath: string, token: string): boolean {
    const decoded = decodeURIComponent(token)
    const separatorIndex = decoded.indexOf(':')

    if (separatorIndex === -1) {
      return false
    }

    const expiry = Number(decoded.slice(0, separatorIndex))
    const providedHmac = decoded.slice(separatorIndex + 1)

    if (!expiry || Number.isNaN(expiry) || Date.now() > expiry) {
      return false
    }

    const expectedHmac = this.computeHmac(filePath, expiry)
    const expectedBuffer = Buffer.from(expectedHmac, 'hex')
    const providedBuffer = Buffer.from(providedHmac, 'hex')

    if (expectedBuffer.length !== providedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  }

  getPublicUrl(filePath: string): string {
    return `/uploads/${filePath}`
  }

  private computeHmac(filePath: string, expiry: number): string {
    const appKey = env.get('APP_KEY')
    return crypto.createHmac('sha256', appKey).update(`${filePath}:${expiry}`).digest('hex')
  }
}
