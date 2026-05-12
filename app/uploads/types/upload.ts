export type DiskType = 'local' | 's3'

export type VisibilityType = 'public' | 'private'

export interface UploadMetadata {
  width?: number
  height?: number
  duration?: number
  [key: string]: unknown
}

export interface CreateUploadData {
  userId: string
  filename: string
  storagePath: string
  disk: DiskType
  mimeType: string
  size: number
  visibility: VisibilityType
  uploadableType?: string | null
  uploadableId?: string | null
  metadata?: UploadMetadata | null
}

export interface UpdateUploadData {
  uploadableType?: string | null
  uploadableId?: string | null
  metadata?: UploadMetadata | null
}

export interface UploadOptions {
  userId: string
  disk?: DiskType
  visibility?: VisibilityType
  uploadableType?: string
  uploadableId?: string
  metadata?: UploadMetadata
}

export interface StorageOptions {
  visibility: VisibilityType
  contentType: string
}

export interface UploadFilters {
  userId?: string
  disk?: DiskType
  visibility?: VisibilityType
  uploadableType?: string
  uploadableId?: string
}

export interface StoreFileOptions {
  disk: DiskType
  visibility: VisibilityType
  contentType: string
}

export interface StoreFileResult {
  path: string
  disk: DiskType
}

export interface StorageDriver {
  store(file: Buffer, path: string, options: StorageOptions): Promise<string>
  get(path: string): Promise<Buffer>
  delete(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  getSignedUrl(path: string, expiresIn: number): Promise<string>
  getPublicUrl(path: string): string
}
