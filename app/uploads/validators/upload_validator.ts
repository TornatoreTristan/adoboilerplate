import vine from '@vinejs/vine'
import env from '#start/env'

const maxSize = env.get('UPLOADS_MAX_SIZE', 10_485_760)

// Filenames must look like a real basename: no path separators, no NUL bytes,
// and capped at 255 chars to match most filesystems. The on-disk name is
// re-sanitized by the upload service, but we still reject hostile inputs here.
const FILENAME_REGEX = /^[^/\\\0]{1,255}$/

export const uploadFileValidator = vine.compile(
  vine.object({
    file: vine.any(),
    filename: vine.string().trim().minLength(1).maxLength(255).regex(FILENAME_REGEX),
    mimeType: vine
      .string()
      .trim()
      .maxLength(255)
      .regex(/^[a-z0-9!#$&^_+.-]+\/[a-z0-9!#$&^_+.-]+$/i),
    size: vine.number().positive().max(maxSize),
    disk: vine.enum(['local', 's3']).optional(),
    visibility: vine.enum(['public', 'private']).optional(),
    uploadableType: vine.string().maxLength(100).optional(),
    uploadableId: vine.string().uuid().optional(),
    metadata: vine.record(vine.any()).optional(),
  })
)

export const getUploadsValidator = vine.compile(
  vine.object({
    disk: vine.enum(['local', 's3']).optional(),
    visibility: vine.enum(['public', 'private']).optional(),
    uploadableType: vine.string().maxLength(100).optional(),
    uploadableId: vine.string().uuid().optional(),
  })
)
