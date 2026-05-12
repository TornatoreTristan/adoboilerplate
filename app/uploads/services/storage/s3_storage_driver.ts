import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { injectable } from 'inversify'
import env from '#start/env'
import type { StorageDriver, StorageOptions } from '#uploads/types/upload'
import { E } from '#shared/exceptions/exception_helpers'

@injectable()
export default class S3StorageDriver implements StorageDriver {
  private client: S3Client
  private bucket: string

  constructor() {
    this.bucket = env.get('AWS_BUCKET', '')
    this.client = new S3Client({
      region: env.get('AWS_REGION', 'eu-west-1'),
      credentials: {
        accessKeyId: env.get('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: env.get('AWS_SECRET_ACCESS_KEY', ''),
      },
      ...(env.get('AWS_ENDPOINT') && { endpoint: env.get('AWS_ENDPOINT') }),
    })
  }

  async store(file: Buffer, filePath: string, options: StorageOptions): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
      Body: file,
      ContentType: options.contentType,
      ACL: options.visibility === 'public' ? 'public-read' : 'private',
    })

    await this.client.send(command)
    return filePath
  }

  async get(filePath: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    })

    const response = await this.client.send(command)
    const chunks: Uint8Array[] = []

    if (!response.Body) {
      E.uploadFailed('No body in S3 response')
    }

    for await (const chunk of response.Body as any) {
      chunks.push(chunk)
    }

    return Buffer.concat(chunks)
  }

  async delete(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    })

    await this.client.send(command)
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      })

      await this.client.send(command)
      return true
    } catch {
      return false
    }
  }

  async getSignedUrl(filePath: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    })

    return getSignedUrl(this.client, command, { expiresIn })
  }

  getPublicUrl(filePath: string): string {
    const region = env.get('AWS_REGION', 'eu-west-1')
    const endpoint = env.get('AWS_ENDPOINT')

    if (endpoint) {
      return `${endpoint}/${this.bucket}/${filePath}`
    }

    return `https://${this.bucket}.s3.${region}.amazonaws.com/${filePath}`
  }
}
